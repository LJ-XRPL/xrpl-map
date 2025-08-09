/**
 * Supply Fetcher Utility
 * Fetches real-time supply data from XRPL for issuers
 */

import { Client } from 'xrpl';

/**
 * Fetches the total obligations (supply) for a given issuer address
 * @param {string} issuerAddress - XRPL issuer address
 * @param {string} currency - Currency code
 * @returns {Promise<number>} - Total supply amount
 */
export const fetchIssuerSupply = async (issuerAddress, currency) => {
  const client = new Client('wss://s1.ripple.com');
  
  try {
    await client.connect();
    
    // Get account info to check if account exists and get obligations
    const accountInfo = await client.request({
      command: 'account_info',
      account: issuerAddress,
      ledger_index: 'validated'
    });

    if (!accountInfo.result?.account_data) {
      console.warn(`No account data found for ${issuerAddress}`);
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
        if (line.currency === currency || 
            (currency === 'USDC' && line.currency === currency) ||
            (currency === 'RLUSD' && line.currency === currency) ||
            (currency === 'BBRL' && line.currency === currency) ||
            (currency === 'EUROP' && line.currency === currency)) {
          
          // Negative balance means tokens issued (obligations)
          const balance = parseFloat(line.balance);
          if (balance < 0) {
            totalSupply += Math.abs(balance);
          }
        }
      });
    }

    await client.disconnect();
    return totalSupply;
    
  } catch (error) {
    console.error(`Error fetching supply for ${issuerAddress}:`, error);
    await client.disconnect();
    return 0;
  }
};

/**
 * Fetches supply data for all assets in the data files
 * @param {Array} rwaData - RWA data array
 * @param {Array} stablecoinData - Stablecoin data array
 * @returns {Promise<Object>} - Object mapping issuer addresses to supply amounts
 */
export const fetchAllSupplies = async (rwaData, stablecoinData) => {
  const supplies = {};
  const fetchPromises = [];

  // Collect all issuers from RWA data
  rwaData.forEach(region => {
    region.assets.forEach(asset => {
      fetchPromises.push(
        fetchIssuerSupply(asset.issuer, asset.currency)
          .then(supply => {
            supplies[asset.issuer] = {
              supply,
              currency: asset.currency,
              name: asset.name
            };
          })
      );
    });
  });

  // Collect all issuers from stablecoin data
  stablecoinData.forEach(region => {
    region.coins.forEach(coin => {
      fetchPromises.push(
        fetchIssuerSupply(coin.issuer, coin.currency)
          .then(supply => {
            supplies[coin.issuer] = {
              supply,
              currency: coin.currency,
              name: coin.name
            };
          })
      );
    });
  });

  // Wait for all fetches to complete
  await Promise.all(fetchPromises);
  
  console.log('📊 Fetched on-chain supplies:', supplies);
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
    assets: region.assets.map(asset => ({
      ...asset,
      amount: supplies[asset.issuer]?.supply || asset.amount,
      lastUpdated: new Date().toISOString()
    }))
  }));

  // Update stablecoin data
  const updatedStablecoinData = stablecoinData.map(region => ({
    ...region,
    coins: region.coins.map(coin => ({
      ...coin,
      amount: supplies[coin.issuer]?.supply || coin.amount,
      lastUpdated: new Date().toISOString()
    }))
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
  console.log('🔄 Refreshing all supply data from XRPL...');
  
  try {
    const supplies = await fetchAllSupplies(rwaData, stablecoinData);
    const updatedData = updateDataWithSupplies(rwaData, stablecoinData, supplies);
    
    console.log('✅ Successfully updated all supplies from on-chain data');
    return updatedData;
    
  } catch (error) {
    console.error('❌ Error refreshing supplies:', error);
    return { rwaData, stablecoinData }; // Return original data on error
  }
};