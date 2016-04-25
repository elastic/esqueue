import events from 'events';
import Puid from 'puid';
import { jobStatuses } from './helpers/constants';

const puid = new Puid();

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

    this._processJobs();
    this._checker = setInterval(this._processJobs, this.checkInterval);
  }

  destroy() {
    clearInterval(this._checker);
  }

  _processJobs() {
    const query = {};

    return this.client.search({
      body: {
        query: query
      }
    });
  }
}