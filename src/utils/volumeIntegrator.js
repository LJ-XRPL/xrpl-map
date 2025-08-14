/**
 * Volume Integrator - Merges real-time volume data with asset data
 */

import volumeTracker from './volumeTracker.js';

/**
 * Updates RWA data with real-time volume information
 * @param {Array} rwaData - Original RWA data structure
 * @returns {Array} RWA data with volume information added
 */
export const updateRwaDataWithVolume = (rwaData) => {
  const volumeData = volumeTracker.getAllCachedVolumeData();
  const volumeMap = new Map(volumeData.map(v => [v.issuer, v]));

  return rwaData.map(region => ({
    ...region,
    assets: region.assets.map(asset => {
      // Handle both single issuer strings and arrays of issuers
      let totalVolume24h = 0;
      let totalTransactionCount = 0;
      let lastVolumeUpdate = null;

      if (Array.isArray(asset.issuer)) {
        // Sum volume from all issuer addresses
        asset.issuer.forEach(issuerAddress => {
          const volumeInfo = volumeMap.get(issuerAddress);
          if (volumeInfo) {
            totalVolume24h += volumeInfo.volume24h;
            totalTransactionCount += volumeInfo.transactionCount;
            if (!lastVolumeUpdate || volumeInfo.lastUpdated > lastVolumeUpdate) {
              lastVolumeUpdate = volumeInfo.lastUpdated;
            }
          }
        });
      } else {
        // Single issuer
        const volumeInfo = volumeMap.get(asset.issuer);
        if (volumeInfo) {
          totalVolume24h = volumeInfo.volume24h;
          totalTransactionCount = volumeInfo.transactionCount;
          lastVolumeUpdate = volumeInfo.lastUpdated;
        }
      }

      return {
        ...asset,
        volume24h: totalVolume24h,
        transactionCount: totalTransactionCount,
        lastVolumeUpdate: lastVolumeUpdate
      };
    })
  }));
};

/**
 * Updates stablecoin data with real-time volume information
 * @param {Array} stablecoinData - Original stablecoin data structure
 * @returns {Array} Stablecoin data with volume information added
 */
export const updateStablecoinDataWithVolume = (stablecoinData) => {
  const volumeData = volumeTracker.getAllCachedVolumeData();
  const volumeMap = new Map(volumeData.map(v => [v.issuer, v]));

  return stablecoinData.map(region => ({
    ...region,
    coins: region.coins.map(coin => {
      // Handle both single issuer strings and arrays of issuers
      let totalVolume24h = 0;
      let totalTransactionCount = 0;
      let lastVolumeUpdate = null;

      if (Array.isArray(coin.issuer)) {
        // Sum volume from all issuer addresses
        coin.issuer.forEach(issuerAddress => {
          const volumeInfo = volumeMap.get(issuerAddress);
          if (volumeInfo) {
            totalVolume24h += volumeInfo.volume24h;
            totalTransactionCount += volumeInfo.transactionCount;
            if (!lastVolumeUpdate || volumeInfo.lastUpdated > lastVolumeUpdate) {
              lastVolumeUpdate = volumeInfo.lastUpdated;
            }
          }
        });
      } else {
        // Single issuer
        const volumeInfo = volumeMap.get(coin.issuer);
        if (volumeInfo) {
          totalVolume24h = volumeInfo.volume24h;
          totalTransactionCount = volumeInfo.transactionCount;
          lastVolumeUpdate = volumeInfo.lastUpdated;
        }
      }

      return {
        ...coin,
        volume24h: totalVolume24h,
        transactionCount: totalTransactionCount,
        lastVolumeUpdate: lastVolumeUpdate
      };
    })
  }));
};

/**
 * Gets total volume statistics across all assets
 * @returns {Object} Volume statistics
 */
export const getTotalVolumeStats = () => {
  const stats = volumeTracker.getVolumeStats();
  return {
    totalVolume: stats.totalVolume,
    activeIssuers: stats.activeIssuers,
    totalTransactions: stats.totalTransactions,
    topIssuer: stats.topIssuer,
    lastUpdated: stats.lastUpdated
  };
};

/**
 * Gets volume for a specific issuer
 * @param {string} issuerAddress - Issuer address
 * @returns {number} 24h volume for the issuer
 */
export const getIssuerVolume = (issuerAddress) => {
  return volumeTracker.get24hVolume(issuerAddress);
};

/**
 * Gets volume data for display in components
 * @param {Array} rwaData - RWA data
 * @param {Array} stablecoinData - Stablecoin data
 * @returns {Object} Combined volume data for display
 */
export const getVolumeDataForDisplay = (rwaData, stablecoinData) => {
  const rwaWithVolume = updateRwaDataWithVolume(rwaData);
  const stablecoinWithVolume = updateStablecoinDataWithVolume(stablecoinData);
  const totalStats = getTotalVolumeStats();

  // Calculate regional volume totals
  const regionalVolume = {};
  
  rwaWithVolume.forEach(region => {
    const regionTotal = region.assets.reduce((sum, asset) => sum + (asset.volume24h || 0), 0);
    regionalVolume[region.region] = (regionalVolume[region.region] || 0) + regionTotal;
  });

  stablecoinWithVolume.forEach(region => {
    const regionTotal = region.coins.reduce((sum, coin) => sum + (coin.volume24h || 0), 0);
    regionalVolume[region.region] = (regionalVolume[region.region] || 0) + regionTotal;
  });

  return {
    rwaData: rwaWithVolume,
    stablecoinData: stablecoinWithVolume,
    totalStats,
    regionalVolume
  };
};