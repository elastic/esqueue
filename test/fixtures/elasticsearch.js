import { uniqueId, times, random } from 'lodash';
import elasticsearch from 'elasticsearch';

function Client() {
  this.indices = {
    create: () => Promise.resolve({ acknowledged: true }),
    exists: () => Promise.resolve(false),
  };

  this.transport = {};
}

Client.prototype.index = function (params = {}) {
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

Client.prototype.get = function (params = {}, source = false) {
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

Client.prototype.search = function (params = {}, count = 5, source = {}) {
  const hits = times(count, () => {
    return {
      _index: params.index || 'index',
      _type: params.type || 'type',
      _id: uniqueId('documentId'),
      _version: random(1, 5),
      _score: null,
      _source: Object.assign({
        created_at: new Date().toString(),
        number: random(0, count, true)
      }, source)
    };
  });
  return Promise.resolve({
    took: random(0, 10),
    timed_out: false,
    _shards: {
      total: 5,
      successful: 5,
      failed: 0
    },
    hits: {
      total: count,
      max_score: null,
      hits: hits
    }
  });
};

Client.prototype.update = function (params = {}) {
  var shardCount = 2;
  return Promise.resolve({
    _index: params.index || 'index',
    _type: params.type || 'type',
    _id: params.id || uniqueId('testDoc'),
    _version: params.version + 1 || 2,
    _shards: { total: shardCount, successful: shardCount, failed: 0 },
    created: true
  });
};

export default {
  Client: Client,
  errors: elasticsearch.errors
};
