'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

var _puid = require('puid');

var _puid2 = _interopRequireDefault(_puid);

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

var _constants = require('./constants');

var _constants2 = _interopRequireDefault(_constants);

var _logger = require('./helpers/logger');

var _logger2 = _interopRequireDefault(_logger);

var _errors = require('./helpers/errors');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var puid = new _puid2.default();
var debug = (0, _logger2.default)('esqueue:worker');

function formatJobObject(job) {
  return {
    index: job._index,
    type: job._type,
    id: job._id
  };
}

var Job = function (_events$EventEmitter) {
  _inherits(Job, _events$EventEmitter);

  function Job(queue, type, workerFn) {
    var opts = arguments.length <= 3 || arguments[3] === undefined ? {} : arguments[3];

    _classCallCheck(this, Job);

    if (typeof type !== 'string') throw new Error('Type must be a string');
    if (typeof workerFn !== 'function') throw new Error('Worker must be a function');

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Job).call(this));

    _this.id = puid.generate();
    _this.queue = queue;
    _this.client = opts.client || _this.queue.client;
    _this.jobtype = type;
    _this.workerFn = workerFn;
    _this.checkInterval = opts.interval || 1500;
    _this.checkSize = opts.size || 10;
    _this.doctype = opts.doctype || _constants2.default.DEFAULT_SETTING_DOCTYPE;

    _this.debug = function () {
      for (var _len = arguments.length, msg = Array(_len), _key = 0; _key < _len; _key++) {
        msg[_key] = arguments[_key];
      }

      return debug.apply(undefined, msg.concat(['id: ' + _this.id]));
    };

    _this._checker = false;
    _this.debug('Created worker for job type ' + _this.jobtype);
    _this._startJobPolling();
    return _this;
  }

  _createClass(Job, [{
    key: 'destroy',
    value: function destroy() {
      clearInterval(this._checker);
    }
  }, {
    key: 'toJSON',
    value: function toJSON() {
      return {
        id: this.id,
        index: this.queue.index,
        jobType: this.jobType,
        doctype: this.doctype
      };
    }
  }, {
    key: 'emit',
    value: function emit(name) {
      var _get2, _queue;

      for (var _len2 = arguments.length, args = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
        args[_key2 - 1] = arguments[_key2];
      }

      (_get2 = _get(Object.getPrototypeOf(Job.prototype), 'emit', this)).call.apply(_get2, [this, name].concat(args));
      (_queue = this.queue).emit.apply(_queue, [name].concat(args));
    }
  }, {
    key: '_formatErrorParams',
    value: function _formatErrorParams(err, job) {
      var response = {
        error: err,
        worker: this.toJSON()
      };

      if (job) response.job = formatJobObject(job);
      return response;
    }
  }, {
    key: '_claimJob',
    value: function _claimJob(job) {
      var _this2 = this;

      var m = (0, _moment2.default)();
      var startTime = m.toISOString();
      var expirationTime = m.add(job._source.timeout).toISOString();
      var attempts = job._source.attempts + 1;

      if (attempts > job._source.max_attempts) {
        var msg = !job._source.output ? 'Max attempts reached (' + job._source.max_attempts + ')' : false;
        return this._failJob(job, msg).then(function () {
          return false;
        });
      }

      var doc = {
        attempts: attempts,
        started_at: startTime,
        process_expiration: expirationTime,
        status: _constants2.default.JOB_STATUS_PROCESSING
      };

      return this.client.update({
        index: job._index,
        type: job._type,
        id: job._id,
        version: job._version,
        body: { doc: doc }
      }).then(function (response) {
        var updatedJob = Object.assign({}, job, response);
        updatedJob._source = Object.assign({}, job._source, doc);
        return updatedJob;
      }).catch(function (err) {
        if (err.statusCode === 409) return true;
        _this2.debug('_claimJob failed on job ' + job._id, err);
        _this2.emit(_constants2.default.EVENT_WORKER_JOB_CLAIM_ERROR, _this2._formatErrorParams(err, job));
        return false;
      });
    }
  }, {
    key: '_failJob',
    value: function _failJob(job) {
      var _this3 = this;

      var output = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

      this.debug('Failing job ' + job._id);

      var completedTime = (0, _moment2.default)().toISOString();
      var docOutput = this._formatOutput(output);
      var doc = {
        status: _constants2.default.JOB_STATUS_FAILED,
        completed_at: completedTime,
        output: docOutput
      };

      this.emit(_constants2.default.EVENT_WORKER_JOB_FAIL, {
        job: formatJobObject(job),
        worker: this.toJSON(),
        output: docOutput
      });

      return this.client.update({
        index: job._index,
        type: job._type,
        id: job._id,
        version: job._version,
        body: { doc: doc }
      }).then(function () {
        return true;
      }).catch(function (err) {
        if (err.statusCode === 409) return true;
        _this3.debug('_failJob failed to update job ' + job._id, err);
        _this3.emit(_constants2.default.EVENT_WORKER_FAIL_UPDATE_ERROR, _this3._formatErrorParams(err, job));
        return false;
      });
    }
  }, {
    key: '_formatOutput',
    value: function _formatOutput(output) {
      var unknownMime = false;
      var defaultOutput = null;
      var docOutput = {};

      if ((typeof output === 'undefined' ? 'undefined' : _typeof(output)) === 'object' && output.content) {
        docOutput.content = output.content;
        docOutput.content_type = output.content_type || unknownMime;
      } else {
        docOutput.content = output || defaultOutput;
        docOutput.content_type = unknownMime;
      }

      return docOutput;
    }
  }, {
    key: '_performJob',
    value: function _performJob(job) {
      var _this4 = this;

      this.debug('Starting job ' + job._id);

      var workerOutput = new Promise(function (resolve, reject) {
        // run the worker's workerFn
        var isResolved = false;
        Promise.resolve(_this4.workerFn.call(null, job._source.payload)).then(function (res) {
          isResolved = true;
          resolve(res);
        }).catch(function (err) {
          isResolved = true;
          reject(err);
        });

        // fail if workerFn doesn't finish before timeout
        setTimeout(function () {
          if (isResolved) return;

          _this4.debug('Timeout processing job ' + job._id);
          reject(new _errors.WorkerTimeoutError({
            timeout: job._source.timeout,
            jobId: job._id
          }));
        }, job._source.timeout);
      });

      return workerOutput.then(function (output) {
        // job execution was successful
        _this4.debug('Completed job ' + job._id);

        var completedTime = (0, _moment2.default)().toISOString();
        var docOutput = _this4._formatOutput(output);

        var doc = {
          status: _constants2.default.JOB_STATUS_COMPLETED,
          completed_at: completedTime,
          output: docOutput
        };

        return _this4.client.update({
          index: job._index,
          type: job._type,
          id: job._id,
          version: job._version,
          body: { doc: doc }
        }).then(function () {
          var eventOutput = {
            job: formatJobObject(job),
            output: docOutput
          };

          _this4.emit(_constants2.default.EVENT_WORKER_COMPLETE, eventOutput);
        }).catch(function (err) {
          if (err.statusCode === 409) return false;
          _this4.debug('Failure saving job output ' + job._id, err);
          _this4.emit(_constants2.default.EVENT_WORKER_JOB_UPDATE_ERROR, _this4._formatErrorParams(err, job));
        });
      }, function (jobErr) {
        if (!jobErr) {
          jobErr = new _errors.UnspecifiedWorkerError({
            jobId: job._id
          });
        }

        // job execution failed
        if (jobErr.type === 'WorkerTimeoutError') {
          _this4.debug('Timeout on job ' + job._id);
          _this4.emit(_constants2.default.EVENT_WORKER_JOB_TIMEOUT, _this4._formatErrorParams(jobErr, job));
          return;
        }

        _this4.debug('Failure occurred on job ' + job._id, jobErr);
        _this4.emit(_constants2.default.EVENT_WORKER_JOB_EXECUTION_ERROR, _this4._formatErrorParams(jobErr, job));
        return _this4._failJob(job, jobErr.toString ? jobErr.toString() : false);
      });
    }
  }, {
    key: '_startJobPolling',
    value: function _startJobPolling() {
      var _this5 = this;

      this._checker = setInterval(function () {
        _this5._getPendingJobs().then(function (jobs) {
          return _this5._claimPendingJobs(jobs);
        });
      }, this.checkInterval);
    }
  }, {
    key: '_stopJobPolling',
    value: function _stopJobPolling() {
      clearInterval(this._checker);
    }
  }, {
    key: '_claimPendingJobs',
    value: function _claimPendingJobs(jobs) {
      var _this6 = this;

      if (!jobs || jobs.length === 0) return;

      this._stopJobPolling();
      var claimed = false;

      // claim a single job, stopping after first successful claim
      return jobs.reduce(function (chain, job) {
        return chain.then(function (claimedJob) {
          // short-circuit the promise chain if a job has been claimed
          if (claimed) return claimedJob;

          return _this6._claimJob(job).then(function (claimResult) {
            if (claimResult !== false) {
              claimed = true;
              return claimResult;
            }
          });
        });
      }, Promise.resolve()).then(function (claimedJob) {
        if (!claimedJob) {
          _this6.debug('All ' + jobs.length + ' jobs already claimed');
          return;
        }
        _this6.debug('Claimed job ' + claimedJob._id);
        return _this6._performJob(claimedJob);
      }).then(function () {
        return _this6._startJobPolling();
      }).catch(function (err) {
        _this6.debug('Error claiming jobs', err);
        _this6._startJobPolling();
      });
    }
  }, {
    key: '_getPendingJobs',
    value: function _getPendingJobs() {
      var _this7 = this;

      var nowTime = (0, _moment2.default)().toISOString();
      var query = {
        _source: {
          excludes: ['output.content']
        },
        query: {
          constant_score: {
            filter: {
              bool: {
                filter: { term: { jobtype: this.jobtype } },
                should: [{ term: { status: 'pending' } }, { bool: { filter: [{ term: { status: 'processing' } }, { range: { process_expiration: { lte: nowTime } } }] }
                }]
              }
            }
          }
        },
        sort: [{ priority: { order: 'asc' } }, { created_at: { order: 'asc' } }],
        size: this.checkSize
      };

      this.debug('querying for outstanding jobs');

      return this.client.search({
        index: this.queue.index + '-*',
        type: this.doctype,
        version: true,
        body: query
      }).then(function (results) {
        var jobs = results.hits.hits;
        _this7.debug(jobs.length + ' outstanding jobs returned');
        return jobs;
      }).catch(function (err) {
        // ignore missing indices errors
        if (err.status === 404) return [];

        _this7.debug('job querying failed', err);
        _this7.emit(_constants2.default.EVENT_WORKER_JOB_SEARCH_ERROR, _this7._formatErrorParams(err));
      });
    }
  }]);

  return Job;
}(_events2.default.EventEmitter);

exports.default = Job;
module.exports = exports['default'];