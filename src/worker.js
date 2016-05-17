import events from 'events';
import Puid from 'puid';
import moment from 'moment';
import logger from './helpers/logger';
import constants from './helpers/constants';
import { WorkerTimeoutError } from './helpers/errors';

const puid = new Puid();
const debug = logger('esqueue:worker');

export default class Job extends events.EventEmitter {
  constructor(queue, type, workerFn, opts = {}) {
    if (typeof type !== 'string') throw new Error('Type must be a string');
    if (typeof workerFn !== 'function') throw new Error('Worker must be a function');

    super();

    this.id = puid.generate();
    this.queue = queue;
    this.client = this.queue.client;
    this.jobtype = type;
    this.workerFn = workerFn;
    this.checkInterval = opts.interval || 1500;
    this.checkSize = opts.size || 10;
    this.doctype = opts.doctype || constants.DEFAULT_SETTING_DOCTYPE;

    this.debug = (...msg) => debug(...msg, `id: ${this.id}`);

    this._checker = false;
    this.debug(`Created worker for type ${this.type}`);
    this._startJobPolling();
  }

  destroy() {
    clearInterval(this._checker);
  }

  _claimJob(job) {
    const m = moment();
    const startTime = m.toISOString();
    const expirationTime = m.add(job._source.timeout).toISOString();
    const attempts = job._source.attempts + 1;

    if (attempts > job._source.max_attempts) {
      const msg = (!job._source.output) ? `Max attempts reached (${job._source.max_attempts})` : false;
      return this._failJob(job, msg)
      .then(() => false);
    }

    const doc = {
      attempts: attempts,
      started_at: startTime,
      process_expiration: expirationTime,
      status: constants.JOB_STATUS_PROCESSING,
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

  _failJob(job, output = false) {
    this.debug(`Failing job ${job._id}`);

    const completedTime = moment().toISOString();
    const doc = {
      status: constants.JOB_STATUS_FAILED,
      completed_at: completedTime,
    };

    if (output) {
      doc.output = this._formatOutput(output);
    }

    return this.client.update({
      index: job._index,
      type: job._type,
      id: job._id,
      version: job._version,
      body: { doc }
    })
    .catch((err) => {
      if (err.statusCode === 409) return true;
      throw err;
    });
  }

  _formatOutput(output) {
    const unknownMime = false;
    const defaultOutput = null;
    const docOutput = {};

    if (typeof output === 'object' && output.content) {
      docOutput.content = output.content;
      docOutput.content_type = output.content_type || unknownMime;
    } else {
      docOutput.content = output || defaultOutput;
      docOutput.content_type = unknownMime;
    }

    return docOutput;
  }

  _performJob(job) {
    this.debug(`Starting job ${job._id}`);

    const workerOutput = new Promise((resolve, reject) => {
      resolve(this.workerFn.call(null, job._source.payload));

      setTimeout(() => {
        this.debug(`Timeout processing job ${job._id}`);
        reject(new WorkerTimeoutError({
          timeout: job._source.timeout,
          jobId: job._id,
        }));
      }, job._source.timeout);
    });

    return workerOutput.then((output) => {
      // job execution was successful
      this.debug(`Completed job ${job._id}`);

      const completedTime = moment().toISOString();
      const docOutput = this._formatOutput(output);

      const doc = {
        status: constants.JOB_STATUS_COMPLETED,
        completed_at: completedTime,
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
        this.debug(`Failure saving job output ${job._id}`, err);
        this.emit('job_error', err);
      });
    }, (jobErr) => {
      // job execution failed
      if (jobErr.type === 'WorkerTimeout') {
        this.debug(`Timeout on job ${job._id}`);
        this.emit('job_timeout', jobErr);
        return;
      }

      this.debug(`Failure occurred on job ${job._id}`, jobErr);
      this.emit('job_error', jobErr);
      return this._failJob(job, jobErr.toString());
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
    if (!jobs || jobs.length === 0) return;

    this._stopJobPolling();
    let claimed = false;

    return jobs.reduce((chain, job) => {
      return chain.then((claimedJob) => {
        // short-circuit the promise chain if a job has been claimed
        if (claimed) return claimedJob;

        return this._claimJob(job)
        .then((claimResult) => {
          if (claimResult !== false) {
            claimed = true;
            return claimResult;
          }
        });
      });
    }, Promise.resolve())
    .catch((err) => {
      this.debug('Failed to claim outstanding jobs', err);
      this.emit('error', err);
      this.queue.emit('worker_error', {
        id: this.id,
        type: this.type,
        err
      });
      throw err;
    })
    .then((claimedJob) => {
      if (!claimedJob) {
        this.debug(`All ${jobs.length} jobs already claimed`);
        return;
      }
      this.debug(`Claimed job ${claimedJob._id}`);
      return this._performJob(claimedJob);
    })
    .then(() => this._startJobPolling())
    .catch((err) => {
      this.debug('Error claiming jobs', err);
      this.emit('error', err);
      this._startJobPolling();
    });
  }

  _getPendingJobs() {
    const nowTime = moment().toISOString();
    const query = {
      _source : {
        exclude: [ 'output.content' ]
      },
      query: {
        constant_score: {
          filter: {
            bool: {
              filter: { term: { jobtype: this.jobtype } },
              should: [
                { term: { status: 'pending'} },
                { bool:
                  { filter: [
                    { term: { status: 'processing' } },
                    { range: { process_expiration: { lte: nowTime } } }
                  ] }
                }
              ]
            }
          }
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
      type: this.doctype,
      version: true,
      body: query
    })
    .then((results) => {
      const jobs = results.hits.hits;
      this.debug(`${jobs.length} outstanding jobs returned`);
      return jobs;
    })
    .catch((err) => {
      // ignore missing indices errors
      if (err.status === 404) return [];

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