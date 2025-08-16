/**
 * Simple Volume Manager - Track all XRPL transactions for RWA assets
 */

import { parseTransaction } from './transactionParser.js';

class VolumeManager {
  constructor() {
    this.transactions = new Map(); // issuer_currency -> total volume
    this.sessionStartTime = Date.now();
    this.cacheKey = 'xrpl_volume_cache';
    this.isTracking = false;
    this.mapData = [];
    
    // Load cached data on initialization
    this.loadCachedData();
  }

  /**
   * Record a new transaction (simple volume tracking)
   */
  recordTransaction(transaction) {
    const { issuer, currency, amount } = transaction;
    
    if (!issuer || !currency || !amount || amount <= 0) {
      return;
    }

    const key = `${issuer}_${currency}`;
    const currentVolume = this.transactions.get(key) || 0;
    const newVolume = currentVolume + parseFloat(amount);
    
    this.transactions.set(key, newVolume);
    
    // Save to cache
    this.saveCachedData();
  }

  /**
   * Get volume for a specific issuer
   */
  getVolumeForIssuer(issuer, currency = null) {
    if (currency) {
      const key = `${issuer}_${currency}`;
      return this.transactions.get(key) || 0;
    }

    // Sum all currencies for this issuer
    let totalVolume = 0;
    for (const [key, volume] of this.transactions.entries()) {
      if (key.startsWith(`${issuer}_`)) {
        totalVolume += volume;
      }
    }
    return totalVolume;
  }

  /**
   * Get all volume data
   */
  getAllVolumeData() {
    const result = [];
    for (const [key, volume] of this.transactions.entries()) {
      if (volume > 0) {
        const [issuer, currency] = key.split('_');
        result.push({
          issuer,
          currency,
          volume24h: volume, // Keep field name for compatibility
          transactionCount: 1 // Simplified - just indicate there's volume
        });
      }
    }
    return result.sort((a, b) => b.volume24h - a.volume24h);
  }

  /**
   * Get total volume across all issuers
   */
  getTotalVolume() {
    let total = 0;
    for (const [, volume] of this.transactions.entries()) {
      total += volume;
    }
    return total;
  }

  /**
   * Update asset data with volume
   */
  updateAssetDataWithVolume(assetData) {
    if (!assetData || !Array.isArray(assetData)) {
      return [];
    }

    return assetData.map(region => {
      if (!region) return {};

      // Handle RWA assets
      if (region.assets && Array.isArray(region.assets)) {
        return {
          ...region,
          assets: region.assets.map(asset => {
            if (!asset) return asset || {};

            let totalVolume = 0;
            
            if (Array.isArray(asset.issuer)) {
              // Multiple issuers - sum volume from all
              asset.issuer.forEach(issuerAddress => {
                totalVolume += this.getVolumeForIssuer(issuerAddress);
              });
            } else {
              // Single issuer
              totalVolume = this.getVolumeForIssuer(asset.issuer);
            }

            return {
              ...asset,
              volume24h: totalVolume
            };
          })
        };
      }
      
      // Handle stablecoin coins
      if (region.coins && Array.isArray(region.coins)) {
        return {
          ...region,
          coins: region.coins.map(coin => {
            if (!coin) return coin || {};

            let totalVolume = 0;
            
            if (Array.isArray(coin.issuer)) {
              // Multiple issuers - sum volume from all
              coin.issuer.forEach(issuerAddress => {
                totalVolume += this.getVolumeForIssuer(issuerAddress);
              });
            } else {
              // Single issuer
              totalVolume = this.getVolumeForIssuer(coin.issuer);
            }

            return {
              ...coin,
              volume24h: totalVolume
            };
          })
        };
      }

      return region;
    });
  }

