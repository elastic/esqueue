import { DEFAULT_SETTING_DOCTYPE } from '../constants';

const schema = {
  jobtype: { type: 'keyword' },
  payload: { type: 'object', enabled: false },
  priority: { type: 'byte' },
  timeout: { type: 'long' },
  process_expiration: { type: 'date' },
  created_by: { type: 'keyword' },
  created_at: { type: 'date' },
  started_at: { type: 'date' },
  completed_at: { type: 'date' },
  attempts: { type: 'short' },
  max_attempts: { type: 'short' },
  status: { type: 'keyword' },
  output: {
    type: 'object',
    properties: {
      content_type: { type: 'keyword', index: false },
      content: { type: 'object', enabled: false }
    }
  }
};

export default function createIndex(client, indexName, doctype = DEFAULT_SETTING_DOCTYPE, settings = {}) {
  const indexBody = { mappings : {} };
  indexBody.mappings[doctype] = { properties: schema };

  const body = Object.assign({}, { settings }, indexBody);

  return client.indices.exists({
    index: indexName,
  })
  .then((exists) => {
    if (!exists) {
      return client.indices.create({
        ignore: 400,
        index: indexName,
        body: body
      })
      .then(() => true);
    }
    return exists;
  });
}
