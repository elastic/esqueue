import events from 'events';
import { isPlainObject, omit } from 'lodash';
import { JOB_STATUS_PENDING } from './helpers/constants';

export default class Job extends events.EventEmitter {
  constructor(client, index, type, payload, timeout = 10000) {
    if (typeof type !== 'string') throw new Error('Type must be a string');
    if (!isPlainObject(payload)) throw new Error('Payload must be a plain object');

    super();

    this.client = client;
    this.index = index;
    this.type = type;
    this.payload = payload;
    this.timeout = timeout;
    this.status = JOB_STATUS_PENDING;

    this.ready = this.client.index({
      index: this.index,
      type: this.type,
      body: {
        payload: this.payload,
        timeout: this.timeout,
        created: new Date(),
        started: null,
        completed: null,
        attempts: 0,
        status: this.status,
      }
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