  /**
   * Save volume data to localStorage
   */
  saveCachedData() {
    try {
      const data = {
        transactions: Array.from(this.transactions.entries()),
        sessionStartTime: this.sessionStartTime
      };
      localStorage.setItem(this.cacheKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save volume cache:', error);
    }
  }

  /**
   * Load volume data from localStorage
   */
  loadCachedData() {
    try {
      const cached = localStorage.getItem(this.cacheKey);
      if (cached) {
        const data = JSON.parse(cached);
        this.transactions = new Map(data.transactions);
        this.sessionStartTime = data.sessionStartTime;
        console.log('📊 Loaded cached volume data:', this.transactions.size, 'entries');
      }
    } catch (error) {
      console.error('Failed to load volume cache:', error);
    }
  }

  /**
   * Clear all volume data
   */
  clearData() {
    this.transactions.clear();
    localStorage.removeItem(this.cacheKey);
    console.log('🗑️ Volume data cleared');
  }

  /**
   * Clear volume data for a specific issuer
   */
  clearIssuerData(issuerAddress) {
    const keysToRemove = [];
    for (const [key] of this.transactions.entries()) {
      if (key.startsWith(`${issuerAddress}_`)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      this.transactions.delete(key);
    });
    
    if (keysToRemove.length > 0) {
      this.saveCachedData();
      console.log(`🗑️ Cleared volume data for issuer ${issuerAddress}: ${keysToRemove.length} entries`);
    }
  }

  /**
   * Debug: Log current volume state
   */
  logVolumeState() {
    console.log('🔍 Current Volume State:');
    console.log(`📊 Total volume entries: ${this.transactions.size}`);
    
    if (this.transactions.size === 0) {
      console.log('📊 No volume data recorded yet');
      return;
    }
    
    for (const [key, volume] of this.transactions.entries()) {
      const [issuer, currency] = key.split('_');
      console.log(`📊 ${issuer}_${currency}: ${volume.toLocaleString()} ${currency}`);
    }
  }

  /**
   * Debug: Log volume for specific issuers
   */
  logIssuerVolumes() {
    console.log('🔍 Issuer Volume Breakdown:');
    
    if (!this.mapData || this.mapData.length === 0) {
      console.log('📊 No map data available');
      return;
    }
    
    this.mapData.forEach(item => {
      const issuers = Array.isArray(item.issuer) ? item.issuer : [item.issuer];
      let totalVolume = 0;
      
      issuers.forEach(issuerAddress => {
        const volume = this.getVolumeForIssuer(issuerAddress, item.currency);
        totalVolume += volume;
      });
      
      console.log(`📊 ${item.name} (${item.currency}): ${totalVolume.toLocaleString()} ${item.currency}`);
    });
  }

  /**
   * Reset all volume data and start fresh
   */
  resetVolumeData() {
    console.log('🔄 Resetting all volume data...');
    this.clearData();
    this.sessionStartTime = Date.now();
    console.log('✅ Volume data reset complete');
  }

  /**
   * Start tracking volume for RWA assets
   */
  startTracking(mapData) {
    this.mapData = mapData;
    this.isTracking = true;
    console.log('📊 Volume tracking started for RWA assets');
    console.log('📊 Map data:', mapData.length, 'items');
    console.log('📊 Current volume data:', this.transactions.size, 'entries');
  }

  /**
   * Stop tracking volume
   */
  stopTracking() {
    this.isTracking = false;
    console.log('📊 Volume tracking stopped');
  }



  /**
   * Process a transaction and record volume from issuer addresses
   */
  processTransaction(txData) {
    if (!this.isTracking || !this.mapData.length) {
      return;
    }

    // Use the transaction parser utility
    const parsedTransaction = parseTransaction(txData, this.mapData);
    
    if (!parsedTransaction) {
      return; // Transaction was filtered out or invalid
    }

    // Only record actual trading volume, not all transaction types
    const validTradingTypes = ['Payment', 'OfferCreate', 'OfferCancel', 'OfferCancel'];
    if (!validTradingTypes.includes(parsedTransaction.type)) {
      return; // Skip non-trading transactions
    }

    // Only record transactions with valid numeric amounts
    if (!parsedTransaction.amount || typeof parsedTransaction.amount !== 'number' || parsedTransaction.amount <= 0) {
      return;
    }

    // Check if this transaction involves any of our tracked issuer addresses
    const issuer = this.mapData.find(item => {
      if (Array.isArray(item.issuer)) {
        return item.issuer.includes(parsedTransaction.from) || item.issuer.includes(parsedTransaction.to);
      }
      return item.issuer === parsedTransaction.from || item.issuer === parsedTransaction.to;
    });
    
    if (!issuer) {
      return; // Not a tracked issuer
    }

    // For volume tracking, we want to count:
    // 1. Direct payments in the issuer's currency
    // 2. XRP payments involving the issuer (as they represent trading activity)
    // 3. Cross-currency trades involving the issuer
    const isRelevantTransaction = 
      parsedTransaction.currency === issuer.currency || // Direct currency match
      parsedTransaction.currency === 'XRP' || // XRP payments
      parsedTransaction.type === 'OfferCreate'; // Any offer creation is trading activity
    
    if (!isRelevantTransaction) {
      console.log(`🚫 Not a relevant transaction: ${parsedTransaction.currency} for ${issuer.name}`);
      return;
    }

    // Determine which issuer address is involved
    let issuerAddress;
    if (Array.isArray(issuer.issuer)) {
      // For multiple issuers, determine which one is actually involved
      if (issuer.issuer.includes(parsedTransaction.from)) {
        issuerAddress = parsedTransaction.from;
      } else if (issuer.issuer.includes(parsedTransaction.to)) {
        issuerAddress = parsedTransaction.to;
      } else {
        // If neither from nor to matches, use the first issuer (fallback)
        issuerAddress = issuer.issuer[0];
      }
    } else {
      issuerAddress = issuer.issuer;
    }
    
    // Validate amount is reasonable (not too large or small)
    const maxReasonableAmount = 1000000000; // 1 billion
    const minReasonableAmount = 0.01; // 1 cent
    
    if (parsedTransaction.amount > maxReasonableAmount) {
      console.log(`🚫 Amount too large: ${parsedTransaction.amount} for ${issuer.name}`);
      return;
    }
    
    if (parsedTransaction.amount < minReasonableAmount) {
      console.log(`🚫 Amount too small: ${parsedTransaction.amount} for ${issuer.name}`);
      return;
    }

    // For volume tracking, always record in the issuer's currency
    // If the transaction is in XRP or another currency, we still record it as volume for the issuer
    const volumeCurrency = issuer.currency;
    
    // Record the transaction
    this.recordTransaction({
      issuer: issuerAddress,
      currency: volumeCurrency,
      amount: parsedTransaction.amount
    });

    console.log(`✅ Recorded volume: ${parsedTransaction.amount} ${parsedTransaction.currency} -> ${volumeCurrency} for ${issuer.name}`);
  }
}

// Create singleton instance
const volumeManager = new VolumeManager();

// Expose for debugging in browser console
if (typeof window !== 'undefined') {
  window.volumeManager = volumeManager;
  console.log('🔧 Volume manager available globally as window.volumeManager');
  console.log('🔧 Available methods:');
  console.log('  - volumeManager.logVolumeState() - Show current volume data');
  console.log('  - volumeManager.logIssuerVolumes() - Show volume by issuer');
  console.log('  - volumeManager.resetVolumeData() - Clear all volume data');
  console.log('  - volumeManager.clearData() - Clear volume data');
  console.log('  - volumeManager.clearIssuerData(address) - Clear data for specific issuer');
}

export default volumeManager;
