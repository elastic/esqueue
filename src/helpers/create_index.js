var schema = {
  payload: { type: 'object', enabled: false },
  priority: { type: 'short' },
  timeout: { type: 'long' },
  process_expiration: { type: 'date' },
  created_by: { type: 'string', index: 'not_analyzed' },
  created_at: { type: 'date' },
  started_at: { type: 'date' },
  completed_at: { type: 'date' },
  attempts: { type: 'short' },
  max_attempts: { type: 'short' },
  status: { type: 'keyword' },
  output: {
    type: 'object',
    properties: {
      content_type: { type: 'string', index: 'not_analyzed' },
      content: { type: 'object', enabled: false }
    }
  }
};

export default function createIndex(client, indexName) {
  const indexBody = {
    mappings: {
      _default_: {
        properties: schema
      }
    }
  };

  return client.indices.exists({
    index: indexName,
  })
  .then((exists) => {
    if (!exists) {
      return client.indices.create({
        ignore: 400,
        index: indexName,
        body: indexBody
      })
      .then(() => true);
    }
    return exists;
  });
}
