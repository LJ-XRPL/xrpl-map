/**
 * Supply Fetcher Utility
 * Fetches real-time supply data from XRPL for issuers
 */

import { Client } from 'xrpl';

// Cache for supply data to avoid repeated requests
const supplyCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Clears the supply cache
 */
export const clearSupplyCache = () => {
  supplyCache.clear();
  console.log('🗑️ Supply cache cleared');
};

// Expose cache clearing for debugging
if (typeof window !== 'undefined') {
  window.clearSupplyCache = clearSupplyCache;
  console.log('🔧 Supply cache clearing available as window.clearSupplyCache()');
}

/**
 * Fetches the total obligations (supply) for a given issuer address
 * @param {string} issuerAddress - XRPL issuer address
 * @param {string} currency - Currency code
 * @returns {Promise<number>} - Total supply amount
 */
export const fetchIssuerSupply = async (issuerAddress, currency) => {
  // Validate inputs
  if (!issuerAddress || typeof issuerAddress !== 'string') {
    console.warn(`Invalid issuer address: ${issuerAddress}`);
    return 0;
  }
  
  // Validate XRPL address format (should start with 'r' and be 25-35 characters)
  if (!issuerAddress.startsWith('r') || issuerAddress.length < 25 || issuerAddress.length > 35) {
    console.warn(`Malformed XRPL address: ${issuerAddress}`);
    return 0;
  }
  
  if (!currency || typeof currency !== 'string') {
    console.warn(`Invalid currency: ${currency}`);
    return 0;
  }

  // Check cache first
  const cacheKey = `${issuerAddress}_${currency}`;
  const cached = supplyCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    console.log(`📋 Using cached supply for ${issuerAddress} (${currency}): ${cached.supply}`);
    return cached.supply;
  }
  
  console.log(`🔍 Fetching supply for ${issuerAddress} (${currency})`);

  // Use multiple endpoints for better reliability, prioritize QuickNode
  const endpoints = [
    process.env.REACT_APP_QUICKNODE_URL,
    'wss://s1.ripple.com',
    'wss://s2.ripple.com',
    'wss://xrplcluster.com'
  ].filter(Boolean);
  
  console.log(`🔗 Available endpoints:`, endpoints.length);

  let lastError;
  
  for (const endpoint of endpoints) {
    const client = new Client(endpoint, {
      connectionTimeout: 3000, // Reduced timeout
      maxRetries: 1,
      timeout: 5000 // Reduced timeout
    });
    
    try {
      await client.connect();
      
      console.log(`🔗 Connected to ${endpoint}`);
      
      // Get account info to check if account exists and get obligations
      const accountInfo = await client.request({
        command: 'account_info',
        account: issuerAddress,
        ledger_index: 'validated'
      });

      if (!accountInfo.result?.account_data) {
        console.warn(`Account not found: ${issuerAddress}`);
        await client.disconnect();
        return 0;
      }

      // Get account lines to see issued tokens
      const accountLines = await client.request({
        command: 'account_lines',
        account: issuerAddress,
        ledger_index: 'validated'
      });

      let totalSupply = 0;

      if (accountLines.result?.lines) {
        // Sum up all the balances for this currency
        accountLines.result.lines.forEach(line => {
          if (line.currency === currency) {
            // Negative balance means tokens issued (obligations)
            const balance = parseFloat(line.balance);
            if (balance < 0) {
              totalSupply += Math.abs(balance);
              console.log(`📊 Found supply: ${Math.abs(balance)} ${currency} from ${line.account}`);
            }
          }
        });
      }
      
      console.log(`📊 Total supply for ${issuerAddress} (${currency}): ${totalSupply}`);

      // Cache the result
      supplyCache.set(cacheKey, {
        supply: totalSupply,
        timestamp: Date.now()
      });

      await client.disconnect();
      return totalSupply;
      
    } catch (error) {
      lastError = error;
      console.warn(`Failed to fetch from ${endpoint}:`, error.message);
      try {
        await client.disconnect();
      } catch (disconnectError) {
        // Ignore disconnect errors
      }
      continue; // Try next endpoint
    }
  }
  
  console.error(`❌ Failed to fetch supply for ${issuerAddress} from all endpoints:`, lastError);
  return 0;
};

/**
 * Fetches supply data for all assets in the data files
 * @param {Array} rwaData - RWA data array
 * @param {Array} stablecoinData - Stablecoin data array
 * @returns {Promise<Object>} - Object mapping issuer addresses to supply amounts
 */
