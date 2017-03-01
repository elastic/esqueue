'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = createIndex;

var _constants = require('../constants');

var schema = {
  jobtype: { type: 'keyword' },
  payload: { type: 'object', enabled: false },
  priority: { type: 'byte' },
  timeout: { type: 'long' },
  process_expiration: { type: 'date' },
  created_by: { type: 'keyword' },
  created_at: { type: 'date' },
  started_at: { type: 'date' },
  completed_at: { type: 'date' },
  attempts: { type: 'short' },
  max_attempts: { type: 'short' },
  status: { type: 'keyword' },
  output: {
    type: 'object',
    properties: {
      content_type: { type: 'keyword', index: false },
      content: { type: 'object', enabled: false }
    }
  }
};

function createIndex(client, indexName) {
  var doctype = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : _constants.DEFAULT_SETTING_DOCTYPE;
  var settings = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};

  var indexBody = { mappings: {} };
  indexBody.mappings[doctype] = { properties: schema };

  var body = Object.assign({}, { settings: settings }, indexBody);

  return client.indices.exists({
    index: indexName
  }).then(function (exists) {
    if (!exists) {
      return client.indices.create({
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