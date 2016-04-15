import events from 'events';
import createClient from './helpers/create_client';
import { omit } from 'lodash';

export default class Elastique extends events.EventEmitter {
  constructor(index, options = {}) {
    if (!index) throw new Error('Must specify an index to write to');

    super();

    this.ready = true;
    this.index = index;
    this.settings = Object.assign({
      interval: '1w',
      timeout: 10000,
    }, omit(options, [ 'client' ]));
    this.client = createClient(options.client);
  }

  add(type, payload, opts = {}) {
    const options = Object.assign({
      timeout: this.settings.timeout
    }, opts);

  }
}

