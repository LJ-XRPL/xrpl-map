/**
 * Market Calculations Utility
 * Handles calculations for market cap, volume, and other financial metrics
 */

/**
 * Calculates total market cap from RWA and stablecoin data
 * @param {Array} rwaData - RWA data array
 * @param {Array} stablecoinData - Stablecoin data array
 * @returns {number} Total market cap in USD
 */
export const calculateTotalMarketCap = (rwaData, stablecoinData) => {
  let totalMarketCap = 0;

  // Calculate RWA market cap
  rwaData.forEach(region => {
    region.assets.forEach(asset => {
      totalMarketCap += asset.amount || 0;
    });
  });

  // Calculate stablecoin market cap
  stablecoinData.forEach(region => {
    region.coins.forEach(coin => {
      totalMarketCap += coin.amount || 0;
    });
  });

  return totalMarketCap;
};

/**
 * Calculates total 24h volume from RWA and stablecoin data
 * @param {Array} rwaData - RWA data array with volume
 * @param {Array} stablecoinData - Stablecoin data array with volume
 * @returns {number} Total 24h volume in USD
 */
export const calculateTotalVolume = (rwaData, stablecoinData) => {
  let totalVolume = 0;

  // Calculate RWA volume (only real on-chain volume)
  rwaData.forEach(region => {
    region.assets.forEach(asset => {
      // Only count real volume, no simulated values
      if (asset.volume24h && asset.volume24h > 0) {
        totalVolume += asset.volume24h;
      }
    });
  });

  // Calculate stablecoin volume (only real on-chain volume)
  stablecoinData.forEach(region => {
    region.coins.forEach(coin => {
      // Only count real volume, no simulated values
      if (coin.volume24h && coin.volume24h > 0) {
        totalVolume += coin.volume24h;
      }
    });
  });

  return totalVolume;
};

/**
 * Calculates NAV-based market cap for an asset
 * @param {Object} asset - Asset object with unitsIssued, navPrice, navPriceCurrency, exchangeRate
 * @returns {number} Market cap in USD
 */
export const calculateNavMarketCap = (asset) => {
  if (!asset.unitsIssued || !asset.navPrice) {
    return asset.amount || 0; // Fallback to existing amount
  }

  const baseMarketCap = asset.unitsIssued * asset.navPrice;
  const exchangeRate = asset.exchangeRate || 1;
  
  return baseMarketCap * exchangeRate;
};

/**
 * Validates and updates asset data with calculated market caps
 * @param {Array} rwaData - RWA data array
 * @param {Array} stablecoinData - Stablecoin data array
 * @returns {Object} Updated data with validated market caps
 */
export const validateAndUpdateMarketCaps = (rwaData, stablecoinData) => {
  const updatedRwaData = rwaData.map(region => ({
    ...region,
    assets: region.assets.map(asset => {
      const calculatedMarketCap = calculateNavMarketCap(asset);
      return {
        ...asset,
        calculatedMarketCap,
        // Use calculated market cap if it differs significantly from stored amount
        amount: Math.abs(calculatedMarketCap - (asset.amount || 0)) > 1000 ? calculatedMarketCap : (asset.amount || calculatedMarketCap)
      };
    })
  }));

  const updatedStablecoinData = stablecoinData.map(region => ({
    ...region,
    coins: region.coins.map(coin => {
      const calculatedMarketCap = calculateNavMarketCap(coin);
      return {
        ...coin,
        calculatedMarketCap,
        // Use calculated market cap if it differs significantly from stored amount
        amount: Math.abs(calculatedMarketCap - (coin.amount || 0)) > 1000 ? calculatedMarketCap : (coin.amount || calculatedMarketCap)
      };
    })
  }));

  return {
    rwaData: updatedRwaData,
    stablecoinData: updatedStablecoinData
  };
};

/**
 * Gets market statistics summary
 * @param {Array} rwaData - RWA data array
 * @param {Array} stablecoinData - Stablecoin data array
 * @returns {Object} Market statistics
 */
export const getMarketStatistics = (rwaData, stablecoinData) => {
  const totalMarketCap = calculateTotalMarketCap(rwaData, stablecoinData);
  const totalVolume = calculateTotalVolume(rwaData, stablecoinData);
  
  // Count active assets (those with volume > 0)
  let activeAssets = 0;
  let totalAssets = 0;

  rwaData.forEach(region => {
    region.assets.forEach(asset => {
      totalAssets++;
      if (asset.volume24h && asset.volume24h > 0) {
        activeAssets++;
      }
    });
  });

  stablecoinData.forEach(region => {
    region.coins.forEach(coin => {
      totalAssets++;
      if (coin.volume24h && coin.volume24h > 0) {
        activeAssets++;
      }
    });
  });

  return {
    totalMarketCap,
    totalVolume,
    activeAssets,
    totalAssets,
    volumeToMarketCapRatio: totalMarketCap > 0 ? (totalVolume / totalMarketCap) * 100 : 0
  };
}; 