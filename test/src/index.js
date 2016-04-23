import events from 'events';
import expect from 'expect.js';
import sinon from 'sinon';
import elasticsearchMock from '../fixtures/elasticsearch';
import Elastique from '../../lib/index';

describe('Elastique class', function () {
  let client;

  beforeEach(function () {
    client = new elasticsearchMock.Client();
  });

  it('should be an event emitter', function () {
    const queue = new Elastique('elastique', { client });
    expect(queue).to.be.an(events.EventEmitter);
  });

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

  describe('Queue construction', function () {
    it('should ping the ES server', function () {
      const pingSpy = sinon.spy(client, 'ping');
      new Elastique('elastique', { client });
      sinon.assert.calledOnce(pingSpy);
    });
  });

});