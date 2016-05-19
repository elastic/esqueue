# Changelog

Notable changes to the esqueue project. Pay attention to `[BREAKING]` changes when upgrading.

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