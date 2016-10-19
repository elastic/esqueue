'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

var _lodash = require('lodash.omit');

var _lodash2 = _interopRequireDefault(_lodash);

var _job = require('./job.js');

var _job2 = _interopRequireDefault(_job);

var _worker = require('./worker.js');

var _worker2 = _interopRequireDefault(_worker);

var _constants = require('./constants');

var _constants2 = _interopRequireDefault(_constants);

var _create_client = require('./helpers/create_client');

var _create_client2 = _interopRequireDefault(_create_client);

var _index_timestamp = require('./helpers/index_timestamp');

var _index_timestamp2 = _interopRequireDefault(_index_timestamp);

var _logger = require('./helpers/logger');

var _logger2 = _interopRequireDefault(_logger);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var debug = (0, _logger2.default)('esqueue:queue');

var Esqueue = function (_events$EventEmitter) {
  _inherits(Esqueue, _events$EventEmitter);

  function Esqueue(index) {
    var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    _classCallCheck(this, Esqueue);

    if (!index) throw new Error('Must specify an index to write to');

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Esqueue).call(this));

    _this.index = index;
    _this.settings = Object.assign({
      interval: _constants2.default.DEFAULT_SETTING_INTERVAL,
      timeout: _constants2.default.DEFAULT_SETTING_TIMEOUT,
      doctype: _constants2.default.DEFAULT_SETTING_DOCTYPE,
      dateSeparator: _constants2.default.DEFAULT_SETTING_DATE_SEPARATOR
    }, (0, _lodash2.default)(options, ['client']));
    _this.client = (0, _create_client2.default)(options.client || {});

    _this._workers = [];
    _this._initTasks().catch(function (err) {
      return _this.emit(_constants2.default.EVENT_QUEUE_ERROR, err);
    });
    return _this;
  }

  _createClass(Esqueue, [{
    key: '_initTasks',
    value: function _initTasks() {
      var initTasks = [this.client.ping()];

      return Promise.all(initTasks).catch(function (err) {
        debug('Initialization failed', err);
        throw err;
      });
    }
  }, {
    key: 'addJob',
    value: function addJob(type, payload) {
      var opts = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

      var timestamp = (0, _index_timestamp2.default)(this.settings.interval, this.settings.dateSeparator);
      var index = this.index + '-' + timestamp;
      var defaults = {
        timeout: this.settings.timeout
      };

      var options = Object.assign(defaults, opts, {
        doctype: this.settings.doctype,
        indexSettings: this.settings.indexSettings
      });

      return new _job2.default(this, index, type, payload, options);
    }
  }, {
    key: 'registerWorker',
    value: function registerWorker(type, workerFn, opts) {
      var worker = new _worker2.default(this, type, workerFn, opts);
      this._workers.push(worker);
      return worker;
    }
  }, {
    key: 'getWorkers',
    value: function getWorkers() {
      return this._workers.map(function (fn) {
        return fn;
      });
    }
  }, {
    key: 'destroy',
    value: function destroy() {
      var workers = this._workers.filter(function (worker) {
        return worker.destroy();
      });
      this._workers = workers;
    }
  }]);

  return Esqueue;
}(_events2.default.EventEmitter);

exports.default = Esqueue;
module.exports = exports['default'];