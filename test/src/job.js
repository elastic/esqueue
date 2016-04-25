import events from 'events';
import expect from 'expect.js';
import sinon from 'sinon';
import proxyquire from 'proxyquire';
import elasticsearchMock from '../fixtures/elasticsearch';
import { JOB_STATUS_PENDING } from '../../lib/helpers/constants';

const createIndexMock = sinon.stub().returns(Promise.resolve('mock'));
const module = proxyquire.noPreserveCache()('../../lib/job', {
  './helpers/create_index': createIndexMock
});

const Job = module;
const maxPriority = 20;
const minPriority = -20;
const defaultPriority = 10;

describe('Job Class', function () {
  let client;
  let index;

  let type;
  let payload;
  let options;

  beforeEach(function () {
    createIndexMock.reset();
    index = 'test';
    client = new elasticsearchMock.Client();
  });

  it('should be an event emitter', function () {
    const job = new Job(client, index, 'test', {});
    expect(job).to.be.an(events.EventEmitter);
  });

  describe('invalid construction', function () {
    it('should throw with a missing type', function () {
      const init = () => new Job(client, index);
      expect(init).to.throwException(/type.+string/i);
    });

    it('should throw with an invalid type', function () {
      const init = () => new Job(client, index, { 'not a string': true });
      expect(init).to.throwException(/type.+string/i);
    });

    it('should throw with an invalid payload', function () {
      const init = () => new Job(client, index, 'type1', [1, 2, 3]);
      expect(init).to.throwException(/plain.+object/i);
    });
  });

  describe('construction', function () {
    function validateDoc(spy) {
      sinon.assert.callCount(spy, 1);
      const spyCall = spy.getCall(0);
      return spyCall.args[0];
    }

    beforeEach(function () {
      type = 'type1';
      payload = { id: '123' };
      options = {
        timeout: 4567,
        max_attempts: 9,
      };
      sinon.spy(client, 'index');
    });

    it('should index the payload', function () {
      const job = new Job(client, index, type, payload);
      return job.ready.then(() => {
        const newDoc = validateDoc(client.index);
        expect(newDoc).to.have.property('index', index);
        expect(newDoc).to.have.property('type', type);
        expect(newDoc).to.have.property('body');
        expect(newDoc.body).to.have.property('payload', payload);
      });
    });

    it('should index timeout value from options', function () {
      const job = new Job(client, index, type, payload, options);
      return job.ready.then(() => {
        const newDoc = validateDoc(client.index);
        expect(newDoc.body).to.have.property('timeout', options.timeout);
      });
    });

    it('should set event times', function () {
      const job = new Job(client, index, type, payload, options);
      return job.ready.then(() => {
        const newDoc = validateDoc(client.index);
        expect(newDoc.body).to.have.property('created_at');
      });
    });

    it('should set attempt count', function () {
      const job = new Job(client, index, type, payload, options);
      return job.ready.then(() => {
        const newDoc = validateDoc(client.index);
        expect(newDoc.body).to.have.property('attempts', 0);
        expect(newDoc.body).to.have.property('max_attempts', options.max_attempts);
      });
    });

    it('should set status as pending', function () {
      const job = new Job(client, index, type, payload, options);
      return job.ready.then(() => {
        const newDoc = validateDoc(client.index);
        expect(newDoc.body).to.have.property('status', JOB_STATUS_PENDING);
      });
    });

    it('should create the target index', function () {
      const job = new Job(client, index, type, payload, options);
      return job.ready.then(() => {
        sinon.assert.calledOnce(createIndexMock);
      });
    });

    it('should have a default priority of 10', function () {
      const job = new Job(client, index, type, payload, options);
      return job.ready.then(() => {
        const newDoc = validateDoc(client.index);
        expect(newDoc.body).to.have.property('priority', defaultPriority);
      });
    });

    it(`should use upper priority of ${maxPriority}`, function () {
      const job = new Job(client, index, type, payload, { priority: maxPriority * 2 });
      return job.ready.then(() => {
        const newDoc = validateDoc(client.index);
        expect(newDoc.body).to.have.property('priority', maxPriority);
      });
    });

    it(`should use lower priority of ${minPriority}`, function () {
      const job = new Job(client, index, type, payload, { priority: minPriority * 2 });
      return job.ready.then(() => {
        const newDoc = validateDoc(client.index);
        expect(newDoc.body).to.have.property('priority', minPriority);
      });
    });
  });

  describe('get method', function () {
    beforeEach(function () {
      type = 'type2';
      payload = { id: '123' };
    });

    it('should return the job document', function () {
      const job = new Job(client, index, type, payload);
      return job.get()
      .then((doc) => {
        const jobDoc = job.document; // document should be resolved
        expect(doc).to.have.property('index', index);
        expect(doc).to.have.property('type', type);
        expect(doc).to.have.property('id', jobDoc.id);
        expect(doc).to.have.property('version', jobDoc.version);
        expect(doc).to.have.property('payload');
        expect(doc).to.have.property('priority');
        expect(doc).to.have.property('timeout');
      });
    });
  });

  describe('toJSON method', function () {
    beforeEach(function () {
      type = 'type2';
      payload = { id: '123' };
      options = {
        timeout: 4567,
        max_attempts: 9,
        priority: 8,
      };
    });

    it('should return the static information about the job', function () {
      const job = new Job(client, index, type, payload, options);

      // toJSON is sync, should work before doc is written to elasticsearch
      expect(job.document).to.be(undefined);

      const doc = job.toJSON();
      expect(doc).to.have.property('index', index);
      expect(doc).to.have.property('type', type);
      expect(doc).to.have.property('timeout', options.timeout);
      expect(doc).to.have.property('max_attempts', options.max_attempts);
      expect(doc).to.have.property('priority', options.priority);
      expect(doc).to.have.property('id');
      expect(doc).to.not.have.property('version');
    });
  });

});
