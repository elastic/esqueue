import elasticsearch from 'elasticsearch';

export default function createClient(options) {
  let client;

  if (options instanceof elasticsearch.Client) {
    client = options;
  } else {
    client = new elasticsearch.Client(options);
  }

  return client;
};
