[![Build Status](https://travis-ci.org/w33ble/elastique.svg?branch=master)](https://travis-ci.org/w33ble/elastique) [![Coverage Status](https://coveralls.io/repos/github/w33ble/elastique/badge.svg?branch=master)](https://coveralls.io/github/w33ble/elastique?branch=master)

# Elasticsearch-powered job queue

WIP, working title

## Usage

Still not ready for publishing to npm...

### Creating a queue

The first step is to create a new Queue instance. This is your point of entry, is the way to create and coordinate jobs and workers.

```
var index = 'my-index';
var options = {};

var queue = new Elastique(index, options);
```

The queue instance is an event emitter, so you can listen for `error` events as you would any other event emitter.

`index` is the Elasticsearch *root* index you plan to use. The queue will create time-based indices, using date strings, based on the `interval` you specify (see options below).

Option | Default | Description
------ | ----------- | -------
interval | `week` | Valid choices are `year`, `month`, `week`, `day`, `hour`, and even `minute`. | `week`
timeout | `10000` | The default job timeout, in `ms`. If workers take longer than this, the job is re-queued for another worker to complete it.
client | | Options to use when creating a new client instance - see [the elasticsearch-js docs](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/configuration.html). If you rather use your own client instance, just pass it in here instead.


### Creating a job

The end result of creating a new job is a new document in Elasticsearch, which workers will search for and attempt to perform an action based on.

```
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

### Creating a worker

Workers are functions that take a job's `payload`, perform an action, and optionally write their output to the `job` document. They have access to the underlying job instance, just the information that is indexed to Elasticsearch.

```
var type = 'example';
var workerFn = function (payload, cb) {
  // Do some work, using the payload if required
  cb(err, output);
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

The worker's `output` can either be the raw output from the job, or on object that specifies the output's content type.

```
var workerFn1 = function (payload, cb) {
  // Do some work, using the payload if required
  var output = new Date().toString();
  cb(null, output);
};

var workerFn2 = function (payload, cb) {
  // Do some work, using the payload if required
  var output = {
    content_type: 'text/plain',
    content: new Date().toString();
  };
  cb(null, output);
};

```

Both are valid, but the `workerFn2` is likely to be more useful when retrieving the output, as the application doesn't need to know or make assumptions about the type of content the worker returned.

## Scaling the queue

Scaling the queue, both in terms of creating jobs and spinning up workers, is as simple as creating a new queue on another machine and pointing it at the same index.