import events from 'events';
import omit from 'lodash.omit';
import Job from './job.js';
import Worker from './worker.js';
import constants from './constants';
import createClient from './helpers/create_client';
import indexTimestamp from './helpers/index_timestamp';
import logger from './helpers/logger';

const debug = logger('esqueue:queue');

export default class Esqueue extends events.EventEmitter {
  constructor(index, options = {}) {
    if (!index) throw new Error('Must specify an index to write to');

    super();
    this.index = index;
    this.settings = Object.assign({
      interval: constants.DEFAULT_SETTING_INTERVAL,
      timeout: constants.DEFAULT_SETTING_TIMEOUT,
      doctype: constants.DEFAULT_SETTING_DOCTYPE,
      dateSeparator: constants.DEFAULT_SETTING_DATE_SEPARATOR,
    }, omit(options, [ 'client' ]));
    this.client = createClient(options.client || {});

    this._workers = [];
    this._initTasks().catch((err) => this.emit(constants.EVENT_QUEUE_ERROR, err));
  }

  _initTasks() {
    const initTasks = [
      this.client.ping({ timeout: 3000 }),
    ];

    return Promise.all(initTasks).catch((err) => {
      debug('Initialization failed', err);
      throw err;
    });
  }

  addJob(type, payload, opts = {}) {
    const timestamp = indexTimestamp(this.settings.interval, this.settings.dateSeparator);
    const index = `${this.index}-${timestamp}`;
    const defaults = {
      timeout: this.settings.timeout,
    };

    const options = Object.assign(defaults, opts, {
      doctype: this.settings.doctype,
      indexSettings: this.settings.indexSettings,
    });

    return new Job(this, index, type, payload, options);
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
