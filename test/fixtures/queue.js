import events from 'events';

class MockQueue extends events.EventEmitter {
  constructor() {
    super();
  }

  setClient(client) {
    this.client = client;
  }
}

export default MockQueue;