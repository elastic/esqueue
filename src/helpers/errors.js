import typedError from 'error/typed';

const errors = {};

errors.WorkerTimeoutError = typedError({
  type: 'WorkerTimeout',
  message: 'worker timed out, timeout={timeout}',
  timeout: null,
  jobId: null
});

export default errors;
