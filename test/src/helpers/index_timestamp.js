import expect from 'expect.js';
import sinon from 'sinon';
import moment from 'moment';
import indexTimestamp from '../../../lib/helpers/index_timestamp';

const anchor = '2016-04-02T01:02:03.456'; // saturday

describe('Index timestamp interval', function () {
  describe('construction', function () {
    it('should throw given an invalid interval', function () {
      const init = () => indexTimestamp('bananas');
      expect(init).to.throwException(/invalid.+interval/i);
    });
  });

  describe('timestamps', function () {
    let clock;

    beforeEach(function () {
      clock = sinon.useFakeTimers(moment(anchor).valueOf());
    });

    afterEach(function () {
      clock.restore();
    });

    describe('formats', function () {
      it('should return the year', function () {
        const timestamp = indexTimestamp('year');
        expect(timestamp).to.equal('2016');
      });

      it('should return the year and month', function () {
        const timestamp = indexTimestamp('month');
        expect(timestamp).to.equal('2016-04');
      });

      it('should return the year, month, and first day of the week', function () {
        const timestamp = indexTimestamp('week');
        expect(timestamp).to.equal('2016-03-27');
      });

      it('should return the year, month, and day of the week', function () {
        const timestamp = indexTimestamp('day');
        expect(timestamp).to.equal('2016-04-02');
      });

      it('should return the year, month, day and hour', function () {
        const timestamp = indexTimestamp('hour');
        expect(timestamp).to.equal('2016-04-02-01');
      });

      it('should return the year, month, day, hour and minute', function () {
        const timestamp = indexTimestamp('minute');
        expect(timestamp).to.equal('2016-04-02-01-02');
      });
    });

    describe('date separator', function () {
      it('should be customizable', function () {
        const separators = ['-', '.', '_'];
        separators.forEach(separator => {
          const str = `2016${separator}04${separator}02${separator}01${separator}02`;
          const timestamp = indexTimestamp('minute', separator);
          expect(timestamp).to.equal(str);
        });
      });

      it('should throw if a letter is used', function () {
        const separator = 'a';
        const fn = () => indexTimestamp('minute', separator);
        expect(fn).to.throwException();
      });
    });
  });
});
