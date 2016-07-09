import expect from 'expect.js';
import sinon from 'sinon';
import moment from 'moment';
import { noop, random, get, find } from 'lodash';
import elasticsearchMock from '../fixtures/elasticsearch';
import QueueMock from '../fixtures/queue';
import Worker from '../../lib/worker';
import constants from '../../lib/helpers/constants';

const anchor = '2016-04-02T01:02:03.456'; // saturday
const defaults = {
  timeout: 10000,
  interval: 1500,
  size: 10,
  unknownMime: false,
  contentBody: null,
};

describe('Worker class', function () {
  let anchorMoment;
  let clock;
  let client;
  let mockQueue;

  beforeEach(function () {
    client = new elasticsearchMock.Client();
    mockQueue = new QueueMock();
    mockQueue.setClient(client);
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
    it('should assign internal properties', function () {
      const jobtype = 'testjob';
      const workerFn = noop;
      const worker = new Worker(mockQueue, jobtype, workerFn);
      expect(worker).to.have.property('id');
      expect(worker).to.have.property('queue', mockQueue);
      expect(worker).to.have.property('client', client);
      expect(worker).to.have.property('jobtype', jobtype);
      expect(worker).to.have.property('workerFn', workerFn);
      expect(worker).to.have.property('checkInterval');
      expect(worker).to.have.property('checkSize');
      expect(worker).to.have.property('doctype');
    });

    it('should have a unique ID', function () {
      const worker = new Worker(mockQueue, 'test', noop);
      expect(worker.id).to.be.a('string');

      const worker2 = new Worker(mockQueue, 'test', noop);
      expect(worker2.id).to.be.a('string');

      expect(worker.id).to.not.equal(worker2.id);
    });

    it('should use custom client', function () {
      const newClient = new elasticsearchMock.Client();
      const worker = new Worker(mockQueue, 'test', noop, { client: newClient });
      expect(worker).to.have.property('queue', mockQueue);
      expect(worker).to.have.property('client', newClient);
      expect(worker.client).to.not.equal(client);
    });
  });

  describe('event emitting', function () {
    let worker;

    beforeEach(function () {
      worker = new Worker(mockQueue, 'test', noop);
    });

    it('should trigger events on the queue instance', function (done) {
      const eventName = 'test event';
      const payload1 = {
        test: true,
        deep: { object: 'ok' }
      };
      const payload2 = 'two';
      const payload3 = new Error('test error');

      mockQueue.on(eventName, (...args) => {
        try {
          expect(args[0]).to.equal(payload1);
          expect(args[1]).to.equal(payload2);
          expect(args[2]).to.equal(payload3);
          done();
        } catch (e) {
          done(e);
        }
      });

      worker.emit(eventName, payload1, payload2, payload3);
    });
  });

  describe('output formatting', function () {
    let worker;
    let f;

    beforeEach(function () {
      worker = new Worker(mockQueue, 'test', noop);
      f = (output) => worker._formatOutput(output);
    });

    it('should handle primitives', function () {
      const primitives = ['test', true, 1234, { one: 1}, [5, 6, 7, 8]];

      primitives.forEach((val) => {
        expect(f(val)).to.have.property('content_type', defaults.unknownMime);
        expect(f(val)).to.have.property('content', val);
      });
    });

    it('should accept content object without type', function () {
      const output = {
        content: 'test output'
      };

      expect(f(output)).to.have.property('content_type', defaults.unknownMime);
      expect(f(output)).to.have.property('content', output.content);
    });

    it('should accept a content type', function () {
      const output = {
        content_type: 'test type',
        content: 'test output'
      };

      expect(f(output)).to.have.property('content_type', output.content_type);
      expect(f(output)).to.have.property('content', output.content);
    });

    it('should work with no input', function () {
      expect(f()).to.have.property('content_type', defaults.unknownMime);
      expect(f()).to.have.property('content', defaults.contentBody);
    });
  });

  describe('polling for jobs', function () {
    let searchSpy;

    beforeEach(() => {
      anchorMoment = moment(anchor);
      clock = sinon.useFakeTimers(anchorMoment.valueOf());
      searchSpy = sinon.spy(mockQueue.client, 'search');
    });

    afterEach(() => {
      clock.restore();
    });

    it('should start polling for jobs after interval', function () {
      new Worker(mockQueue, 'test', noop);
      sinon.assert.notCalled(searchSpy);
      clock.tick(defaults.interval);
      sinon.assert.calledOnce(searchSpy);
    });

    it('should use interval option to control polling', function () {
      const interval = 567;
      new Worker(mockQueue, 'test', noop, { interval });
      sinon.assert.notCalled(searchSpy);
      clock.tick(interval);
      sinon.assert.calledOnce(searchSpy);
    });
  });

  describe('query for pending jobs', function () {
    let worker;
    let searchStub;

    function getSearchParams(jobtype = 'test', params = {}) {
      worker = new Worker(mockQueue, jobtype, noop, params);
      worker._getPendingJobs();
      return searchStub.firstCall.args[0];
    }

    describe('error handling', function () {
      beforeEach(() => {
      });

      it('should pass search errors', function (done) {
        searchStub = sinon.stub(mockQueue.client, 'search', () => Promise.reject());
        worker = new Worker(mockQueue, 'test', noop);
        worker._getPendingJobs()
        .then(() => done(new Error('should not resolve')))
        .catch(() => { done(); });
      });

      it('should swollow index missing errors', function (done) {
        searchStub = sinon.stub(mockQueue.client, 'search', () => Promise.reject({
          status: 404
        }));
        worker = new Worker(mockQueue, 'test', noop);
        worker._getPendingJobs()
        .then(() => { done(); })
        .catch(() => done(new Error('should not reject')));
      });

      it('should return an empty array on missing index', function (done) {
        searchStub = sinon.stub(mockQueue.client, 'search', () => Promise.reject({
          status: 404
        }));
        worker = new Worker(mockQueue, 'test', noop);
        worker._getPendingJobs()
        .then((res) => {
          try {
            expect(res).to.be.an(Array);
            expect(res).to.have.length(0);
            done();
          } catch (e) {
            done(e);
          }
        })
        .catch(() => done(new Error('should not reject')));
      });
    });

    describe('query parameters', function () {
      beforeEach(() => {
        searchStub = sinon.stub(mockQueue.client, 'search', () => Promise.resolve());
      });

      it('should query with version', function () {
        const params = getSearchParams();
        expect(params).to.have.property('version', true);
      });

      it('should query by default doctype', function () {
        const params = getSearchParams();
        expect(params).to.have.property('type', constants.DEFAULT_SETTING_DOCTYPE);
      });

      it('should query by custom doctype', function () {
        const doctype = 'custom_test';
        const params = getSearchParams('type', { doctype });
        expect(params).to.have.property('type', doctype);
      });
    });

    describe('query body', function () {
      const conditionPath = 'query.constant_score.filter.bool';
      const jobtype = 'test_jobtype';

      beforeEach(() => {
        searchStub = sinon.stub(mockQueue.client, 'search', () => Promise.resolve());
        anchorMoment = moment(anchor);
        clock = sinon.useFakeTimers(anchorMoment.valueOf());
      });

      afterEach(() => {
        clock.restore();
      });

      it('should filter unwanted source data', function () {
        const excludedFields = [ 'output.content' ];
        const { body } = getSearchParams(jobtype);
        expect(body).to.have.property('_source');
        expect(body._source).to.eql({ exclude: excludedFields });
      });

      it('should search by job type', function () {
        const { body } = getSearchParams(jobtype);
        const conditions = get(body, conditionPath);
        expect(conditions.filter).to.eql({ term: { jobtype: jobtype } });
      });

      it('should search for pending or expired jobs', function () {
        const { body } = getSearchParams(jobtype);
        const conditions = get(body, conditionPath);
        expect(conditions).to.have.property('should');

        // this works because we are stopping the clock, so all times match
        const nowTime = moment().toISOString();
        const pending = { term: { status: 'pending'} };
        const expired = { bool: { filter: [
          { term: { status: 'processing' } },
          { range: { process_expiration: { lte: nowTime } } }
        ] } };

        const pendingMatch = find(conditions.should, pending);
        expect(pendingMatch).to.not.be(undefined);

        const expiredMatch = find(conditions.should, expired);
        expect(expiredMatch).to.not.be(undefined);
      });

      it('should use default size', function () {
        const { body } = getSearchParams(jobtype);
        expect(body).to.have.property('size', defaults.size);
      });

      it('should observe the size option', function () {
        const size = 25;
        const { body } = getSearchParams(jobtype, { size });
        expect(body).to.have.property('size', size);
      });
    });
  });

  describe('claiming a job', function () {
    let params;
    let job;
    let worker;
    let updateSpy;

    beforeEach(function () {
      anchorMoment = moment(anchor);
      clock = sinon.useFakeTimers(anchorMoment.valueOf());

      params = {
        index: 'myIndex',
        type: 'test',
        id: 12345,
        version: 3
      };
      return mockQueue.client.get(params)
      .then((jobDoc) => {
        job = jobDoc;
        worker = new Worker(mockQueue, 'test', noop);
        updateSpy = sinon.spy(mockQueue.client, 'update');
      });
    });

    afterEach(() => {
      clock.restore();
    });

    it('should use version on update', function () {
      worker._claimJob(job);
      const query = updateSpy.firstCall.args[0];
      expect(query).to.have.property('index', job._index);
      expect(query).to.have.property('type', job._type);
      expect(query).to.have.property('id', job._id);
      expect(query).to.have.property('version', job._version);
    });

    it('should increment the job attempts', function () {
      worker._claimJob(job);
      const doc = updateSpy.firstCall.args[0].body.doc;
      expect(doc).to.have.property('attempts', job._source.attempts + 1);
    });

    it('should update the job status', function () {
      worker._claimJob(job);
      const doc = updateSpy.firstCall.args[0].body.doc;
      expect(doc).to.have.property('status', constants.JOB_STATUS_PROCESSING);
    });

    it('should set job expiration time', function () {
      worker._claimJob(job);
      const doc = updateSpy.firstCall.args[0].body.doc;
      const expiration = anchorMoment.add(defaults.timeout).toISOString();
      expect(doc).to.have.property('process_expiration', expiration);
    });

    it('should fail job if max_attempts are hit', function () {
      const failSpy = sinon.spy(worker, '_failJob');
      job._source.attempts = job._source.max_attempts;
      worker._claimJob(job);
      sinon.assert.calledOnce(failSpy);
    });

    it('should append error message if no existing content', function () {
      const failSpy = sinon.spy(worker, '_failJob');
      job._source.attempts = job._source.max_attempts;
      expect(job._source.output).to.be(undefined);
      worker._claimJob(job);
      const msg = failSpy.firstCall.args[1];
      expect(msg).to.contain('Max attempts reached');
      expect(msg).to.contain(job._source.max_attempts);
    });

    it('should not append message if existing output', function () {
      const failSpy = sinon.spy(worker, '_failJob');
      job._source.attempts = job._source.max_attempts;
      job._source.output = 'i have some output';
      worker._claimJob(job);
      const msg = failSpy.firstCall.args[1];
      expect(msg).to.equal(false);
    });

    it('should return true on version errors', function () {
      mockQueue.client.update.restore();
      sinon.stub(mockQueue.client, 'update').returns(Promise.reject({ statusCode: 409 }));
      return worker._claimJob(job)
      .then((res) => expect(res).to.equal(true));
    });

    it('should return false on other errors', function () {
      mockQueue.client.update.restore();
      sinon.stub(mockQueue.client, 'update').returns(Promise.reject({ statusCode: 401 }));
      return worker._claimJob(job)
      .then((res) => expect(res).to.equal(false));
    });

    it('should emit on other errors', function (done) {
      mockQueue.client.update.restore();
      sinon.stub(mockQueue.client, 'update').returns(Promise.reject({ statusCode: 401 }));

      worker.on(constants.EVENT_WORKER_JOB_CLAIM_ERROR, function (err) {
        try {
          expect(err).to.have.property('error');
          expect(err).to.have.property('job');
          expect(err).to.have.property('worker');
          expect(err.error).to.have.property('statusCode', 401);
          done();
        } catch (e) {
          done(e);
        }
      });
      worker._claimJob(job);
    });
  });

  describe('failing a job', function () {
    let job;
    let worker;
    let updateSpy;

    beforeEach(function () {
      anchorMoment = moment(anchor);
      clock = sinon.useFakeTimers(anchorMoment.valueOf());

      return mockQueue.client.get()
      .then((jobDoc) => {
        job = jobDoc;
        worker = new Worker(mockQueue, 'test', noop);
        updateSpy = sinon.spy(mockQueue.client, 'update');
      });
    });

    afterEach(() => {
      clock.restore();
    });

    it('should use version on update', function () {
      worker._failJob(job);
      const query = updateSpy.firstCall.args[0];
      expect(query).to.have.property('index', job._index);
      expect(query).to.have.property('type', job._type);
      expect(query).to.have.property('id', job._id);
      expect(query).to.have.property('version', job._version);
    });

    it('should set status to failed', function () {
      worker._failJob(job);
      const doc = updateSpy.firstCall.args[0].body.doc;
      expect(doc).to.have.property('status', constants.JOB_STATUS_FAILED);
    });

    it('should append error message if supplied', function () {
      const msg = 'test message';
      worker._failJob(job, msg);
      const doc = updateSpy.firstCall.args[0].body.doc;
      expect(doc).to.have.property('output');
      expect(doc.output).to.have.property('content', msg);
    });

    it('should return true on version mismatch errors', function () {
      mockQueue.client.update.restore();
      sinon.stub(mockQueue.client, 'update').returns(Promise.reject({ statusCode: 409 }));
      return worker._failJob(job)
      .then((res) => expect(res).to.equal(true));
    });

    it('should return false on other errors', function () {
      mockQueue.client.update.restore();
      sinon.stub(mockQueue.client, 'update').returns(Promise.reject({ statusCode: 401 }));
      return worker._failJob(job)
      .then((res) => expect(res).to.equal(false));
    });

    it('should emit on other errors', function (done) {
      mockQueue.client.update.restore();
      sinon.stub(mockQueue.client, 'update').returns(Promise.reject({ statusCode: 401 }));

      worker.on(constants.EVENT_WORKER_FAIL_UPDATE_ERROR, function (err) {
        try {
          expect(err).to.have.property('error');
          expect(err).to.have.property('job');
          expect(err).to.have.property('worker');
          expect(err.error).to.have.property('statusCode', 401);
          done();
        } catch (e) {
          done(e);
        }
      });
      worker._failJob(job);
    });

    it('should set completed time and status to failed', function () {
      const startTime = moment().valueOf();
      const msg = 'test message';
      clock.tick(100);

      worker._failJob(job, msg);
      const doc = updateSpy.firstCall.args[0].body.doc;
      expect(doc).to.have.property('output');
      expect(doc).to.have.property('status', constants.JOB_STATUS_FAILED);
      expect(doc).to.have.property('completed_at');
      const completedTimestamp = moment(doc.completed_at).valueOf();
      expect(completedTimestamp).to.be.greaterThan(startTime);
    });
  });

  describe('performing a job', function () {
    let job;
    let payload;
    let updateSpy;

    beforeEach(function () {
      payload = {
        value: random(0, 100, true)
      };

      return mockQueue.client.get({}, { payload })
      .then((jobDoc) => {
        job = jobDoc;
        updateSpy = sinon.spy(mockQueue.client, 'update');
      });
    });

    describe('worker success', function () {
      it('should call the workerFn with the payload', function (done) {
        const workerFn = function (jobPayload) {
          expect(jobPayload).to.eql(payload);
        };
        const worker = new Worker(mockQueue, 'test', workerFn);

        worker._performJob(job)
        .then(() => done());
      });

      it('should update the job with the workerFn output', function () {
        const workerFn = function (jobPayload) {
          expect(jobPayload).to.eql(payload);
          return payload;
        };
        const worker = new Worker(mockQueue, 'test', workerFn);

        return worker._performJob(job)
        .then(() => {
          sinon.assert.calledOnce(updateSpy);
          const query = updateSpy.firstCall.args[0];
          expect(query).to.have.property('index', job._index);
          expect(query).to.have.property('type', job._type);
          expect(query).to.have.property('id', job._id);
          expect(query).to.have.property('version', job._version);
          expect(query.body.doc).to.have.property('output');
          expect(query.body.doc.output).to.have.property('content_type', false);
          expect(query.body.doc.output).to.have.property('content', payload);
        });
      });

      it('should update the job status and completed time', function () {
        const startTime = moment().valueOf();
        const workerFn = function (jobPayload) {
          expect(jobPayload).to.eql(payload);
          return new Promise(function (resolve) {
            setTimeout(() => resolve(payload), 10);
          });
        };
        const worker = new Worker(mockQueue, 'test', workerFn);

        worker._performJob(job)
        .then(() => {
          sinon.assert.calledOnce(updateSpy);
          const doc = updateSpy.firstCall.args[0].body.doc;
          expect(doc).to.have.property('status', constants.JOB_STATUS_COMPLETED);
          expect(doc).to.have.property('completed_at');
          const completedTimestamp = moment(doc.completed_at).valueOf();
          expect(completedTimestamp).to.be.greaterThan(startTime);
        });
      });

      it('should emit completion event', function (done) {
        const worker = new Worker(mockQueue, 'test', noop);

        worker.once(constants.EVENT_WORKER_COMPLETE, (workerJob) => {
          try {
            expect(workerJob).to.have.property('id');
            expect(workerJob).to.have.property('index');
            expect(workerJob).to.have.property('type');
            expect(workerJob).to.have.property('output');
            expect(workerJob.output).to.have.property('content');
            expect(workerJob.output).to.have.property('content_type');
            expect(workerJob).to.not.have.property('_source');
            done();
          } catch (e) {
            done(e);
          }
        });

        worker._performJob(job);
      });
    });

    describe('worker failure', function () {
      it('should append error output to job', function () {
        const workerFn = function () {
          throw new Error('test error');
        };
        const worker = new Worker(mockQueue, 'test', workerFn);
        const failStub = sinon.stub(worker, '_failJob');

        return worker._performJob(job)
        .then(() => {
          sinon.assert.calledOnce(failStub);
          sinon.assert.calledWith(failStub, job, 'Error: test error');
        });
      });

      it('should handle async errors', function () {
        const workerFn = function () {
          return new Promise((resolve, reject) => {
            reject(new Error('test error'));
          });
        };
        const worker = new Worker(mockQueue, 'test', workerFn);
        const failStub = sinon.stub(worker, '_failJob');

        return worker._performJob(job)
        .then(() => {
          sinon.assert.calledOnce(failStub);
          sinon.assert.calledWith(failStub, job, 'Error: test error');
        });
      });

      it('should handle rejecting with strings', function () {
        const errorMessage = 'this is a string error';
        const workerFn = function () {
          return new Promise((resolve, reject) => {
            reject(errorMessage);
          });
        };
        const worker = new Worker(mockQueue, 'test', workerFn);
        const failStub = sinon.stub(worker, '_failJob');

        return worker._performJob(job)
        .then(() => {
          sinon.assert.calledOnce(failStub);
          sinon.assert.calledWith(failStub, job, errorMessage);
        });
      });

      it('should handle empty rejection', function (done) {
        const workerFn = function () {
          return new Promise((resolve, reject) => {
            reject();
          });
        };
        const worker = new Worker(mockQueue, 'test', workerFn);

        worker.once(constants.EVENT_WORKER_JOB_EXECUTION_ERROR, (err) => {
          try {
            expect(err).to.have.property('error');
            expect(err).to.have.property('job');
            expect(err).to.have.property('worker');
            expect(err.error).to.have.property('type', 'UnspecifiedWorkerError');
            done();
          } catch (e) {
            done(e);
          }
        });

        worker._performJob(job);
      });
    });
  });

  describe('job timing', function () {
    function getFailStub(worker) {
      return sinon.stub(worker, '_failJob').returns(Promise.resolve());
    }

    it('should timeout if not complete within allotted time', function (done) {
      const timeout = 20;
      const workerFn = function () {
        return new Promise(function (resolve) {
          setTimeout(() => {
            resolve();
          }, timeout * 2);
        });
      };
      const worker = new Worker(mockQueue, 'test', workerFn);
      const failStub = getFailStub(worker);

      const job = {
        _id: 'testTimeoutJob',
        _source: {
          timeout: timeout,
          payload: 'test'
        }
      };

      let performJobPromise;

      // check for timeout event
      worker.once(constants.EVENT_WORKER_JOB_TIMEOUT_ERROR, (err) => {
        try {
          expect(err).to.have.property('error');
          expect(err).to.have.property('job');
          expect(err).to.have.property('worker');
          expect(err.error).to.have.property('type', 'WorkerTimeoutError');
          performJobPromise.then(() => {
            sinon.assert.notCalled(failStub);
            done();
          }).catch(done);
        } catch (e) {
          done(e);
        }
      });

      // fire of the job worker
      performJobPromise = worker._performJob(job);
    });

    it('should fail if worker fails', function () {
      const timeout = 20;
      const workerFn = function () {
        return new Promise(function (resolve, reject) {
          setTimeout(() => {
            reject();
          }, timeout / 2);
        });
      };
      const worker = new Worker(mockQueue, 'test', workerFn);
      const failStub = getFailStub(worker);

      const job = {
        _id: 'testTimeoutJob',
        _source: {
          timeout: timeout,
          payload: 'test'
        }
      };

      return worker._performJob(job)
      .then(() => {
        sinon.assert.calledOnce(failStub);
      });
    });
  });

});
