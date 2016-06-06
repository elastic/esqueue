[![Build Status](https://travis-ci.org/w33ble/esqueue.svg?branch=master)](https://travis-ci.org/w33ble/esqueue) [![codecov](https://codecov.io/gh/w33ble/esqueue/branch/master/graph/badge.svg)](https://codecov.io/gh/w33ble/esqueue)

# esqueue

`esqueue` is an Elasticsearch-powered job queue

## Installation

`npm install esqueue`

## Usage

Simply include the module in your application.

`var Esqueue = require('esqueue');`

### Creating a queue

The first step is to create a new Queue instance. This is your point of entry, is the way to create and coordinate jobs and workers.

```js
var index = 'my-index';
var options = {};

var queue = new Esqueue(index, options);
```

The queue instance is an event emitter, so you can listen for `error` events as you would any other event emitter.

`index` is the Elasticsearch *root* index you plan to use. The queue will create time-based indices, using date strings, based on the `interval` you specify (see options below).

Option | Default | Description
------ | ----------- | -------
interval | `week` | Valid choices are `year`, `month`, `week`, `day`, `hour`, and even `minute`. | `week`
timeout | `10000` | The default job timeout, in `ms`. If workers take longer than this, the job is re-queued for another worker to complete it.
doctype | `esqueue` | The doctype to use in Elasticsearch
client | | Options to use when creating a new client instance - see [the elasticsearch-js docs](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/configuration.html). If you rather use your own client instance, just pass it in here instead.


### Creating a job

The end result of creating a new job is a new document in Elasticsearch, which workers will search for and attempt to perform an action based on.

```js
var type = 'example';
var payload = {};
var options = {};

var job = queue.addJob(type, payload, options);
```

The job instance is an event emitter, so you can listen for `error` events as you would any other event emitter.

`type` can be any string, and is simply a way to categorize multiple different jobs that operate on the same queue.

`payload` here can be anything that can be converted into a JSON string. This is meant for information that a worker will need to perform the task and complete the job.

Option | Default | Description
------ | ----------- | -------
timeout | `10000` | Timeout for the job, if different than the timeout configured on the queue.
max_attempts | `3` | Number of times to re-trying assigning the job to a worker before giving up and failing.
priority | `0` | Used to move jobs up the queue. Uses nice values from `-20` to `20`.
created_by | null | Used to filter job documents by a creator identifier; meant to be consumed by external applications.
client | | Alternative elasticsearch client instance, if you need to use one other than what the queue was created with.

### Creating a worker

Workers are functions that take a job's `payload`, perform an action, and optionally provide output. If output is returned, it will be written to the `job` document. Workers *do not* have access to the underlying job instance, just the job information that is indexed to Elasticsearch.

```js
var type = 'example';
var workerFn = function (payload) {
  // Do some work, using the payload if required
  return 'output';
};
var options = {};

var worker = queue.registerWorker(type, workerFn, options);
```

If you need to do async work, simply return a Promise. To handle errors, either throw or reject the returned Promise.

```js
var type = 'example';
var workerFn = function (payload) {
  // Do some work, using the payload if required
  return new Promise(function(resolve, reject) {
    doAsyncWork(function (err, result) {
      if (err) return reject(err);
      resolve(results);
    })
  })
};
var options = {};

var worker = queue.registerWorker(type, workerFn, options);
```

The worker instance is an event emitter, so you can listen for `error` events as you would any other event emitter.

`type` can be any string, and is used to look for jobs with the same `type` value.

`payload` is the information attached to the job.

Option | Default | Description
------ | ----------- | -------
interval | `1500` | Time, in `ms` to poll for new jobs in the queue.
size | `10` | Number of records to return when polling for new jobs. Higher values may result in less Elasticsearch requests, but may also take longer to execute. A bit of tuning based on the number of workers you have my be required here.
client | | Alternative elasticsearch client instance, if you need to use one other than what the queue was created with.

The worker's `output` can either be the raw output from the job, or on object that specifies the output's content type.

```js
var workerFn1 = function (payload) {
  // Do some work, using the payload if required
  var output = new Date().toString();
  return output;
};

var workerFn2 = function (payload) {
  // Do some work, using the payload if required
  var output = {
    content_type: 'text/plain',
    content: new Date().toString();
  };
  return output;
};

var asyncWorker = function (payload) {
  // Do some work, using the payload if required
  return Promise.resolve({
    content_type: 'text/plain',
    content: new Date().toString();
  })
};

```

All of the above are valid. `workerFn2` and `asyncWorker` are likely to be more useful when retrieving the output, as the application doesn't need to know or make assumptions about the type of content the worker returned. Note that returning a Promise is all that's required for an async result in the worker functions.

## Scaling the queue

Scaling the queue, both in terms of creating jobs and spinning up workers, is as simple as creating a new queue on another machine and pointing it at the same index.