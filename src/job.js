import events from 'events';
import { isPlainObject } from 'lodash';
import Puid from 'puid';
import logger from './helpers/logger';
import { jobStatuses } from './helpers/constants';
import createIndex from './helpers/create_index';

const debug = logger('job');
const puid = new Puid();

export default class Job extends events.EventEmitter {
  constructor(client, index, type, payload, options = {}) {
    if (typeof type !== 'string') throw new Error('Type must be a string');
    if (!isPlainObject(payload)) throw new Error('Payload must be a plain object');

    super();

    this.client = client;
    this.id = puid.generate();
    this.index = index;
    this.type = type;
    this.payload = payload;
    this.timeout = options.timeout || 10000;
    this.maxAttempts = options.max_attempts || 3;
    this.priority = Math.max(Math.min(options.priority || 10, 20), -20);

    this.debug = (...msg) => debug(...msg, `id: ${this.id}`);

    this.ready = createIndex(client, index)
    .then(() => {
      return this.client.index({
        index: this.index,
        type: this.type,
        id: this.id,
        body: {
          payload: this.payload,
          priority: this.priority,
          timeout: this.timeout,
          created_at: new Date(),
          attempts: 0,
          max_attempts: this.maxAttempts,
          status: jobStatuses.JOB_STATUS_PENDING,
        }
      })
      .then((doc) => {
        this.document = {
          id: doc._id,
          type: doc._type,
          version: doc._version,
        };
        this.debug(`Job created in index ${this.index}`);
        this.emit('created', this.document);
      });
    })
    .catch((err) => {
      this.debug('Job creation failed', err);
      this.emit('error', err);
      throw err;
    });
  }

  get() {
    return this.ready
    .then(() => {
      return this.client.get({
        index: this.index,
        type: this.type,
        id: this.id
      });
    })
    .then((doc) => {
      return Object.assign(doc._source, {
        index: doc._index,
        id: doc._id,
        type: doc._type,
        version: doc._version,
      });
    });
  }

  toJSON() {
    return Object.assign({
      id: this.id,
      index: this.index,
      type: this.type,
      payload: this.payload,
      timeout: this.timeout,
      max_attempts: this.maxAttempts,
      priority: this.priority,
    });
  }

}
