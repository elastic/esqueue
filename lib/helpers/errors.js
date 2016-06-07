'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typed = require('error/typed');

var _typed2 = _interopRequireDefault(_typed);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var errors = {};

errors.WorkerTimeoutError = (0, _typed2.default)({
  type: 'WorkerTimeout',
  message: 'worker timed out, timeout={timeout}',
  timeout: null,
  jobId: null
});

exports.default = errors;
module.exports = exports['default'];