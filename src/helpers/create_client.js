import elasticsearch from 'elasticsearch';

export default function createClient(options) {
  let client;

  if (isClient(options)) {
    client = options;
  } else {
    client = new elasticsearch.Client(options);
  }

  return client;
};

export function isClient(client) {
  // if there's a transport property, assume it's a client instance
  return !!client.transport;
}
