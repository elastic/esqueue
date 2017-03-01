# Changelog

Notable changes to the esqueue project. Pay attention to `[BREAKING]` changes when upgrading in pre-1.0 versions. As of 1.0, breaking changes will only happen in major versions.

## v2.0.1

- Don't swallow 400 errors at index creation

## v2.0.0

- Change `sting` mappings to `keyword`, since [string is deprecated and is being removed from elasticsearch](https://www.elastic.co/guide/en/elasticsearch/reference/current/breaking_50_mapping_changes.html#_literal_string_literal_fields_replaced_by_literal_text_literal_literal_keyword_literal_fields)

## v1.0.0

- [BREAKING] elasticsearch package is a peerDependency now, since it's not required if you are using the `client` option when instantiating the queue
- Remove lodash.isPlainObject and lodash.omit dependencies, use customer helpers
- Remove errors dependency, use custom errors

## v0.12.2

- Fixed issue where destoyed workers could continue running

## v0.12.1

- Move repo to elastic org

## v0.12.0

- [BREAKING] Rename general queue error to `queue:error` instead of simply `error`
- Remove the `timeout` parameter from the ping operation on intiialization

## v0.11.1

- Apache 2.0 license file

## v0.11.0

- Contrary to the [source filtering docs](https://www.elastic.co/guide/en/elasticsearch/reference/2.4/search-request-source-filtering.html), use plural form of include/exclude due to breaking change in Elasticsearch 5.0

## v0.10.5

- Apache 2.0 license file

## v0.10.4

- Allow index pattern date separator to be customized

## v0.10.3

- Bump moment.js version, fix [DoS issue](https://nodesecurity.io/advisories/55)

## v0.10.2

- Allow passing headers on job creation, useful for auth and proxy traversal

## v0.10.1

- Refresh Elasticsearch index when creating job, fire event after refresh

## v0.10.0

- [BREAKING] Remove header passing on job creation
- [BREAKING] Job instantiation requires full queue instance
- Expose event names in constants
- Emit on Worker success conditions as well as errors
- Worker and Job emits on the Queue instance

## v0.9.0

- [BREAKING] Rename timeout error event
- Fix worker timeout condition
- Fix issue where a worker error was not an instance of Error, or lacked a `toString()` method
- Allow specifying option to pass to elasticsearch client on index creation 

## v0.8.0

- [BREAKING] Don't throw on worker failures
- [BREAKING] Don't emit errors on queue instance

## v0.7.0

- [BREAKING] Don't throw on job creation failures

## v0.6.1

- Allow headers option on job creation, passed to elasticsearch index request

## v0.6.0

- Allow client instance to be passed when creating a job
- Allow client instance to be passed when creating a worker
- Prefer any 4.x version of node for development

## v0.5.0

- [BREAKING] Change default `created_by` value to `false` (formerly `null`)

## v0.4.1

- Use `filter` instead of `must` to query for outstanding jobs

## v0.4.0

- [BREAKING] Change `priority` mapping to *byte*
- Exclude `output.content` from _source when query jobs
- Add optional `created_by` value to job documents

## v0.3.2

- Misisng indiced returns empty array (fixed errors in v0.3.1)

## v0.3.1

- Ignore missing indices when looking for jobs

## v0.3.0

- [BREAKING] Use `jobtype` field to control document indexing and lookup (instead of document `_type`)

## v0.2.2

- Swollow errors when saving job output
- Set `process_expiration` value (prevents upstream Elasticsearch error in alpha builds)
- Update npm package

## v0.2.1

- Use `esqueue` namespace for debugging

## v0.2.0

- [BREAKING] Async jobs should return promises, not use callbacks
- Remove bluebird dependency
- Only require specific lodash modules, instead of the whole library

## v0.1.0

- Initial release
