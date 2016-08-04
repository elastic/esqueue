'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

var _lodash = require('lodash.isplainobject');

var _lodash2 = _interopRequireDefault(_lodash);

var _puid = require('puid');

var _puid2 = _interopRequireDefault(_puid);

var _constants = require('./constants');

var _constants2 = _interopRequireDefault(_constants);

var _logger = require('./helpers/logger');

var _logger2 = _interopRequireDefault(_logger);

var _create_index = require('./helpers/create_index');

var _create_index2 = _interopRequireDefault(_create_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var debug = (0, _logger2.default)('esqueue:job');
var puid = new _puid2.default();

var Job = function (_events$EventEmitter) {
  _inherits(Job, _events$EventEmitter);

  function Job(queue, index, type, payload) {
    var options = arguments.length <= 4 || arguments[4] === undefined ? {} : arguments[4];

    _classCallCheck(this, Job);

    if (typeof type !== 'string') throw new Error('Type must be a string');
    if (!(0, _lodash2.default)(payload)) throw new Error('Payload must be a plain object');

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Job).call(this));

    _this.queue = queue;
    _this.client = options.client || _this.queue.client;
    _this.id = puid.generate();
    _this.index = index;
    _this.jobtype = type;
    _this.payload = payload;
    _this.created_by = options.created_by || false;
    _this.timeout = options.timeout || 10000;
    _this.maxAttempts = options.max_attempts || 3;
    _this.priority = Math.max(Math.min(options.priority || 10, 20), -20);
    _this.doctype = options.doctype || _constants2.default.DEFAULT_SETTING_DOCTYPE;
    _this.indexSettings = options.indexSettings || {};

    _this.debug = function () {
      for (var _len = arguments.length, msg = Array(_len), _key = 0; _key < _len; _key++) {
        msg[_key] = arguments[_key];
      }

      return debug.apply(undefined, msg.concat(['id: ' + _this.id]));
    };

    var indexParams = {
      index: _this.index,
      type: _this.doctype,
      id: _this.id,
      body: {
        jobtype: _this.jobtype,
        payload: _this.payload,
        priority: _this.priority,
        created_by: _this.created_by,
        timeout: _this.timeout,
        process_expiration: new Date(0), // use epoch so the job query works
        created_at: new Date(),
        attempts: 0,
        max_attempts: _this.maxAttempts,
        status: _constants2.default.JOB_STATUS_PENDING
      }
    };

    if (options.headers) {
      indexParams.headers = options.headers;
    }

    _this.ready = (0, _create_index2.default)(_this.client, _this.index, _this.doctype, _this.indexSettings).then(function () {
      return _this.client.index(indexParams);
    }).then(function (doc) {
      _this.document = {
        id: doc._id,
        type: doc._type,
        index: doc._index,
        version: doc._version
      };
      _this.debug('Job created in index ' + _this.index);

      return _this.client.indices.refresh({
        index: _this.index
      }).then(function () {
        _this.debug('Job index refreshed ' + _this.index);
        _this.emit(_constants2.default.EVENT_JOB_CREATED, _this.document);
      });
    }).catch(function (err) {
      _this.debug('Job creation failed', err);
      _this.emit(_constants2.default.EVENT_JOB_CREATE_ERROR, err);
    });
    return _this;
  }

  _createClass(Job, [{
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
    key: 'get',
    value: function get() {
      var _this2 = this;

      return this.ready.then(function () {
        return _this2.client.get({
          index: _this2.index,
          type: _this2.doctype,
          id: _this2.id
        });
      }).then(function (doc) {
        return Object.assign(doc._source, {
          index: doc._index,
          id: doc._id,
          type: doc._type,
          version: doc._version
        });
      });
    }
  }, {
    key: 'toJSON',
    value: function toJSON() {
      return Object.assign({
        id: this.id,
        index: this.index,
        type: this.doctype,
        jobtype: this.jobtype,
        created_by: this.created_by,
        payload: this.payload,
        timeout: this.timeout,
        max_attempts: this.maxAttempts,
        priority: this.priority
      });
    }
  }]);

  return Job;
}(_events2.default.EventEmitter);

exports.default = Job;
module.exports = exports['default'];