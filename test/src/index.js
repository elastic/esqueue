import Elastique from '../../lib/index';
import expect from 'expect.js';

describe('Elastique class', function () {
  describe('Option validation', function () {
    it('should throw without an index', function () {
      const init = () => new Elastique();
      expect(init).to.throwException(/must.+specify.+index/i);
    });

    it('should throw with an invalid host', function () {
      const init = () => new Elastique('elastique', {
        client: { host: 'nope://nope' }
      });

      expect(init).to.throwException(/invalid.+protocol/i);
    });

    it('should throw with invalid hosts', function () {
      const init = () => new Elastique('elastique', {
        client: { hosts: [{ host: 'localhost', protocol: 'nope' }] }
      });

      expect(init).to.throwException(/invalid.+protocol/i);
    });
  });

  describe('Job Creation', function () {

  });

});