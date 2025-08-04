import { Client } from 'xrpl';

const client = new Client('wss://s1.ripple.com');
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
    // Only log for BBRL and EUROP issuers
    if (address === 'rH5CJsqvNqZGxrMyGaqLEoMWRYcVTAPZMt') {
      console.log(`🔍 Fetching transactions for BBRL issuer: ${address}`);
    } else if (address === 'rMkEuRii9w9uBMQDnWV5AA43gvYZR9JxVK') {
      console.log(`🔍 Fetching transactions for EUROP issuer: ${address}`);
    }
    
    const response = await client.request({
      command: 'account_tx',
      account: address,
      limit: limit,
      ledger_index_min: -1,
      ledger_index_max: -1,
      forward: false
    });

    const transactions = response.result.transactions || [];
    
    // Only log for BBRL and EUROP issuers
    if (address === 'rH5CJsqvNqZGxrMyGaqLEoMWRYcVTAPZMt') {
      console.log(`📊 Found ${transactions.length} transactions for BBRL issuer`);
      
      // Debug: log the first transaction structure
      if (transactions.length > 0) {
        console.log('🔍 First BBRL transaction structure:', JSON.stringify(transactions[0], null, 2));
      }
    } else if (address === 'rMkEuRii9w9uBMQDnWV5AA43gvYZR9JxVK') {
      console.log(`📊 Found ${transactions.length} transactions for EUROP issuer`);
      
      // Debug: log the first transaction structure
      if (transactions.length > 0) {
        console.log('🔍 First EUROP transaction structure:', JSON.stringify(transactions[0], null, 2));
      }
    }
    
    return transactions;
  } catch (error) {
    // Only log errors for BBRL and EUROP issuers
    if (address === 'rH5CJsqvNqZGxrMyGaqLEoMWRYcVTAPZMt') {
      console.error(`❌ Error fetching transactions for BBRL ${address}:`, error.message);
    } else if (address === 'rMkEuRii9w9uBMQDnWV5AA43gvYZR9JxVK') {
      console.error(`❌ Error fetching transactions for EUROP ${address}:`, error.message);
    }
    return [];
  }
};

// Start polling for transactions
export const startTransactionPolling = (addresses, onTransaction, intervalMs = 10000) => {
  const seenTransactions = new Set();
  
  const pollTransactions = async () => {
    // Only log polling activity for BBRL and EUROP
    const bbrlAddress = 'rH5CJsqvNqZGxrMyGaqLEoMWRYcVTAPZMt';
    const europAddress = 'rMkEuRii9w9uBMQDnWV5AA43gvYZR9JxVK';
    if (addresses.includes(bbrlAddress) || addresses.includes(europAddress)) {
      console.log('🔄 Polling for BBRL and EUROP transactions...');
    }
    
    for (const address of addresses) {
      try {
        const transactions = await getAccountTransactions(address, 10);
        
        for (const txData of transactions) {
          // The XRPL response structure is: { tx_json: {...}, meta: {...}, hash: "..." }
          const tx = txData.tx_json;
          const hash = txData.hash;
          
          if (!tx || !hash) {
            // Only log warnings for BBRL and EUROP
            if (address === bbrlAddress) {
              console.warn('⚠️ Invalid BBRL transaction structure:', txData);
            } else if (address === europAddress) {
              console.warn('⚠️ Invalid EUROP transaction structure:', txData);
            }
            continue;
          }
          
          // Skip if we've already seen this transaction
          if (seenTransactions.has(hash)) {
            continue;
          }
          
          seenTransactions.add(hash);
          
          // Only log new transactions for BBRL and EUROP
          if (address === bbrlAddress) {
            console.log(`🎉 NEW BBRL TRANSACTION: ${hash}`);
            console.log(`   Type: ${tx.TransactionType}`);
            console.log(`   From: ${tx.Account}`);
            console.log(`   To: ${tx.Destination || 'N/A'}`);
            console.log(`   Amount:`, tx.Amount);
          } else if (address === europAddress) {
            console.log(`🎉 NEW EUROP TRANSACTION: ${hash}`);
            console.log(`   Type: ${tx.TransactionType}`);
            console.log(`   From: ${tx.Account}`);
            console.log(`   To: ${tx.Destination || 'N/A'}`);
            console.log(`   Amount:`, tx.Amount);
          }
          
          // Call the callback with the transaction
          onTransaction({
            transaction: tx,
            meta: txData.meta,
            validated: true,
            hash: hash
          });
        }
      } catch (error) {
        // Only log errors for BBRL and EUROP
        if (address === bbrlAddress) {
          console.error(`❌ Error polling transactions for BBRL ${address}:`, error.message);
        } else if (address === europAddress) {
          console.error(`❌ Error polling transactions for EUROP ${address}:`, error.message);
        }
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
  const bbrlAddress = 'rH5CJsqvNqZGxrMyGaqLEoMWRYcVTAPZMt';
  const europAddress = 'rMkEuRii9w9uBMQDnWV5AA43gvYZR9JxVK';
  
  if (addresses.includes(bbrlAddress)) {
    console.log('🚀 Starting BBRL transaction monitoring for:', bbrlAddress);
  }
  if (addresses.includes(europAddress)) {
    console.log('🚀 Starting EUROP transaction monitoring for:', europAddress);
  }
  
  return startTransactionPolling(addresses, onTransaction);
};

export const unsubscribeFromTransactions = (stopPolling) => {
  if (typeof stopPolling === 'function') {
    stopPolling();
  }
};