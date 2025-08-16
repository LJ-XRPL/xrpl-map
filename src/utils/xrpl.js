import { Client } from 'xrpl';

// Use QuickNode URL from environment variable, fallback to multiple public servers
const getXrplEndpoint = () => {
  if (process.env.REACT_APP_QUICKNODE_URL) {
    return process.env.REACT_APP_QUICKNODE_URL;
  }
  
  // Fallback to public servers
  const publicServers = [
    'wss://xrplcluster.com',
    'wss://s1.ripple.com',
    'wss://s2.ripple.com', 
    'wss://xrpl.ws'
  ];
  
  return publicServers[Math.floor(Math.random() * publicServers.length)];
};

const xrplEndpoint = getXrplEndpoint();
const client = new Client(xrplEndpoint, {
  connectionTimeout: 20000, // Increased to 20 seconds
  maxRetries: 5,
  timeout: 30000 // Overall timeout
});

let isConnecting = false;
let transactionReplayQueue = [];
let replayIndex = 0;
let isReplayActive = false;

client.on('connected', () => {
  isConnecting = false;
});

client.on('disconnected', (code) => {
  isConnecting = false;
});

export const connect = async () => {
  if (client.isConnected() || isConnecting) {
    return;
  }
  isConnecting = true;
  
  try {
    console.log(`🔌 Attempting to connect to XRPL via: ${xrplEndpoint}`);
    await client.connect();
    console.log('✅ Successfully connected to XRPL');
  } catch (error) {
    isConnecting = false;
    console.error('❌ Failed to connect to XRPL:', error.message);
    
    // Try alternative endpoints if available
    if (!process.env.REACT_APP_QUICKNODE_URL) {
      console.log('🔄 Attempting to connect to alternative XRPL server...');
      const alternativeEndpoints = [
        'wss://s2.ripple.com',
        'wss://xrplcluster.com',
        'wss://xrpl.ws'
      ];
      
      for (const endpoint of alternativeEndpoints) {
        if (endpoint === xrplEndpoint) continue; // Skip the one that just failed
        try {
          console.log(`🔄 Trying alternative endpoint: ${endpoint}`);
          const altClient = new Client(endpoint, {
            connectionTimeout: 10000,
            maxRetries: 3,
            timeout: 15000
          });
          await altClient.connect();
          console.log(`✅ Connected via alternative endpoint: ${endpoint}`);
          // Replace the main client
          Object.assign(client, altClient);
          break;
        } catch (altError) {
          console.log(`❌ Alternative endpoint failed: ${endpoint}`);
        }
      }
    }
    
    throw error; // Re-throw the original error
  }
};

export const disconnect = async () => {
  if (client.isConnected()) {
    await client.disconnect();
  }
};

