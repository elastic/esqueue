import expect from 'expect.js';
import sinon from 'sinon';
import moment from 'moment';
import proxyquire from 'proxyquire';

const anchor = '2016-04-02T01:02:03.456'; // saturday

const module = proxyquire.noPreserveCache()('../../../lib/helpers/index_timestamp', {
  moment: () => moment(anchor)
});
const indexTimestamp = module.default;

describe('Index interval', function () {
  describe('indexTimestamp construction', function () {
    it('should throw given an invalid interval', function () {
      const init = () => indexTimestamp('bananas');
      expect(init).to.throwException(/invalid.+interval/i);
    });
  });

  describe('indexTimestamp timestamps', function () {
    let clock;

    beforeEach(function () {
      clock = sinon.useFakeTimers(moment(anchor).valueOf());
    });

    afterEach(function () {
      clock.restore();
    });

    it('should return the year', function () {
      var timestamp = indexTimestamp('year');
      expect(timestamp).to.equal('2016');
    });

    it('should return the year and month', function () {
      var timestamp = indexTimestamp('month');
      expect(timestamp).to.equal('2016-04');
    });

    it('should return the year, month, and first day of the week', function () {
      var timestamp = indexTimestamp('week');
      expect(timestamp).to.equal('2016-03-27');
    });

    it('should return the year, month, and day of the week', function () {
      var timestamp = indexTimestamp('day');
      expect(timestamp).to.equal('2016-04-02');
    });

    it('should return the year, month, day and hour', function () {
      var timestamp = indexTimestamp('hour');
      expect(timestamp).to.equal('2016-04-02-01');
    });

    it('should return the year, month, day, hour and minute', function () {
      var timestamp = indexTimestamp('minute');
      expect(timestamp).to.equal('2016-04-02-01-02');
    });
  });
});
