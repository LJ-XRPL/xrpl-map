/**
 * Market Cap Manager
 * Centralized management of market cap calculations and data
 */

class MarketCapManager {
  constructor() {
    this.marketCapData = new Map(); // issuer -> market cap data
    this.totalMarketCap = 0;
    this.lastUpdate = Date.now();
  }

  /**
   * Calculate market cap for an asset using on-chain supply data
   * @param {Object} asset - Asset object with supply and pricing data
   * @returns {number} Market cap in USD
   */
  calculateMarketCap(asset) {
    console.log(`🔍 Calculating market cap for ${asset.name}:`, {
      realSupply: asset.realSupply,
      unitsIssued: asset.unitsIssued,
      navPrice: asset.navPrice,
      exchangeRate: asset.exchangeRate,
      amount: asset.amount
    });
    
    // Use real on-chain supply if available
    if (asset.realSupply && asset.realSupply > 0) {
      const navPrice = asset.navPrice || 1;
      const exchangeRate = asset.exchangeRate || 1;
      const marketCap = asset.realSupply * navPrice * exchangeRate;
      
      console.log(`📊 On-chain market cap for ${asset.name}: ${asset.realSupply} ${asset.currency} × $${navPrice} × ${exchangeRate} = $${marketCap.toLocaleString()}`);
      return marketCap;
    }
    
    // If no on-chain supply, use initial issuance supply × NAV price
    if (asset.unitsIssued && asset.unitsIssued > 0) {
      const navPrice = asset.navPrice || 1;
      const exchangeRate = asset.exchangeRate || 1;
      const marketCap = asset.unitsIssued * navPrice * exchangeRate;
      
      console.log(`📊 Initial issuance market cap for ${asset.name}: ${asset.unitsIssued} ${asset.currency} × $${navPrice} × ${exchangeRate} = $${marketCap.toLocaleString()}`);
      return marketCap;
    }
    
    // If no supply data at all, return 0
    console.log(`⚠️ No supply data for ${asset.name} - market cap set to 0`);
    return 0;
  }

  /**
   * Update market cap for an asset
   * @param {string} issuer - Issuer address
   * @param {Object} asset - Asset data
   */
  updateMarketCap(issuer, asset) {
    const marketCap = this.calculateMarketCap(asset);
    
    this.marketCapData.set(issuer, {
      name: asset.name,
      currency: asset.currency,
      marketCap,
      lastUpdate: Date.now(),
      realSupply: asset.realSupply,
      unitsIssued: asset.unitsIssued,
      navPrice: asset.navPrice,
      exchangeRate: asset.exchangeRate
    });

    console.log(`📊 Updated market cap for ${asset.name}: $${marketCap.toLocaleString()}`);
  }

  /**
   * Get market cap for an asset
   * @param {string} issuer - Issuer address
   * @returns {number} Market cap in USD
   */
  getMarketCap(issuer) {
    const data = this.marketCapData.get(issuer);
    return data ? data.marketCap : 0;
  }

  /**
   * Get all market cap data
   * @returns {Map} All market cap data
   */
  getAllMarketCapData() {
    return this.marketCapData;
  }

  /**
   * Calculate total market cap from all assets
   * @param {Array} rwaData - RWA data array
   * @param {Array} stablecoinData - Stablecoin data array
   * @returns {number} Total market cap in USD
   */
  calculateTotalMarketCap(rwaData, stablecoinData) {
    let totalMarketCap = 0;

    // Calculate RWA market cap
    rwaData.forEach(region => {
      region.assets.forEach(asset => {
        const issuers = Array.isArray(asset.issuer) ? asset.issuer : [asset.issuer];
        issuers.forEach(issuer => {
          this.updateMarketCap(issuer, asset);
          totalMarketCap += this.getMarketCap(issuer);
        });
      });
    });

    // Calculate stablecoin market cap
    stablecoinData.forEach(region => {
      region.coins.forEach(coin => {
        const issuers = Array.isArray(coin.issuer) ? coin.issuer : [coin.issuer];
        issuers.forEach(issuer => {
          this.updateMarketCap(issuer, coin);
          totalMarketCap += this.getMarketCap(issuer);
        });
      });
    });

    this.totalMarketCap = totalMarketCap;
    this.lastUpdate = Date.now();
    
    console.log(`📊 Total market cap: $${totalMarketCap.toLocaleString()}`);
    return totalMarketCap;
  }

  /**
   * Get total market cap
   * @returns {number} Total market cap in USD
   */
  getTotalMarketCap() {
    return this.totalMarketCap;
  }

