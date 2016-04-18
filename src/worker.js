import events from 'events';
import Puid from 'puid';

export default class Job extends events.EventEmitter {
  constructor(queue, type, workerFn) {
    if (typeof type !== 'string') throw new Error('Type must be a string');
    if (typeof workerFn !== 'function') throw new Error('Worker must be a function');

    super();
    const puid = new Puid();
    this.id = puid.generate();

    // TODO: check for existing jobs to process
  }
}