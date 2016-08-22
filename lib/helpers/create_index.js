'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = createIndex;

var _constants = require('../constants');

var schema = {
  jobtype: { type: 'string', index: 'not_analyzed' },
  payload: { type: 'object', enabled: false },
  priority: { type: 'byte' },
  timeout: { type: 'long' },
  process_expiration: { type: 'date' },
  created_by: { type: 'string', index: 'not_analyzed' },
  created_at: { type: 'date' },
  started_at: { type: 'date' },
  completed_at: { type: 'date' },
  attempts: { type: 'short' },
  max_attempts: { type: 'short' },
  status: { type: 'string', index: 'not_analyzed' },
  output: {
    type: 'object',
    properties: {
      content_type: { type: 'string', index: 'not_analyzed' },
      content: { type: 'object', enabled: false }
    }
  }
};

function createIndex(client, indexName) {
  var doctype = arguments.length <= 2 || arguments[2] === undefined ? _constants.DEFAULT_SETTING_DOCTYPE : arguments[2];
  var settings = arguments.length <= 3 || arguments[3] === undefined ? {} : arguments[3];

  var indexBody = { mappings: {} };
  indexBody.mappings[doctype] = { properties: schema };

  var body = Object.assign({}, { settings: settings }, indexBody);

  return client.indices.exists({
    index: indexName
  }).then(function (exists) {
    if (!exists) {
      return client.indices.create({
        ignore: 400,
        index: indexName,
        body: body
      }).then(function () {
        return true;
      });
    }
    return exists;
  });
}
module.exports = exports['default'];