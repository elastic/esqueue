import { uniqueId } from 'lodash';
import elasticsearch from 'elasticsearch';

function Client() {
  this.indices = {
    create: () => Promise.resolve({ acknowledged: true }),
    exists: () => Promise.resolve(false),
  };

  this.transport = {};
}

Client.prototype.index = function (params) {
  var shardCount = 2;
  return Promise.resolve({
    _index: params.index || 'index',
    _type: params.type || 'type',
    _id: params.id || uniqueId('testDoc'),
    _version: 1,
    _shards: { total: shardCount, successful: shardCount, failed: 0 },
    created: true
  });
};

Client.prototype.ping = function () {
  return Promise.resolve();
};

Client.prototype.get = function (params, source) {
  if (params === elasticsearch.errors.NotFound) return elasticsearch.errors.NotFound;

  const _source = source || {
    payload: {
      id: 'sample-job-1',
      now: 'Mon Apr 25 2016 14:13:04 GMT-0700 (MST)'
    },
    priority: 10,
    timeout: 10000,
    created_at: '2016-04-25T21:13:04.738Z',
    attempts: 0,
    max_attempts: 3,
    status: 'pending'
  };

  return {
    _index: params.index,
    _type: params.type,
    _id: params.id || 'AVRPRLnlp7Ur1SZXfT-T',
    _version: params.version || 1,
    found: true,
    _source: _source
  };
};

Client.prototype.search = function (params) {
  return Promise.resolve();
};

export default {
  Client: Client,
  errors: elasticsearch.errors
};
