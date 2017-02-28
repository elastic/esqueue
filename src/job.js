import events from 'events';
import Puid from 'puid';
import contstants from './constants';
import logger from './helpers/logger';
import createIndex from './helpers/create_index';
import isPlainObject from './helpers/is_plain_object';

const debug = logger('esqueue:job');
const puid = new Puid();

export default class Job extends events.EventEmitter {
  constructor(queue, index, type, payload, options = {}) {
    if (typeof type !== 'string') throw new Error('Type must be a string');
    if (!isPlainObject(payload)) throw new Error('Payload must be a plain object');

    super();

    this.queue = queue;
    this.client = options.client || this.queue.client;
    this.id = puid.generate();
    this.index = index;
    this.jobtype = type;
    this.payload = payload;
    this.created_by = options.created_by || false;
    this.timeout = options.timeout || 10000;
    this.maxAttempts = options.max_attempts || 3;
    this.priority = Math.max(Math.min(options.priority || 10, 20), -20);
    this.doctype = options.doctype || contstants.DEFAULT_SETTING_DOCTYPE;
    this.indexSettings = options.indexSettings || {};

    this.debug = (...msg) => debug(...msg, `id: ${this.id}`);

    const indexParams = {
      index: this.index,
      type: this.doctype,
      id: this.id,
      body: {
        jobtype: this.jobtype,
        payload: this.payload,
        priority: this.priority,
        created_by: this.created_by,
        timeout: this.timeout,
        process_expiration: new Date(0), // use epoch so the job query works
        created_at: new Date(),
        attempts: 0,
        max_attempts: this.maxAttempts,
        status: contstants.JOB_STATUS_PENDING,
      }
    };

    if (options.headers) {
      indexParams.headers = options.headers;
    }

    this.ready = createIndex(this.client, this.index, this.doctype, this.indexSettings)
    .then(() => this.client.index(indexParams))
    .then((doc) => {
      this.document = {
        id: doc._id,
        type: doc._type,
        index: doc._index,
        version: doc._version,
      };
      this.debug(`Job created in index ${this.index}`);

      return this.client.indices.refresh({
        index: this.index
      }).then(() => {
        this.debug(`Job index refreshed ${this.index}`);
        this.emit(contstants.EVENT_JOB_CREATED, this.document);
      });
    })
    .catch((err) => {
      this.debug('Job creation failed', err);
      this.emit(contstants.EVENT_JOB_CREATE_ERROR, err);
    });
  }

  emit(name, ...args) {
    super.emit(name, ...args);
    this.queue.emit(name, ...args);
  }

  get() {
    return this.ready
    .then(() => {
      return this.client.get({
        index: this.index,
        type: this.doctype,
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
      type: this.doctype,
      jobtype: this.jobtype,
      created_by: this.created_by,
      payload: this.payload,
      timeout: this.timeout,
      max_attempts: this.maxAttempts,
      priority: this.priority,
    });
  }
}
