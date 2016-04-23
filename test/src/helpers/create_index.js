import expect from 'expect.js';
import sinon from 'sinon';
import createIndex from '../../../lib/helpers/create_index';
import elasticsearchMock from '../../fixtures/elasticsearch';

describe('Create Index', function () {
  let client;
  let createSpy;

  beforeEach(function () {
    client = new elasticsearchMock.Client();
    createSpy = sinon.spy(client.indices, 'create');
  });

  it('should create the index', function () {
    const indexName = 'test-index';
    const result = createIndex(client, indexName);

    return result
    .then(function () {
      sinon.assert.callCount(createSpy, 1);
      expect(createSpy.getCall(0).args[0]).to.have.property('index', indexName);
    });
  });

  it('should create the default mappings', function () {
    const indexName = 'test-index';
    const result = createIndex(client, indexName);

    return result
    .then(function () {
      const payload = createSpy.getCall(0).args[0];
      sinon.assert.callCount(createSpy, 1);
      expect(payload).to.have.property('body');
      expect(payload.body).to.have.property('mappings');
      expect(payload.body.mappings).to.have.property('_default_');
      expect(payload.body.mappings._default_).to.have.property('properties');
    });
  });
});
