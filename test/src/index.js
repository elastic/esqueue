import events from 'events';
import expect from 'expect.js';
import sinon from 'sinon';
import { noop, times } from 'lodash';
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

  describe('Registering workers', function () {
    it('should keep track of workers', function () {
      const queue = new Elastique('elastique', { client });
      expect(queue.getWorkers()).to.eql([]);
      expect(queue.getWorkers()).to.have.length(0);

      queue.registerWorker('test', noop);
      queue.registerWorker('test', noop);
      queue.registerWorker('test2', noop);
      expect(queue.getWorkers()).to.have.length(3);
    });
  });

  describe('Destroy', function () {
    it('should destroy workers', function () {
      const queue = new Elastique('elastique', { client });
      const stubs = times(3, () => { return { destroy: sinon.stub() }; });
      stubs.forEach((stub) => queue._workers.push(stub));
      expect(queue.getWorkers()).to.have.length(3);

      queue.destroy();
      stubs.forEach((stub) => sinon.assert.calledOnce(stub.destroy));
      expect(queue.getWorkers()).to.have.length(0);
    });
  });

});