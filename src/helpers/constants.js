export const jobStatuses = {
  JOB_STATUS_PENDING: 'pending',
  JOB_STATUS_PROCESSING: 'processing',
  JOB_STATUS_COMPLETED: 'completed',
  JOB_STATUS_FAILED: 'failed',
  JOB_STATUS_CANCELLED: 'cancelled',
};

export const defaultSettings = {
  DEFAULT_SETTING_TIMEOUT: 10000,
  DEFAULT_SETTING_INTERVAL: 'week',
  DEFAULT_SETTING_DOCTYPE: 'esqueue',
};

export const events = {
  EVENT_QUEUE_ERROR: 'error',
  EVENT_JOB_CREATED: 'job:created',
  EVENT_JOB_ERROR: 'job:error',
  EVENT_WORKER_ERROR: 'worker:error',
  EVENT_WORKER_COMPLETE: 'worker:job complete',
  EVENT_WORKER_JOB_CLAIM_ERROR: 'worker:claim job error',
  EVENT_WORKER_JOB_SEARCH_ERROR: 'worker:pending jobs error',
  EVENT_WORKER_JOB_UPDATE_ERROR: 'worker:update job error',
  EVENT_WORKER_JOB_FAIL_ERROR: 'worker:failed job update error',
  EVENT_WORKER_JOB_EXECUTION_ERROR: 'worker:job execution error',
  EVENT_WORKER_JOB_TIMEOUT_ERROR: 'worker:job timeout',
};

export default Object.assign({}, jobStatuses, defaultSettings, events);