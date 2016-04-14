import events from 'events';
import Joi from 'joi';

export default class Elastique extends events.EventEmitter {
  constructor(options = {}) {
    super();

    var schema = Joi.object({
      url: Joi.string().uri({ scheme: ['http', 'https'] }).default('http://localhost:9200'),
      index: Joi.string().required(),
      interval: Joi.string().default('1w'),
      timeout: Joi.number().min(10000).default(10000),
    }).default();

    const validateSchema = () => new Promise(function (resolve, reject) {
      schema.validate(options, (err, settings) => {
        if (err) return reject(err);
        resolve(settings);
      })
    })

    this.ready = true;

    Promise.all([
      validateSchema()
    ])
    .then(([ settings ]) => {
      console.log('settings', settings);
      this.settings = settings;
    })
    .catch((err) => {
      this.ready = false;
      this.emit('error', err);
      throw err;
    });
  }
}

