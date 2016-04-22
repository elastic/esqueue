import moment from 'moment';

export const intervals = [
  'year',
  'month',
  'week',
  'day',
  'hour',
  'minute'
];

export default function indexTimestamp(intervalStr) {
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
      dateString = 'YYYY-MM';
      break;
    case 'hour':
      dateString = 'YYYY-MM-DD-HH';
      break;
    case 'minute':
      dateString = 'YYYY-MM-DD-HH-mm';
      break;
    default:
      dateString = 'YYYY-MM-DD';
  }

  return m.format(dateString);
}