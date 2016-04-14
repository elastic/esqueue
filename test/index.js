import Elastique from '../lib/index'
import expect from 'expect.js';

describe('Elastique class', function () {
  describe('Option validation', function () {
    it('should emit error without an index', function (done) {
      const queue = new Elastique();

      queue.on('error', (err) => {
        expect(err).to.be.an(Error);
        expect(err.message).to.match(/index/);
        done();
      });
    });

    it('should emit error with an invalid URL', function (done) {
      const queue = new Elastique({
        index: 'elastique',
        url: 'nope://nope'
      });
      queue.on('error', (err) => {
        expect(err).to.be.an(Error);
        expect(err.message).to.match(/url/);
        done();
      });
    });
  });
});