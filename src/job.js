import events from 'events';
import { isPlainObject } from 'lodash';

export default class Job extends events.EventEmitter {
  constructor(queue, type, payload, options = {}) {
    if (typeof type !== 'string') throw new Error('Type must be a string');
    if (!isPlainObject(payload)) throw new Error('Payload must be a plain object');

    super();

    queue.client.index({
      index: queue.index,
      type: type,
      body: Object.assign({}, options, {
        payload: payload
      })
    });
  }
}