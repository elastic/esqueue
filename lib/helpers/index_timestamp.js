'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.intervals = undefined;
exports.default = indexTimestamp;

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var intervals = exports.intervals = ['year', 'month', 'week', 'day', 'hour', 'minute'];

function indexTimestamp(intervalStr) {
  var separator = arguments.length <= 1 || arguments[1] === undefined ? '-' : arguments[1];

  if (separator.match(/[a-z]/i)) throw new Error('Interval separator can not be a letter');

  var index = intervals.indexOf(intervalStr);
  if (index === -1) throw new Error('Invalid index interval: ', intervalStr);

  var m = (0, _moment2.default)();
  m.startOf(intervalStr);

  var dateString = void 0;
  switch (intervalStr) {
    case 'year':
      dateString = 'YYYY';
      break;
    case 'month':
      dateString = 'YYYY' + separator + 'MM';
      break;
    case 'hour':
      dateString = 'YYYY' + separator + 'MM' + separator + 'DD' + separator + 'HH';
      break;
    case 'minute':
      dateString = 'YYYY' + separator + 'MM' + separator + 'DD' + separator + 'HH' + separator + 'mm';
      break;
    default:
      dateString = 'YYYY' + separator + 'MM' + separator + 'DD';
  }

  return m.format(dateString);
}