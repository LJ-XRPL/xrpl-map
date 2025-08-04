import { Client } from 'xrpl';

const client = new Client('wss://s1.ripple.com');
let isConnecting = false;

client.on('connected', () => {
  console.log('XRPL client connected');
  isConnecting = false;
});

client.on('disconnected', (code) => {
  console.log(`XRPL client disconnected, code: ${code}`);
  isConnecting = false;
});

export const connect = async () => {
  if (client.isConnected() || isConnecting) {
    return;
  }
  isConnecting = true;
  await client.connect();
};

export const disconnect = async () => {
  if (client.isConnected()) {
    await client.disconnect();
  }
};

export const subscribeToTransactions = (addresses, onTransaction) => {
  if (!client.isConnected()) {
    console.warn('Cannot subscribe, client not connected');
    return;
  }
  
  client.request({
    command: 'subscribe',
    accounts: addresses,
  });

  client.on('transaction', (tx) => {
    if (!tx.validated) {
      return;
    }
    onTransaction(tx);
  });
};

export const unsubscribeFromTransactions = (addresses) => {
  if (!client.isConnected()) {
    return;
  }
  
  client.request({
    command: 'unsubscribe',
    accounts: addresses,
  });
};
