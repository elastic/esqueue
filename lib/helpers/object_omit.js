'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (obj, props) {
  if (!(0, _is_plain_object2.default)(obj)) return obj;
  if (!Array.isArray(props)) props = [props];

  var newObj = Object.assign({}, obj);

  props.forEach(function (prop) {
    return delete newObj[prop];
  });
  return newObj;
};

var _is_plain_object = require('./is_plain_object');

var _is_plain_object2 = _interopRequireDefault(_is_plain_object);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

module.exports = exports['default'];