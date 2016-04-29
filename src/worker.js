import events from 'events';
import Puid from 'puid';
import moment from 'moment';
import Bluebird from 'bluebird';
import logger from './helpers/logger';
import { jobStatuses } from './helpers/constants';

const puid = new Puid();
const debug = logger('worker');

export default class Job extends events.EventEmitter {
  constructor(queue, type, workerFn, opts = {}) {
    if (typeof type !== 'string') throw new Error('Type must be a string');
    if (typeof workerFn !== 'function') throw new Error('Worker must be a function');

    super();

    this.id = puid.generate();
    this.queue = queue;
    this.client = this.queue.client;
    this.type = type;
    this.workerFn = workerFn;
    this.checkInterval = opts.interval || 1500;
    this.checkSize = opts.size || 10;

    this.debug = (...msg) => debug(...msg, `id: ${this.id}`);

    this._checker = false;
    this._startJobPolling();
  }

  destroy() {
    clearInterval(this._checker);
  }

  _claimJob(job) {
    this.debug(`Attempting to claim job ${job._id}`);
    const m = moment();
    const startTime = m.toISOString();
    const expirationTime = m.add(job._source.timeout).toISOString();
    const attempts = job._source.attempts + 1;

    if (attempts > job._source.max_attempts) {
      return this._failJob(job, `Max attempts reached (${job._source.max_attempts})`)
      .then(() => false);
    }

    const doc = {
      attempts: attempts,
      started_at: startTime,
      process_expiration: expirationTime,
      status: jobStatuses.JOB_STATUS_PROCESSING,
    };

    return this.client.update({
      index: job._index,
      type: job._type,
      id: job._id,
      version: job._version,
      body: { doc }
    })
    .then((response) => {
      const updatedJob = Object.assign({}, job, response);
      updatedJob._source = Object.assign({}, job._source, doc);
      return updatedJob;
    })
    .catch((err) => {
      if (err.statusCode === 409) return false;
      throw err;
    });
  }

  _failJob(job, msg) {
    this.debug(`Failing job ${job._id}`);
    const doc = {
      status: jobStatuses.JOB_STATUS_FAILED
    };

    if (!job._source.output) {
      doc.output = {
        content_type: 'text/plain',
        content: msg
      };
    }

    return this.client.update({
      index: job._index,
      type: job._type,
      id: job._id,
      version: job._version,
      body: { doc }
    })
    .catch((err) => {
      if (err.statusCode === 409) return false;
      throw err;
    });
  }

  _performJob(job) {
    this.debug(`Starting job ${job._id}`);

    return Bluebird.try(() => {
      return this.workerFn(job._source.payload);
    })
    .then((output) => {
      const unknownMime = false;
      const docOutput = {};
      if (typeof output === 'object' && output.content) {
        docOutput.content = output.content;
        docOutput.content_type = output.content_type || unknownMime;
      } else {
        docOutput.content = output || '';
        docOutput.content_type = unknownMime;
      }

      const doc = {
        status: jobStatuses.JOB_STATUS_COMPLETED,
        output: docOutput
      };

      return this.client.update({
        index: job._index,
        type: job._type,
        id: job._id,
        version: job._version,
        body: { doc }
      })
      .catch((err) => {
        if (err.statusCode === 409) return false;
        throw err;
      });
    }, (err) => {
      console.error('err', err);
      const doc = {
        output: {
          content_type: false,
          content: err.toString()
        }
      };

      return this.client.update({
        index: job._index,
        type: job._type,
        id: job._id,
        version: job._version,
        body: { doc }
      })
      .catch(() => false)
      .then(() => { throw err; });
    });
  }

  _startJobPolling() {
    this._checker = setInterval(() => {
      this._getPendingJobs()
      .then((jobs) => this._claimPendingJobs(jobs));
    } , this.checkInterval);
  }

  _stopJobPolling() {
    clearInterval(this._checker);
  }

  _claimPendingJobs(jobs) {
    this._stopJobPolling();
    let claimed = false;

    return Bluebird.mapSeries(jobs, (job) => {
      if (claimed) return false;

      return this._claimJob(job)
      .then((claimedJob) => {
        if (claimedJob !== false) {
          claimed = true;
          return claimedJob;
        }
      })
      .catch((err) => {
        this.debug('Failed to claim outstanding jobs', err);
        this.emit('error', err);
        this.queue.emit('worker_error', {
          id: this.id,
          type: this.type,
          err
        });
        throw err;
      });
    })
    .then((mappedJobs) => mappedJobs.filter(Boolean))
    .then((claimedJobs) => {
      if (claimedJobs.length !== 1) return;
      const job = claimedJobs[0];
      return this._performJob(job);
    })
    .finally(() => this._startJobPolling());
  }

  _getPendingJobs() {
    const nowTime = moment().toISOString();
    const dateFilter = {
      range: {
        process_expiration: {
          lte: nowTime
        }
      }
    };
    const query = {
      query: {
        bool: {
          should: [
            { bool: { must: [{ term: { status: 'pending'} }] }},
            { bool: { must: [{ term: { status: 'processing'}} ], filter: dateFilter } }
          ]
        }
      },
      sort: [
        { priority: { order: 'asc' }},
        { created_at: { order: 'asc' }}
      ],
      size: this.checkSize
    };

    this.debug('querying for outstanding jobs');

    return this.client.search({
      index: `${this.queue.index}-*`,
      type: this.type,
      version: true,
      body: query
    })
    .then((results) => {
      const jobs = results.hits.hits;
      this.debug(`${jobs.length} outstanding jobs returned`);
      return jobs;
    })
    .catch((err) => {
      this.debug('job querying failed', err);
      this.emit('error', err);
      this.queue.emit('worker_error', {
        id: this.id,
        type: this.type,
        err
      });
      throw err;
    });
  }
}