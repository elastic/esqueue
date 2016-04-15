import expect from 'expect.js';
import proxyquire from 'proxyquire';
import * as elasticsearchMock from '../../fixtures/elasticsearch';

const createClient = proxyquire.noPreserveCache()('../../../lib/helpers/create_client', {
  elasticsearch: elasticsearchMock
});

describe('Create client helper', function () {
  it('should have a client', function () {
    const options = {
      host: 'http://localhost:9200'
    };
    const client = createClient(options);

    expect(client).to.be.a(elasticsearchMock.Client);
  });

  it('should use passed in instance', function () {
    const clientInstance = new elasticsearchMock.Client();
    const client = createClient(clientInstance);

    expect(client).to.equal(clientInstance);
  });
});
