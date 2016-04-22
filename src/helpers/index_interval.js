import moment from 'moment';

export const intervals = [
  'y',
  'M',
  'w',
  'd',
  'h',
  'm'
];

export const intervalNames = [
  'year',
  'month',
  'week',
  'day',
  'hour',
  'minute'
];

export default function getTimestamp(intervalStr) {
  const index = intervals.indexOf(intervalStr);
  if (index === -1) throw new Error('Invalid index interval: ', intervalStr);

  const startType = intervalNames[intervalStr];
  const m = moment();
  m.startOf(startType);

  let dateString = 'YYYY-MM-DD';
  if (startType === 'hour') {
    dateString += '-HH';
  }
  if (startType === 'minute') {
    dateString += '-HH-mm';
  }
  return m.format(dateString);
}