import moment from 'moment';

export const intervals = [
  'year',
  'month',
  'week',
  'day',
  'hour',
  'minute'
];

export default function indexTimestamp(intervalStr, separator = '-') {
  if (separator.match(/[a-z]/i)) throw new Error('Interval separator can not be a letter');

  const index = intervals.indexOf(intervalStr);
  if (index === -1) throw new Error('Invalid index interval: ', intervalStr);

  const m = moment();
  m.startOf(intervalStr);

  let dateString;
  switch (intervalStr) {
    case 'year':
      dateString = 'YYYY';
      break;
    case 'month':
      dateString = `YYYY${separator}MM`;
      break;
    case 'hour':
      dateString = `YYYY${separator}MM${separator}DD${separator}HH`;
      break;
    case 'minute':
      dateString = `YYYY${separator}MM${separator}DD${separator}HH${separator}mm`;
      break;
    default:
      dateString = `YYYY${separator}MM${separator}DD`;
  }

  return m.format(dateString);
}