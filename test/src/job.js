import events from 'events';
import expect from 'expect.js';
import sinon from 'sinon';
import _ from 'lodash';
import Job from '../../lib/job';
import * as elasticsearchMock from '../fixtures/elasticsearch';

describe('Job Class', function () {
  let mockQueue;

  beforeEach(function () {
    mockQueue = {
      index: 'test',
      client: new elasticsearchMock.Client(),
    };
  });

  it('should be an event emitter', function () {
    const job = new Job(mockQueue, 'test', {});
    expect(job).to.be.an(events.EventEmitter);
  });

  describe('invalid construction', function () {
    it('should throw with a missing type', function () {
      const init = () => new Job(mockQueue);
      expect(init).to.throwException(/type.+string/i);
    });

    it('should throw with an invalid type', function () {
      const init = () => new Job(mockQueue, { 'not a string': true });
      expect(init).to.throwException(/type.+string/i);
    });

    it('should throw with an invalid payload', function () {
      const init = () => new Job(mockQueue, 'type1', [1, 2, 3]);
      expect(init).to.throwException(/plain.+object/i);
    });
  });

  describe('construction', function () {
    const PENDING = 0;
    let type;
    let payload;
    let options;

    function validateDoc(spy) {
      expect(spy.callCount).to.be(1);
      const spyCall = spy.getCall(0);
      return spyCall.args[0];
    }

    beforeEach(function () {
      type = 'type1';
      payload = { id: '123' };
      options = { timeout: 1234, test: 'options' };
      sinon.spy(mockQueue.client, 'index');
    });

    it('should index the payload', function () {
      new Job(mockQueue, type, payload);
      const newDoc = validateDoc(mockQueue.client.index);
      expect(newDoc).to.have.property('index', mockQueue.index);
      expect(newDoc).to.have.property('type', type);
      expect(newDoc).to.have.property('body');
      expect(newDoc.body).to.have.property('payload', payload);
    });

    it('should index any optional params', function () {
      new Job(mockQueue, type, payload, options);
      const newDoc = validateDoc(mockQueue.client.index);
      expect(newDoc.body).to.have.property('options');
    });

    it('should index timeout value from options', function () {
      new Job(mockQueue, type, payload, options);
      const newDoc = validateDoc(mockQueue.client.index);
      expect(newDoc.body).to.have.property('timeout', options.timeout);
    });

    it('should not use timeout as an option', function () {
      new Job(mockQueue, type, payload, options);
      const newDoc = validateDoc(mockQueue.client.index);
      expect(newDoc.body.options).to.eql(_.omit(options, [ 'timeout' ]));
    });

    it('should set event times', function () {
      new Job(mockQueue, type, payload, options);
      const newDoc = validateDoc(mockQueue.client.index);
      expect(newDoc.body).to.have.property('created');
      expect(newDoc.body).to.have.property('started');
      expect(newDoc.body).to.have.property('completed');
    });

    it('should set attempt count', function () {
      new Job(mockQueue, type, payload, options);
      const newDoc = validateDoc(mockQueue.client.index);
      expect(newDoc.body).to.have.property('attempts');
    });

    it('should set status as pending', function () {
      new Job(mockQueue, type, payload, options);
      const newDoc = validateDoc(mockQueue.client.index);
      expect(newDoc.body).to.have.property('status', PENDING);
    });
  });
});
