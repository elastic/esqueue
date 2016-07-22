'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typed = require('error/typed');

var _typed2 = _interopRequireDefault(_typed);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var errors = {};

errors.WorkerTimeoutError = (0, _typed2.default)({
  type: 'WorkerTimeoutError',
  message: 'worker timed out, timeout={timeout}',
  timeout: null,
  jobId: null
});

errors.UnspecifiedWorkerError = (0, _typed2.default)({
  type: 'UnspecifiedWorkerError',
  message: 'Unspecified worker error',
  timeout: null,
  jobId: null
});

exports.default = errors;
module.exports = exports['default'];