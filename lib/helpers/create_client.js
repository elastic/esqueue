'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = createClient;
exports.isClient = isClient;

var _elasticsearch = require('elasticsearch');

var _elasticsearch2 = _interopRequireDefault(_elasticsearch);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function createClient(options) {
  var client = void 0;

  if (isClient(options)) {
    client = options;
  } else {
    client = new _elasticsearch2.default.Client(options);
  }

  return client;
};

function isClient(client) {
  // if there's a transport property, assume it's a client instance
  return !!client.transport;
}