import events from 'events';
import validateSchema from './lib/validate_schema';

export default class Elastique extends events.EventEmitter {
  constructor(options = {}) {
    super();

    this.ready = true;

    // initalize the module
    Promise.all([
      validateSchema(options)
    ])
    .then(([ settings ]) => {
      this.settings = settings;
    })
    .catch((err) => {
      this.ready = false;
      this.emit('error', err);
      throw err;
    });
  }
}

