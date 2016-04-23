import expect from 'expect.js';
import proxyquire from 'proxyquire';
import elasticsearchMock from '../../fixtures/elasticsearch';

const module = proxyquire.noPreserveCache()('../../../lib/helpers/es_client', {
  elasticsearch: elasticsearchMock
});

const createClient = module.default;
const { isClient } = module;

describe('Create client helper', function () {
  it('should have a client', function () {
    const options = {
      host: 'http://localhost:9200'
    };
    const client = createClient(options);
    expect(isClient(client)).to.be.ok();
  });

  it('should use passed in instance', function () {
    const clientInstance = new elasticsearchMock.Client();
    const client = createClient(clientInstance);
    expect(client).to.equal(clientInstance);
  });
});
