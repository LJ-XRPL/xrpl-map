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
  const volumeData = volumeTracker.getAllVolumeData();
  const volumeMap = new Map(volumeData.map(v => [v.issuer, v]));

  return rwaData.map(region => ({
    ...region,
    assets: region.assets.map(asset => {
      const volumeInfo = volumeMap.get(asset.issuer);
      return {
        ...asset,
        volume24h: volumeInfo ? volumeInfo.volume24h : 0,
        transactionCount: volumeInfo ? volumeInfo.transactionCount : 0,
        lastVolumeUpdate: volumeInfo ? volumeInfo.lastUpdated : null
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
  const volumeData = volumeTracker.getAllVolumeData();
  const volumeMap = new Map(volumeData.map(v => [v.issuer, v]));

  return stablecoinData.map(region => ({
    ...region,
    coins: region.coins.map(coin => {
      const volumeInfo = volumeMap.get(coin.issuer);
      return {
        ...coin,
        volume24h: volumeInfo ? volumeInfo.volume24h : 0,
        transactionCount: volumeInfo ? volumeInfo.transactionCount : 0,
        lastVolumeUpdate: volumeInfo ? volumeInfo.lastUpdated : null
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