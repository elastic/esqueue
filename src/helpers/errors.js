import typedError from 'error/typed';

const errors = {};

errors.WorkerTimeoutError = typedError({
  type: 'WorkerTimeoutError',
  message: 'worker timed out, timeout={timeout}',
  timeout: null,
  jobId: null
});

errors.UnspecifiedWorkerError = typedError({
  type: 'UnspecifiedWorkerError',
  message: 'Unspecified worker error',
  timeout: null,
  jobId: null
});

export default errors;
