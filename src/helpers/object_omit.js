import isPlainObject from './is_plain_object';

export default function (obj, props) {
  if (!isPlainObject(obj)) return obj;
  if (!Array.isArray(props)) props = [props];

  const newObj = Object.assign({}, obj);

  props.forEach(prop => delete newObj[prop]);
  return newObj;
}