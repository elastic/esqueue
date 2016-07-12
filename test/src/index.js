import events from 'events';
import expect from 'expect.js';
import sinon from 'sinon';
import proxyquire from 'proxyquire';
import { noop, times } from 'lodash';
import constants from '../../lib/constants';
import elasticsearchMock from '../fixtures/elasticsearch';
import jobMock from '../fixtures/job';
import workerMock from '../fixtures/worker';

const Esqueue = proxyquire.noPreserveCache()('../../lib/index', {
  './job.js': jobMock,
  './worker.js': workerMock,
});

describe('Esqueue class', function () {
  let client;

  beforeEach(function () {
    client = new elasticsearchMock.Client();
  });

  it('should be an event emitter', function () {
    const queue = new Esqueue('esqueue', { client });
    expect(queue).to.be.an(events.EventEmitter);
  });

  describe('Option validation', function () {
    it('should throw without an index', function () {
      const init = () => new Esqueue();
      expect(init).to.throwException(/must.+specify.+index/i);
    });

    it('should throw with an invalid host', function () {
      const init = () => new Esqueue('esqueue', {
        client: { host: 'nope://nope' }
      });

      expect(init).to.throwException(/invalid.+protocol/i);
    });

    it('should throw with invalid hosts', function () {
      const init = () => new Esqueue('esqueue', {
        client: { hosts: [{ host: 'localhost', protocol: 'nope' }] }
      });

      expect(init).to.throwException(/invalid.+protocol/i);
    });
  });

  describe('Queue construction', function () {
    it('should ping the ES server', function () {
      const pingSpy = sinon.spy(client, 'ping');
      new Esqueue('esqueue', { client });
      sinon.assert.calledOnce(pingSpy);
    });
  });

  describe('Adding jobs', function () {
    let indexName;
    let jobType;
    let payload;
    let queue;

    beforeEach(function () {
      indexName = 'esqueue-index';
      jobType = 'test-test';
      payload = { payload: true };
      queue = new Esqueue(indexName, { client });
    });

    it('should pass queue instance, index name, type and payload', function () {
      const job = queue.addJob(jobType, payload);
      expect(job.getProp('queue')).to.equal(queue);
      expect(job.getProp('index')).to.match(new RegExp(indexName));
      expect(job.getProp('jobType')).to.equal(jobType);
      expect(job.getProp('payload')).to.equal(payload);
    });

    it('should pass default settings', function () {
      const job = queue.addJob(jobType, payload);
      const options = job.getProp('options');
      expect(options).to.have.property('timeout', constants.DEFAULT_SETTING_TIMEOUT);
      expect(options).to.have.property('doctype', constants.DEFAULT_SETTING_DOCTYPE);
    });

    it('should pass queue index settings', function () {
      const indexSettings = {
        index: {
          number_of_shards: 1
        }
      };

      queue = new Esqueue(indexName, { client, indexSettings });
      const job = queue.addJob(jobType, payload);
      expect(job.getProp('options')).to.have.property('indexSettings', indexSettings);
    });
  });

  describe('Registering workers', function () {
    it('should keep track of workers', function () {
      const queue = new Esqueue('esqueue', { client });
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
      const queue = new Esqueue('esqueue', { client });
      const stubs = times(3, () => { return { destroy: sinon.stub() }; });
      stubs.forEach((stub) => queue._workers.push(stub));
      expect(queue.getWorkers()).to.have.length(3);

      queue.destroy();
      stubs.forEach((stub) => sinon.assert.calledOnce(stub.destroy));
      expect(queue.getWorkers()).to.have.length(0);
    });
  });

});