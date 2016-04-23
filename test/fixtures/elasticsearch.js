import { uniqueId } from 'lodash';

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
    _id: uniqueId('testDoc'),
    _version: 1,
    _shards: { total: shardCount, successful: shardCount, failed: 0 },
    created: true
  });
};

Client.prototype.ping = function () {
  return Promise.resolve();
};

export default {
  Client: Client
};
