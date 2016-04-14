import events from 'events';
import createClient from './helpers/create_client';

export default class Elastique extends events.EventEmitter {
  constructor(options = {}) {
    if (!options.index) throw new Error('Must specify an index to write to');
    super();

    this.ready = true;

    this.settings = {};
    Object.keys(options, (key) => {
      if (key !== 'client') this.settings[key] = options[key];
    });

    this.client = createClient(options.client);
  }

  add(type, payload, opts = {}) {
    const options = Object.assign({
      timeout: this.settings.timeout
    }, opts);

  }
}

