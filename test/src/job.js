import events from 'events';
import expect from 'expect.js';
import sinon from 'sinon';
import proxyquire from 'proxyquire';
import QueueMock from '../fixtures/queue';
import elasticsearchMock from '../fixtures/elasticsearch';
import contstants from '../../lib/constants';

const createIndexMock = sinon.stub();
const module = proxyquire.noPreserveCache()('../../lib/job', {
  './helpers/create_index': createIndexMock
});

const Job = module;
const maxPriority = 20;
const minPriority = -20;
const defaultPriority = 10;
const defaultCreatedBy = false;

function validateDoc(spy) {
  sinon.assert.callCount(spy, 1);
  const spyCall = spy.getCall(0);
  return spyCall.args[0];
}

describe('Job Class', function () {
  let mockQueue;
  let client;
  let index;

  let type;
  let payload;
  let options;

  beforeEach(function () {
    createIndexMock.reset();
    createIndexMock.returns(Promise.resolve('mock'));
    index = 'test';

    client = new elasticsearchMock.Client();
    mockQueue = new QueueMock();
    mockQueue.setClient(client);
  });

  it('should be an event emitter', function () {
    const job = new Job(mockQueue, index, 'test', {});
    expect(job).to.be.an(events.EventEmitter);
  });

  describe('invalid construction', function () {
    it('should throw with a missing type', function () {
      const init = () => new Job(mockQueue, index);
      expect(init).to.throwException(/type.+string/i);
    });

    it('should throw with an invalid type', function () {
      const init = () => new Job(mockQueue, index, { 'not a string': true });
      expect(init).to.throwException(/type.+string/i);
    });

    it('should throw with an invalid payload', function () {
      const init = () => new Job(mockQueue, index, 'type1', [1, 2, 3]);
      expect(init).to.throwException(/plain.+object/i);
    });
  });

  describe('construction', function () {
    beforeEach(function () {
      type = 'type1';
      payload = { id: '123' };
      sinon.spy(client, 'index');
    });

    it('should create the target index', function () {
      const job = new Job(mockQueue, index, type, payload, options);
      return job.ready.then(() => {
        sinon.assert.calledOnce(createIndexMock);
        const args = createIndexMock.getCall(0).args;
        expect(args[0]).to.equal(client);
        expect(args[1]).to.equal(index);
        expect(args[2]).to.equal(contstants.DEFAULT_SETTING_DOCTYPE);
      });
    });

    it('should index the payload', function () {
      const job = new Job(mockQueue, index, type, payload);
      return job.ready.then(() => {
        const indexArgs = validateDoc(client.index);
        expect(indexArgs).to.have.property('index', index);
        expect(indexArgs).to.have.property('type', contstants.DEFAULT_SETTING_DOCTYPE);
        expect(indexArgs).to.have.property('body');
        expect(indexArgs.body).to.have.property('payload', payload);
      });
    });

    it('should index the job type', function () {
      const job = new Job(mockQueue, index, type, payload);
      return job.ready.then(() => {
        const indexArgs = validateDoc(client.index);
        expect(indexArgs).to.have.property('index', index);
        expect(indexArgs).to.have.property('type', contstants.DEFAULT_SETTING_DOCTYPE);
        expect(indexArgs).to.have.property('body');
        expect(indexArgs.body).to.have.property('jobtype', type);
      });
    });

    it('should set event creation time', function () {
      const job = new Job(mockQueue, index, type, payload);
      return job.ready.then(() => {
        const indexArgs = validateDoc(client.index);
        expect(indexArgs.body).to.have.property('created_at');
      });
    });

    it('should emit the job information on success', function (done) {
      const job = new Job(mockQueue, index, type, payload);
      job.once(contstants.EVENT_JOB_CREATED, (jobDoc) => {
        try {
          expect(jobDoc).to.have.property('id');
          expect(jobDoc).to.have.property('index');
          expect(jobDoc).to.have.property('type');
          expect(jobDoc).to.have.property('version');
          done();
        } catch (e) {
          done(e);
        }
      });
    });

    it('should emit error on index creation failure', function (done) {
      const errMsg = 'test index creation failure';

      createIndexMock.returns(Promise.reject(new Error(errMsg)));
      const job = new Job(mockQueue, index, type, payload);

      job.once(contstants.EVENT_JOB_ERROR, (err) => {
        try {
          expect(err.message).to.equal(errMsg);
          done();
        } catch (e) {
          done(e);
        }
      });
    });

    it('should emit error on client index failure', function (done) {
      const errMsg = 'test document index failure';

      client.index.restore();
      sinon.stub(client, 'index', () => Promise.reject(new Error(errMsg)));
      const job = new Job(mockQueue, index, type, payload);

      job.once(contstants.EVENT_JOB_ERROR, (err) => {
        try {
          expect(err.message).to.equal(errMsg);
          done();
        } catch (e) {
          done(e);
        }
      });
    });
  });

  describe('default values', function () {
    beforeEach(function () {
      type = 'type1';
      payload = { id: '123' };
      sinon.spy(client, 'index');
    });

    it('should set attempt count to 0', function () {
      const job = new Job(mockQueue, index, type, payload);
      return job.ready.then(() => {
        const indexArgs = validateDoc(client.index);
        expect(indexArgs.body).to.have.property('attempts', 0);
      });
    });

    it('should index default created_by value', function () {
      const job = new Job(mockQueue, index, type, payload);
      return job.ready.then(() => {
        const indexArgs = validateDoc(client.index);
        expect(indexArgs.body).to.have.property('created_by', defaultCreatedBy);
      });
    });

    it('should set an expired process_expiration time', function () {
      const now = new Date().getTime();
      const job = new Job(mockQueue, index, type, payload);
      return job.ready.then(() => {
        const indexArgs = validateDoc(client.index);
        expect(indexArgs.body).to.have.property('process_expiration');
        expect(indexArgs.body.process_expiration.getTime()).to.be.lessThan(now);
      });
    });

    it('should set status as pending', function () {
      const job = new Job(mockQueue, index, type, payload);
      return job.ready.then(() => {
        const indexArgs = validateDoc(client.index);
        expect(indexArgs.body).to.have.property('status', contstants.JOB_STATUS_PENDING);
      });
    });

    it('should have a default priority of 10', function () {
      const job = new Job(mockQueue, index, type, payload, options);
      return job.ready.then(() => {
        const indexArgs = validateDoc(client.index);
        expect(indexArgs.body).to.have.property('priority', defaultPriority);
      });
    });

  });

  describe('option passing', function () {
    beforeEach(function () {
      type = 'type1';
      payload = { id: '123' };
      options = {
        timeout: 4567,
        max_attempts: 9,
      };
      sinon.spy(client, 'index');
    });

    it('should index the created_by value', function () {
      const createdBy = 'user_identifier';
      const job = new Job(mockQueue, index, type, payload, Object.assign({ created_by: createdBy }, options));
      return job.ready.then(() => {
        const indexArgs = validateDoc(client.index);
        expect(indexArgs.body).to.have.property('created_by', createdBy);
      });
    });

    it('should index timeout value from options', function () {
      const job = new Job(mockQueue, index, type, payload, options);
      return job.ready.then(() => {
        const indexArgs = validateDoc(client.index);
        expect(indexArgs.body).to.have.property('timeout', options.timeout);
      });
    });

    it('should set max attempt count', function () {
      const job = new Job(mockQueue, index, type, payload, options);
      return job.ready.then(() => {
        const indexArgs = validateDoc(client.index);
        expect(indexArgs.body).to.have.property('max_attempts', options.max_attempts);
      });
    });

    it(`should use upper priority of ${maxPriority}`, function () {
      const job = new Job(mockQueue, index, type, payload, { priority: maxPriority * 2 });
      return job.ready.then(() => {
        const indexArgs = validateDoc(client.index);
        expect(indexArgs.body).to.have.property('priority', maxPriority);
      });
    });

    it(`should use lower priority of ${minPriority}`, function () {
      const job = new Job(mockQueue, index, type, payload, { priority: minPriority * 2 });
      return job.ready.then(() => {
        const indexArgs = validateDoc(client.index);
        expect(indexArgs.body).to.have.property('priority', minPriority);
      });
    });
  });

  describe('custom client', function () {
    let newClient;
    let job;

    beforeEach(function () {
      sinon.spy(client, 'index');

      newClient = new elasticsearchMock.Client();
      sinon.spy(newClient, 'index');
      job = new Job(mockQueue, index, type, payload, Object.assign({ client: newClient }, options));
    });

    it('should create the target index', function () {
      return job.ready.then(() => {
        sinon.assert.calledOnce(createIndexMock);
        const args = createIndexMock.getCall(0).args;
        expect(args[0]).to.equal(newClient);
        expect(args[1]).to.equal(index);
        expect(args[2]).to.equal(contstants.DEFAULT_SETTING_DOCTYPE);
      });
    });

    it('should index the payload', function () {
      return job.ready.then(() => {
        sinon.assert.callCount(client.index, 0);
        sinon.assert.callCount(newClient.index, 1);

        const newDoc = newClient.index.getCall(0).args[0];
        expect(newDoc).to.have.property('index', index);
        expect(newDoc).to.have.property('type', contstants.DEFAULT_SETTING_DOCTYPE);
        expect(newDoc).to.have.property('body');
        expect(newDoc.body).to.have.property('payload', payload);
      });
    });
  });

  describe('get method', function () {
    beforeEach(function () {
      type = 'type2';
      payload = { id: '123' };
    });

    it('should return the job document', function () {
      const job = new Job(mockQueue, index, type, payload);

      return job.get()
      .then((doc) => {
        const jobDoc = job.document; // document should be resolved
        expect(doc).to.have.property('index', index);
        expect(doc).to.have.property('type', jobDoc.type);
        expect(doc).to.have.property('id', jobDoc.id);
        expect(doc).to.have.property('version', jobDoc.version);
        expect(doc).to.have.property('created_by', defaultCreatedBy);

        expect(doc).to.have.property('payload');
        expect(doc).to.have.property('jobtype');
        expect(doc).to.have.property('priority');
        expect(doc).to.have.property('timeout');
      });
    });

    it('should contain optional data', function () {
      const optionals = {
        created_by: 'some_ident'
      };

      const job = new Job(mockQueue, index, type, payload, optionals);
      return Promise.resolve(client.get({}, optionals))
      .then((doc) => {
        sinon.stub(client, 'get').returns(Promise.resolve(doc));
      })
      .then(() => {
        return job.get()
        .then((doc) => {
          expect(doc).to.have.property('created_by', optionals.created_by);
        });
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
      const job = new Job(mockQueue, index, type, payload, options);

      // toJSON is sync, should work before doc is written to elasticsearch
      expect(job.document).to.be(undefined);

      const doc = job.toJSON();
      expect(doc).to.have.property('index', index);
      expect(doc).to.have.property('type', contstants.DEFAULT_SETTING_DOCTYPE);
      expect(doc).to.have.property('jobtype', type);
      expect(doc).to.have.property('created_by', defaultCreatedBy);
      expect(doc).to.have.property('timeout', options.timeout);
      expect(doc).to.have.property('max_attempts', options.max_attempts);
      expect(doc).to.have.property('priority', options.priority);
      expect(doc).to.have.property('id');
      expect(doc).to.not.have.property('version');
    });

    it('should contain optional data', function () {
      const optionals = {
        created_by: 'some_ident'
      };

      const job = new Job(mockQueue, index, type, payload, optionals);
      const doc = job.toJSON();
      expect(doc).to.have.property('created_by', optionals.created_by);
    });
  });

});
