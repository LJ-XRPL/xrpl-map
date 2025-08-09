import { Client } from 'xrpl';

// Use QuickNode URL from environment variable, fallback to default Ripple server
const xrplEndpoint = process.env.REACT_APP_QUICKNODE_URL || 'wss://s1.ripple.com';
const client = new Client(xrplEndpoint);

console.log('🌐 XRPL connecting to:', xrplEndpoint);
let isConnecting = false;

client.on('connected', () => {
  console.log('🟢 XRPL client connected');
  isConnecting = false;
});

client.on('disconnected', (code) => {
  console.log(`🔴 XRPL client disconnected, code: ${code}`);
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

// Get recent transactions for an account
export const getAccountTransactions = async (address, limit = 10) => {
  if (!client.isConnected()) {
    console.warn('Cannot get transactions, client not connected');
    return [];
  }

  try {
    
    const response = await client.request({
      command: 'account_tx',
      account: address,
      limit: limit,
      ledger_index_min: -1,
      ledger_index_max: -1,
      forward: false
    });

    const transactions = response.result.transactions || [];
    
    return transactions;
  } catch (error) {
    console.error(`❌ Error fetching transactions for ${address}:`, error.message);
    return [];
  }
};

// Start polling for transactions
export const startTransactionPolling = (addresses, onTransaction, intervalMs = 10000) => {
  const seenTransactions = new Set();
  
  const pollTransactions = async () => {
    console.log(`🔄 Polling transactions for ${addresses.length} issuers...`);
    
    for (const address of addresses) {
      try {
        const transactions = await getAccountTransactions(address, 10);
        
        for (const txData of transactions) {
          // The XRPL response structure is: { tx_json: {...}, meta: {...}, hash: "..." }
          const tx = txData.tx_json;
          const hash = txData.hash;
          
          if (!tx || !hash) {
            console.warn('⚠️ Invalid transaction structure:', txData);
            continue;
          }
          
          // Skip if we've already seen this transaction
          if (seenTransactions.has(hash)) {
            continue;
          }
          
          seenTransactions.add(hash);
          
          // Call the callback with the transaction
          onTransaction({
            transaction: tx,
            meta: txData.meta,
            validated: true,
            hash: hash
          });
        }
      } catch (error) {
        console.error(`❌ Error polling transactions for ${address}:`, error.message);
      }
    }
  };

  // Initial poll after 3 seconds
  console.log('⏰ Starting transaction polling in 3 seconds...');
  setTimeout(pollTransactions, 3000);
  
  // Set up interval
  const intervalId = setInterval(pollTransactions, intervalMs);
  
  return () => {
    console.log('🛑 Stopping transaction polling');
    clearInterval(intervalId);
  };
};

export const subscribeToTransactions = (addresses, onTransaction) => {
  return startTransactionPolling(addresses, onTransaction);
};

export const unsubscribeFromTransactions = (stopPolling) => {
  if (typeof stopPolling === 'function') {
    stopPolling();
  }
};