export const fetchAllSupplies = async (rwaData, stablecoinData) => {
  const supplies = {};
  const allIssuers = [];

  // Collect all issuers from RWA data
  rwaData.forEach(region => {
    region.assets.forEach(asset => {
      // Handle both single issuer strings and arrays of issuers
      const issuers = Array.isArray(asset.issuer) ? asset.issuer : [asset.issuer];
      
      issuers.forEach(issuerAddress => {
        allIssuers.push({
          address: issuerAddress,
          currency: asset.currency,
          name: asset.name,
          fallbackAmount: asset.amount
        });
      });
    });
  });

  // Collect all issuers from stablecoin data
  stablecoinData.forEach(region => {
    region.coins.forEach(coin => {
      // Handle both single issuer strings and arrays of issuers
      const issuers = Array.isArray(coin.issuer) ? coin.issuer : [coin.issuer];
      
      issuers.forEach(issuerAddress => {
        allIssuers.push({
          address: issuerAddress,
          currency: coin.currency,
          name: coin.name,
          fallbackAmount: coin.amount
        });
      });
    });
  });

  console.log(`🔄 Fetching supply data for ${allIssuers.length} issuers in parallel...`);
  
  // Process issuers in parallel batches to avoid overwhelming the server
  const BATCH_SIZE = 5; // Process 5 issuers at a time
  const batches = [];
  
  for (let i = 0; i < allIssuers.length; i += BATCH_SIZE) {
    batches.push(allIssuers.slice(i, i + BATCH_SIZE));
  }
  
  console.log(`📊 Processing ${batches.length} batches of ${BATCH_SIZE} issuers each...`);
  
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log(`📦 Processing batch ${batchIndex + 1}/${batches.length} with ${batch.length} issuers...`);
    
    // Process batch in parallel
    const batchPromises = batch.map(async (issuer) => {
      try {
        const supply = await fetchIssuerSupply(issuer.address, issuer.currency);
        return {
          address: issuer.address,
          supply,
          currency: issuer.currency,
          name: issuer.name
        };
      } catch (error) {
        console.error(`Failed to fetch supply for ${issuer.address}:`, error.message);
        return {
          address: issuer.address,
          supply: 0,
          currency: issuer.currency,
          name: issuer.name
        };
      }
    });
    
    // Wait for batch to complete
    const batchResults = await Promise.all(batchPromises);
    
    // Add results to supplies object
    batchResults.forEach(result => {
      supplies[result.address] = {
        supply: result.supply,
        currency: result.currency,
        name: result.name
      };
    });
    
    // Small delay between batches to be respectful to the server
    if (batchIndex < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  console.log(`✅ Completed supply fetching for ${Object.keys(supplies).length} issuers`);
  return supplies;
};

/**
 * Updates asset data with real-time supply information
 * @param {Array} rwaData - RWA data array
 * @param {Array} stablecoinData - Stablecoin data array
 * @param {Object} supplies - Supply data from fetchAllSupplies
 * @returns {Object} - Updated data with real supplies
 */
export const updateDataWithSupplies = (rwaData, stablecoinData, supplies) => {
  // Update RWA data
  const updatedRwaData = rwaData.map(region => ({
    ...region,
    assets: region.assets.map(asset => {
      // Handle both single issuer strings and arrays of issuers
      const issuers = Array.isArray(asset.issuer) ? asset.issuer : [asset.issuer];
      
      // Sum up supplies from all issuers for this asset
      let totalSupply = 0;
      let hasValidSupply = false;
      
      issuers.forEach(issuerAddress => {
        if (supplies[issuerAddress]?.supply) {
          totalSupply += supplies[issuerAddress].supply;
          hasValidSupply = true;
          console.log(`📊 Real supply for ${asset.name} (${issuerAddress}): ${supplies[issuerAddress].supply} ${asset.currency}`);
        }
      });
      
      return {
        ...asset,
        realSupply: hasValidSupply ? totalSupply : null,
        lastUpdated: new Date().toISOString()
      };
    })
  }));

  // Update stablecoin data
  const updatedStablecoinData = stablecoinData.map(region => ({
    ...region,
    coins: region.coins.map(coin => {
      // Handle both single issuer strings and arrays of issuers
      const issuers = Array.isArray(coin.issuer) ? coin.issuer : [coin.issuer];
      
      // Sum up supplies from all issuers for this coin
      let totalSupply = 0;
      let hasValidSupply = false;
      
      issuers.forEach(issuerAddress => {
        if (supplies[issuerAddress]?.supply) {
          totalSupply += supplies[issuerAddress].supply;
          hasValidSupply = true;
          console.log(`📊 Real supply for ${coin.name} (${issuerAddress}): ${supplies[issuerAddress].supply} ${coin.currency}`);
        }
      });
      
      return {
        ...coin,
        realSupply: hasValidSupply ? totalSupply : null,
        // Keep original amount field - let market cap calculation handle it
        lastUpdated: new Date().toISOString()
      };
    })
  }));

  return {
    rwaData: updatedRwaData,
    stablecoinData: updatedStablecoinData
  };
};

/**
 * Fetches and updates all supply data
 * @param {Array} rwaData - RWA data array
 * @param {Array} stablecoinData - Stablecoin data array
 * @returns {Promise<Object>} - Updated data with real supplies
 */
export const refreshAllSupplies = async (rwaData, stablecoinData) => {

  
  try {
    const supplies = await fetchAllSupplies(rwaData, stablecoinData);
    const updatedData = updateDataWithSupplies(rwaData, stablecoinData, supplies);
    

    return updatedData;
    
  } catch (error) {
    console.error('❌ Error refreshing supplies:', error);
    return { rwaData, stablecoinData }; // Return original data on error
  }
};