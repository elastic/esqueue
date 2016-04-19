import expect from 'expect.js';
import { noop } from 'lodash';
import Worker from '../../lib/worker';

describe('Worker class', function () {
  let mockQueue;

  beforeEach(function () {
    mockQueue = {};
  });

  describe('invalid construction', function () {
    it('should throw without a type', function () {
      const init = () => new Worker(mockQueue);
      expect(init).to.throwException(/type.+string/i);
    });

    it('should throw without an invalid type', function () {
      const init = () => new Worker(mockQueue, { string: false });
      expect(init).to.throwException(/type.+string/i);
    });

    it('should throw without a worker', function () {
      const init = () => new Worker(mockQueue, 'test');
      expect(init).to.throwException(/worker.+function/i);
    });

    it('should throw with an invalid worker', function () {
      const init = () => new Worker(mockQueue, 'test', { function: false });
      expect(init).to.throwException(/worker.+function/i);
    });
  });

  describe('construction', function () {
    it('should have a unique ID', function () {
      var worker = new Worker(mockQueue, 'test', noop);
      expect(worker.id).to.be.a('string');

      var worker2 = new Worker(mockQueue, 'test', noop);
      expect(worker2.id).to.be.a('string');

      expect(worker.id).to.not.equal(worker2.id);
    });
  });

});
