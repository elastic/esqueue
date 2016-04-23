import events from 'events';
import createClient from './helpers/es_client';
import indexTimestamp from './helpers/index_timestamp';
import Job from './job.js';
import Worker from './worker.js';
import { omit } from 'lodash';

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

    this._initTasks().catch((err) => this.emit('error', err));
  }

  _initTasks() {

    var initTasks = [
      this.client.ping({ timeout: 3000 }),
    ];

    return Promise.all(initTasks);
  }

  add(type, payload, opts = {}) {
    const timestamp = indexTimestamp(this.settings.interval);
    const index = `${this.index}-${timestamp}`;

    const options = Object.assign({
      timeout: this.settings.timeout
    }, opts);

    const job = new Job(this.client, index, type, payload, options);
    return job;
  }

  registerWorker(type, workerFn) {
    const worker = new Worker(this, type, workerFn);
    return worker;
  }
}
