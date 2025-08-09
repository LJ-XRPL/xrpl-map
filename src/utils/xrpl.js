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

// Start polling for transactions with Payment prioritization
export const startTransactionPolling = (addresses, onTransaction, intervalMs = 10000) => {
  const seenTransactions = new Set();
  const paymentIntervalMs = Math.max(intervalMs / 2, 5000); // Payment polling at half interval, minimum 5s
  
  const pollTransactions = async () => {
    console.log(`🔄 Polling transactions for ${addresses.length} issuers...`);
    
    for (const address of addresses) {
      try {
        const transactions = await getAccountTransactions(address, 10);
        
        // Sort transactions to prioritize Payment transactions
        const sortedTransactions = transactions.sort((a, b) => {
          const txA = a.tx_json;
          const txB = b.tx_json;
          
          // Payment transactions get highest priority (0)
          const priorityA = txA?.TransactionType === 'Payment' ? 0 : 1;
          const priorityB = txB?.TransactionType === 'Payment' ? 0 : 1;
          
          return priorityA - priorityB;
        });
        
        for (const txData of sortedTransactions) {
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
          
          // Log priority transactions
          if (tx.TransactionType === 'Payment') {
            console.log(`💰 Priority Payment transaction found: ${hash}`);
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
        console.error(`❌ Error polling transactions for ${address}:`, error.message);
      }
    }
  };

  // Payment-focused polling function (more frequent)
  const pollPaymentsOnly = async () => {
    for (const address of addresses) {
      try {
        const transactions = await getAccountTransactions(address, 5); // Smaller batch for faster processing
        
        // Filter for Payment transactions only
        const paymentTransactions = transactions.filter(txData => 
          txData.tx_json?.TransactionType === 'Payment'
        );
        
        for (const txData of paymentTransactions) {
          const tx = txData.tx_json;
          const hash = txData.hash;
          
          if (!tx || !hash || seenTransactions.has(hash)) {
            continue;
          }
          
          seenTransactions.add(hash);
          console.log(`⚡ Fast-tracked Payment: ${hash}`);
          
          onTransaction({
            transaction: tx,
            meta: txData.meta,
            validated: true,
            hash: hash
          });
        }
      } catch (error) {
        // Silent error handling for payment polling to avoid spam
      }
    }
  };

  // Initial poll after 3 seconds
  console.log('⏰ Starting transaction polling in 3 seconds...');
  console.log(`💰 Payment transactions will be polled every ${paymentIntervalMs}ms`);
  console.log(`🔄 All transactions will be polled every ${intervalMs}ms`);
  
  setTimeout(pollTransactions, 3000);
  
  // Set up intervals - faster for payments, normal for all transactions
  const mainIntervalId = setInterval(pollTransactions, intervalMs);
  const paymentIntervalId = setInterval(pollPaymentsOnly, paymentIntervalMs);
  
  return () => {
    console.log('🛑 Stopping transaction polling');
    clearInterval(mainIntervalId);
    clearInterval(paymentIntervalId);
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