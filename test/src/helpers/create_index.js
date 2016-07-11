import expect from 'expect.js';
import sinon from 'sinon';
import createIndex from '../../../lib/helpers/create_index';
import elasticsearchMock from '../../fixtures/elasticsearch';
import { DEFAULT_SETTING_DOCTYPE } from '../../../lib/constants';

describe('Create Index', function () {

  describe('Does not exist', function () {
    let client;
    let createSpy;

    beforeEach(function () {
      client = new elasticsearchMock.Client();
      createSpy = sinon.spy(client.indices, 'create');
    });

    it('should return true', function () {
      const indexName = 'test-index';
      const result = createIndex(client, indexName);

      return result
      .then((exists) => expect(exists).to.be(true));
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

    it('should create the type mappings', function () {
      const indexName = 'test-index';
      const docType = DEFAULT_SETTING_DOCTYPE;
      const result = createIndex(client, indexName);

      return result
      .then(function () {
        const payload = createSpy.getCall(0).args[0];
        sinon.assert.callCount(createSpy, 1);
        expect(payload).to.have.property('body');
        expect(payload.body).to.have.property('mappings');
        expect(payload.body.mappings).to.have.property(docType);
        expect(payload.body.mappings[docType]).to.have.property('properties');
      });
    });

    it('should accept a custom doctype', function () {
      const indexName = 'test-index';
      const docType = 'my_type';
      const result = createIndex(client, indexName, docType);

      return result
      .then(function () {
        const payload = createSpy.getCall(0).args[0];
        sinon.assert.callCount(createSpy, 1);
        expect(payload).to.have.property('body');
        expect(payload.body).to.have.property('mappings');
        expect(payload.body.mappings).to.have.property(docType);
        expect(payload.body.mappings[docType]).to.have.property('properties');
      });
    });
  });

  describe('Does exist', function () {
    let client;
    let createSpy;

    beforeEach(function () {
      client = new elasticsearchMock.Client();
      sinon.stub(client.indices, 'exists', () => Promise.resolve(true));
      createSpy = sinon.spy(client.indices, 'create');
    });

    it('should return true', function () {
      const indexName = 'test-index';
      const result = createIndex(client, indexName);

      return result
      .then((exists) => expect(exists).to.be(true));
    });

    it('should not create the index', function () {
      const indexName = 'test-index';
      const result = createIndex(client, indexName);

      return result
      .then(function () {
        sinon.assert.callCount(createSpy, 0);
      });
    });

  });
});
