import events from 'events';
import createClient from './helpers/es_client';
import indexTimestamp from './helpers/index_timestamp';
import logger from './helpers/logger';
import Job from './job.js';
import Worker from './worker.js';
import { omit } from 'lodash';

const debug = logger('queue');

export default class Elastique extends events.EventEmitter {
  constructor(index, options = {}) {
    if (!index) throw new Error('Must specify an index to write to');

    super();
    this.index = index;
    this.settings = Object.assign({
      interval: 'week',
      timeout: 10000,
    }, omit(options, [ 'client' ]));
    this.client = createClient(options.client || {});

    this._workers = [];
    this._initTasks().catch((err) => this.emit('error', err));
  }

  _initTasks() {
    var initTasks = [
      this.client.ping({ timeout: 3000 }),
    ];

    return Promise.all(initTasks).catch((err) => {
      debug('Initialization failed', err);
      throw err;
    });
  }

  addJob(type, payload, opts = {}) {
    const timestamp = indexTimestamp(this.settings.interval);
    const index = `${this.index}-${timestamp}`;

    const options = Object.assign({
      timeout: this.settings.timeout
    }, opts);

    return new Job(this.client, index, type, payload, options);
  }

  registerWorker(type, workerFn, opts) {
    const worker = new Worker(this, type, workerFn, opts);
    this._workers.push(worker);
    return worker;
  }

  getWorkers() {
    return this._workers.map((fn) => fn);
  }

  destroy() {
    const workers = this._workers.filter((worker) => worker.destroy());
    this._workers = workers;
  }
}
