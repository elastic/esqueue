import Joi from 'joi';

var schema = Joi.object({
  url: Joi.string().uri({ scheme: ['http', 'https'] }).default('http://localhost:9200'),
  index: Joi.string().required(),
  interval: Joi.string().default('1w'),
  timeout: Joi.number().min(10000).default(10000),
}).default();

const validateSchema = (options) => new Promise(function (resolve, reject) {
  schema.validate(options, (err, settings) => {
    if (err) return reject(err);
    resolve(settings);
  })
})

export default validateSchema;