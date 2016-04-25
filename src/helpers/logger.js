import debugging from 'debug';

export default function logger(type) {
  return debugging(type);
}