  /**
   * Update asset data with calculated market caps
   * @param {Array} rwaData - RWA data array
   * @param {Array} stablecoinData - Stablecoin data array
   * @returns {Object} Updated data with market caps
   */
  updateAssetDataWithMarketCaps(rwaData, stablecoinData) {
    console.log('🔄 Updating asset data with market caps...');
    console.log('📊 Input RWA data:', rwaData?.length || 0, 'regions');
    console.log('📊 Input stablecoin data:', stablecoinData?.length || 0, 'regions');
    
    const updatedRwaData = rwaData.map(region => ({
      ...region,
      assets: region.assets.map(asset => {
        // Calculate market cap once for the entire asset, not per issuer
        const marketCap = this.calculateMarketCap(asset);
        console.log(`📊 ${asset.name} market cap: $${marketCap.toLocaleString()}`);
        
        // Update market cap data for the first issuer (for tracking purposes)
        const issuers = Array.isArray(asset.issuer) ? asset.issuer : [asset.issuer];
        if (issuers.length > 0) {
          this.updateMarketCap(issuers[0], asset);
        }
        
        return {
          ...asset,
          amount: marketCap
        };
      })
    }));

    const updatedStablecoinData = stablecoinData.map(region => ({
      ...region,
      coins: region.coins.map(coin => {
        // Calculate market cap once for the entire coin, not per issuer
        const marketCap = this.calculateMarketCap(coin);
        console.log(`📊 ${coin.name} market cap: $${marketCap.toLocaleString()}`);
        
        // Update market cap data for the first issuer (for tracking purposes)
        const issuers = Array.isArray(coin.issuer) ? coin.issuer : [coin.issuer];
        if (issuers.length > 0) {
          this.updateMarketCap(issuers[0], coin);
        }
        
        return {
          ...coin,
          amount: marketCap
        };
      })
    }));

    console.log('✅ Updated asset data with market caps');
    return {
      rwaData: updatedRwaData,
      stablecoinData: updatedStablecoinData
    };
  }

  /**
   * Get growth trend for an asset (simulated)
   * @param {number} amount - Current amount
   * @returns {number} Growth percentage
   */
  getGrowthTrend(amount) {
    // More realistic growth simulation based on market conditions
    const marketCycle = Math.sin(Date.now() / 86400000) * 8; // Daily cycle
    const volatility = (amount / 10000000) * 5; // Larger assets more stable
    const growth = marketCycle + (Math.random() - 0.5) * volatility;
    return Math.max(-15, Math.min(15, growth)); // Cap between -15% and +15%
  }

  /**
   * Get market cap growth data for charts
   * @param {number} currentAmount - Current market cap
   * @returns {Array} Growth data points
   */
  getMarketCapGrowthData(currentAmount) {
    const data = [];
    const baseAmount = currentAmount || 1000000;
    
    for (let i = 90; i >= 0; i--) {
      const daysAgo = i;
      const growthFactor = 1 + (this.getGrowthTrend(baseAmount) / 100);
      const amount = baseAmount * Math.pow(growthFactor, daysAgo / 30);
      data.push({
        day: 90 - daysAgo,
        amount: Math.max(0, amount)
      });
    }
    
    return data;
  }

  /**
   * Get stablecoin growth data for charts
   * @param {number} currentAmount - Current market cap
   * @returns {Array} Growth data points
   */
  getStablecoinGrowthData(currentAmount) {
    const data = [];
    const baseAmount = currentAmount || 1000000;
    
    for (let i = 90; i >= 0; i--) {
      const daysAgo = i;
      // More stable growth for stablecoins
      const marketCycle = Math.sin(Date.now() / 86400000) * 3;
      const volatility = (baseAmount / 50000000) * 2;
      const growthFactor = 1 + ((marketCycle + (Math.random() - 0.5) * volatility) / 100);
      const amount = baseAmount * Math.pow(growthFactor, daysAgo / 30);
      data.push({
        day: 90 - daysAgo,
        amount: Math.max(0, amount)
      });
    }
    
    return data;
  }

  /**
   * Clear all market cap data
   */
  clear() {
    this.marketCapData.clear();
    this.totalMarketCap = 0;
    this.lastUpdate = Date.now();
  }

  /**
   * Get market statistics
   * @param {Array} rwaData - RWA data array
   * @param {Array} stablecoinData - Stablecoin data array
   * @returns {Object} Market statistics
   */
  getMarketStatistics(rwaData, stablecoinData) {
    const totalMarketCap = this.calculateTotalMarketCap(rwaData, stablecoinData);
    
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
      activeAssets,
      totalAssets
    };
  }
}

// Export singleton instance
const marketCapManager = new MarketCapManager();
export default marketCapManager;
