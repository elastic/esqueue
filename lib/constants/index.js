'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _events = require('./events');

var _events2 = _interopRequireDefault(_events);

var _statuses = require('./statuses');

var _statuses2 = _interopRequireDefault(_statuses);

var _default_settings = require('./default_settings');

var _default_settings2 = _interopRequireDefault(_default_settings);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = Object.assign({}, _events2.default, _statuses2.default, _default_settings2.default);
module.exports = exports['default'];