'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var jobStatuses = exports.jobStatuses = {
  JOB_STATUS_PENDING: 'pending',
  JOB_STATUS_PROCESSING: 'processing',
  JOB_STATUS_COMPLETED: 'completed',
  JOB_STATUS_FAILED: 'failed',
  JOB_STATUS_CANCELLED: 'cancelled'
};

var defaultSettings = exports.defaultSettings = {
  DEFAULT_SETTING_TIMEOUT: 10000,
  DEFAULT_SETTING_INTERVAL: 'week',
  DEFAULT_SETTING_DOCTYPE: 'esqueue'
};

exports.default = Object.assign({}, jobStatuses, defaultSettings);