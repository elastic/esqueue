import events from 'events';
import { isPlainObject } from 'lodash';

export default class Job extends events.EventEmitter {
  constructor(queue, type, payload, options = {}) {
    if (typeof type !== 'string') throw new Error('Type must be a string');
    if (!isPlainObject(payload)) throw new Error('Payload must be a plain object');

    super();

    this.queue = queue;
    this.type = type;
    this.payload = payload;
    this.timeout = options.timeout || 10000;

    this.ready = this.queue.client.index({
      index: this.queue.index,
      type: this.type,
      body: Object.assign({}, options, {
        payload: payload
      })
    })
    .then((doc) => {
      this.document = {
        id: doc._id,
        type: doc._type,
        version: doc._version,
      };
    });
  }
}