import events from 'events';
import expect from 'expect.js';
import sinon from 'sinon';
import Job from '../../lib/job';
import * as elasticsearchMock from '../fixtures/elasticsearch';

describe('Jobs', function () {
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
    let type;
    let payload;
    let options;

    beforeEach(function () {
      type = 'type1';
      payload = { id: '123' };
      options = { timeout: 1234 };
      sinon.stub(mockQueue.client, 'index');
    });

    it('should index the payload', function () {
      new Job(mockQueue, type, payload);

      sinon.assert.calledOnce(mockQueue.client.index);
      sinon.assert.calledWith(mockQueue.client.index, {
        index: mockQueue.index,
        type: type,
        body: {
          payload: payload
        }
      });
    });

    it('should index any optional params', function () {
      new Job(mockQueue, type, payload, options);

      sinon.assert.calledOnce(mockQueue.client.index);
      sinon.assert.calledWith(mockQueue.client.index, {
        index: mockQueue.index,
        type: type,
        body: Object.assign(options, {
          payload: payload
        })
      });
    });

    it('should not allow options to clobber payload', function () {
      options = { payload: 1234 };
      new Job(mockQueue, type, payload, options);

      sinon.assert.calledOnce(mockQueue.client.index);
      sinon.assert.calledWith(mockQueue.client.index, {
        index: mockQueue.index,
        type: type,
        body: {
          payload: payload
        }
      });
    });
  });
});