// Get recent transactions for an account
export const getAccountTransactions = async (address, limit = 25) => {
  if (!client.isConnected()) {
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

// Fetch all 25 transactions from all addresses and prepare for replay
export const fetchAllTransactionsForReplay = async (addresses) => {
  if (!client.isConnected()) {
    return [];
  }

  const allTransactions = [];
  
  for (const address of addresses) {
    try {
      const transactions = await getAccountTransactions(address, 25);
      
      // Add issuer information to each transaction
      const enrichedTransactions = transactions.map(txData => ({
        ...txData,
        issuer: address
      }));
      
      allTransactions.push(...enrichedTransactions);
    } catch (error) {
      console.error(`❌ Error fetching transactions for ${address}:`, error.message);
    }
  }
  
  return allTransactions;
};

// Start transaction replay loop
export const startTransactionReplay = (addresses, onTransaction, replayIntervalMs = 2000) => {
  let replayIntervalId = null;
  
  const startReplay = async () => {
    // Fetch all transactions first
    const allTransactions = await fetchAllTransactionsForReplay(addresses);
    
    if (allTransactions.length === 0) {
      console.warn('No transactions found for replay');
      return;
    }
    
    // Sort transactions to prioritize Payment transactions
    const sortedTransactions = allTransactions.sort((a, b) => {
      const txA = a.tx_json;
      const txB = b.tx_json;
      
      // Payment transactions get highest priority (0)
      const priorityA = txA?.TransactionType === 'Payment' ? 0 : 1;
      const priorityB = txB?.TransactionType === 'Payment' ? 0 : 1;
      
      return priorityA - priorityB;
    });
    
    // Initialize replay queue
    transactionReplayQueue = sortedTransactions;
    replayIndex = 0;
    isReplayActive = true;
    
    console.log(`🎬 Starting transaction replay with ${transactionReplayQueue.length} transactions`);
    
    // Start the replay loop
    replayIntervalId = setInterval(() => {
      if (!isReplayActive || transactionReplayQueue.length === 0) {
        return;
      }
      
      // Get current transaction for replay
      const txData = transactionReplayQueue[replayIndex];
      const tx = txData.tx_json;
      const hash = txData.hash;
      
      if (tx && hash) {
        // Create a unique replay ID to avoid conflicts with real-time transactions
        const replayId = `replay-${hash}-${Date.now()}`;
        
        // Call the callback with the transaction
        onTransaction({
          transaction: tx,
          meta: txData.meta,
          validated: true,
          hash: hash,
          issuer: txData.issuer,
          isReplay: true,
          replayId: replayId
        });
      }
      
      // Move to next transaction in the loop
      replayIndex = (replayIndex + 1) % transactionReplayQueue.length;
    }, replayIntervalMs);
  };
  
  // Start the replay system
  startReplay();
  
  // Return cleanup function
  return () => {
    isReplayActive = false;
    if (replayIntervalId) {
      clearInterval(replayIntervalId);
    }
    transactionReplayQueue = [];
    replayIndex = 0;
  };
};

// Start polling for transactions with Payment prioritization (original function)
export const startTransactionPolling = (addresses, onTransaction, intervalMs = 5000) => {
  const seenTransactions = new Set();
  const paymentIntervalMs = Math.max(intervalMs / 2, 3000); // Payment polling at half interval, minimum 3s
  let isPollingActive = true;
  
      const pollTransactions = async () => {
      if (!isPollingActive) return;
      
      for (const address of addresses) {
        try {
                  const transactions = await getAccountTransactions(address, 25);
        if (transactions.length > 0) {
          console.log(`🔍 Polling ${address}: Found ${transactions.length} transactions`);
        } else {
          console.log(`🔍 Polling ${address}: No new transactions found`);
        }
        
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
            continue;
          }
          
          // Skip if we've already seen this transaction
          if (seenTransactions.has(hash)) {
            continue;
          }
          
          seenTransactions.add(hash);
          
          // Debug: Log all transactions being processed
          console.log(`📡 Raw transaction from ${address}:`, {
            type: tx.TransactionType,
            account: tx.Account,
            destination: tx.Destination,
            amount: tx.Amount,
            hash: hash
          });
          
          console.log(`✅ Transaction received and being sent to parser`);
          
          // Call the callback with the transaction
          onTransaction({
            transaction: tx,
            meta: txData.meta,
            validated: true,
            hash: hash,
            issuer: address
          });
        }
      } catch (error) {
        console.error(`❌ Error polling transactions for ${address}:`, error.message);
      }
    }
    
    // Schedule next poll - continuous polling
    if (isPollingActive) {
      setTimeout(pollTransactions, intervalMs);
    }
  };

  // Payment-focused polling function (more frequent)
  const pollPaymentsOnly = async () => {
    if (!isPollingActive) return;
    
    for (const address of addresses) {
      try {
        const transactions = await getAccountTransactions(address, 15); // Larger batch for more transactions
        
        // Filter for Payment transactions only
        const paymentTransactions = transactions.filter(txData =>   
          txData.tx_json?.TransactionType === 'Payment'
        );
        
        if (paymentTransactions.length > 0) {
          console.log(`💳 Payment polling ${address}: Found ${paymentTransactions.length} payment transactions`);
        }
        
        for (const txData of paymentTransactions) {
          const tx = txData.tx_json;
          const hash = txData.hash;
          
          if (!tx || !hash || seenTransactions.has(hash)) {
            continue;
          }
          
          seenTransactions.add(hash);
  
          onTransaction({
            transaction: tx,
            meta: txData.meta,
            validated: true,
            hash: hash,
            issuer: address
          });
        }
      } catch (error) {
        // Silent error handling for payment polling to avoid spam
      }
    }
    
    // Schedule next payment poll - continuous polling
    if (isPollingActive) {
      setTimeout(pollPaymentsOnly, paymentIntervalMs);
    }
  };

  // Initial poll after 1 second
  setTimeout(pollTransactions, 1000);
  setTimeout(pollPaymentsOnly, 2000); // Start payment polling 1 second after main polling
  
  // Heartbeat to ensure continuous polling
  const heartbeat = () => {
    if (isPollingActive) {
      console.log('💓 Transaction polling heartbeat - continuing...');
      setTimeout(heartbeat, 60000); // Check every minute
    }
  };
  setTimeout(heartbeat, 60000);
  
  return () => {
    isPollingActive = false;
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