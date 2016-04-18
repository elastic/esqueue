import expect from 'expect.js';
import Worker from '../../lib/worker';

describe('Worker', function () {
  describe('invalid construction', function () {
    let mockQueue;

    beforeEach(function () {
      mockQueue = {};
    });

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

  // describe('construction', function () {
  //   it('should have a unique ID', function () {
  //     var worker = new Worker(mockQueue);
  //   });
  // });

});
