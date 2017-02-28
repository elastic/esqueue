'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.WorkerTimeoutError = WorkerTimeoutError;
exports.UnspecifiedWorkerError = UnspecifiedWorkerError;
function WorkerTimeoutError(message) {
  var props = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  this.name = 'WorkerTimeoutError';
  this.message = message;
  this.timeout = props.timeout;
  this.jobId = props.jobId;

  if ("captureStackTrace" in Error) Error.captureStackTrace(this, WorkerTimeoutError);else this.stack = new Error().stack;
}
WorkerTimeoutError.prototype = Object.create(Error.prototype);

function UnspecifiedWorkerError(message) {
  var props = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  this.name = 'UnspecifiedWorkerError';
  this.message = message;
  this.jobId = props.jobId;

  if ("captureStackTrace" in Error) Error.captureStackTrace(this, UnspecifiedWorkerError);else this.stack = new Error().stack;
}
UnspecifiedWorkerError.prototype = Object.create(Error.prototype);