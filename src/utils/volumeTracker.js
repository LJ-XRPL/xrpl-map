/**
 * Volume Tracker - Calculates real-time 24h trading volume from XRPL transactions
 * Tracks volume by issuer address and currency over rolling 24-hour periods
 */

class VolumeTracker {
  constructor() {
    this.volumeData = new Map(); // Map<issuerAddress, VolumeInfo>
    this.sessionStartTime = Date.now(); // Track when this session started
    this.cacheKey = 'xrpl_volume_cache';
    this.cacheExpiryKey = 'xrpl_volume_cache_expiry';
    
    // Load cached data on initialization
    this.loadCachedData();
  }

  /**
   * Records a transaction and updates volume data
   * @param {Object} transaction - Parsed transaction object
   * @param {string} transaction.issuer - Issuer address
   * @param {string} transaction.currency - Currency code
   * @param {number} transaction.amount - Transaction amount
   * @param {number} transaction.timestamp - Transaction timestamp
   */
  recordTransaction(transaction) {
    const { issuer, currency, amount, timestamp } = transaction;
    
    if (!issuer || !currency || !amount || amount <= 0) {
      return; // Skip invalid transactions
    }

    // Update volume data for this issuer (incremental)
    this.updateVolumeForIssuer(issuer, currency, parseFloat(amount), timestamp || Date.now());
    
    // Save to cache after recording new transaction
    this.saveCachedData();
  }

  /**
   * Updates volume data for a specific issuer (incremental)
   */
  updateVolumeForIssuer(issuer, currency, amount, timestamp) {
    if (!this.volumeData.has(issuer)) {
      this.volumeData.set(issuer, {
        issuer,
        currency,
        sessionVolume: 0, // Total volume for this session
        transactionCount: 0,
        lastUpdated: timestamp
      });
    }

    const volumeInfo = this.volumeData.get(issuer);
    volumeInfo.sessionVolume += amount; // Add to session total
    volumeInfo.transactionCount++;
    volumeInfo.lastUpdated = timestamp;

    console.log(`📈 Volume updated for ${issuer}: +${amount} ${currency} (Total: ${volumeInfo.sessionVolume})`);
  }

  /**
   * Gets session volume for a specific issuer
   * @param {string} issuer - Issuer address
   * @returns {number} Session volume
   */
  getSessionVolume(issuer) {
    const volumeInfo = this.volumeData.get(issuer);
    if (!volumeInfo) return 0;
    return volumeInfo.sessionVolume;
  }

  /**
   * Gets volume data for all tracked issuers
   * @returns {Array} Array of volume information objects
   */
  getAllVolumeData() {
    const result = [];
    
    for (const [issuer, volumeInfo] of this.volumeData.entries()) {
      result.push({
        issuer,
        currency: volumeInfo.currency,
        volume24h: volumeInfo.sessionVolume, // Use session volume for compatibility
        transactionCount: volumeInfo.transactionCount,
        lastUpdated: volumeInfo.lastUpdated
      });
    }

    return result.sort((a, b) => b.volume24h - a.volume24h);
  }

  /**
   * Gets total volume across all issuers
   * @returns {number} Total session volume
   */
  getTotalVolume() {
    let total = 0;
    for (const [issuer] of this.volumeData.entries()) {
      total += this.getSessionVolume(issuer);
    }
    return total;
  }

  /**
   * Gets session statistics
   * @returns {Object} Session statistics
   */
  getSessionStats() {
    const sessionDuration = Date.now() - this.sessionStartTime;
    const sessionMinutes = Math.round(sessionDuration / (60 * 1000));
    
    return {
      sessionStartTime: this.sessionStartTime,
      sessionDuration,
      sessionMinutes,
      totalIssuers: this.volumeData.size
    };
  }

  /**
   * Saves volume data to localStorage cache
   */
  saveCachedData() {
    try {
      const cacheData = {
        volumeData: Array.from(this.volumeData.entries()),
        sessionStartTime: this.sessionStartTime,
        timestamp: Date.now()
      };
      
      localStorage.setItem(this.cacheKey, JSON.stringify(cacheData));
      localStorage.setItem(this.cacheExpiryKey, Date.now().toString());
      
      console.log('💾 Volume cache saved:', {
        issuers: this.volumeData.size,
        totalVolume: this.getTotalVolume(),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Failed to save volume cache:', error);
    }
  }

  /**
   * Loads volume data from localStorage cache
   */
  loadCachedData() {
    try {
      const cachedData = localStorage.getItem(this.cacheKey);
      const cacheExpiry = localStorage.getItem(this.cacheExpiryKey);
      
      if (!cachedData || !cacheExpiry) {
        console.log('📭 No volume cache found');
        return;
      }

      const expiryTime = parseInt(cacheExpiry);
      const now = Date.now();
      const cacheAge = now - expiryTime;
      const maxCacheAge = 24 * 60 * 60 * 1000; // 24 hours

      if (cacheAge > maxCacheAge) {
        console.log('⏰ Volume cache expired, clearing old data');
        localStorage.removeItem(this.cacheKey);
        localStorage.removeItem(this.cacheExpiryKey);
        return;
      }

      const parsedData = JSON.parse(cachedData);
      
      // Restore volume data
      this.volumeData = new Map(parsedData.volumeData);
      this.sessionStartTime = parsedData.sessionStartTime || Date.now();
      
      console.log('📂 Volume cache loaded:', {
        issuers: this.volumeData.size,
        totalVolume: this.getTotalVolume(),
        cacheAge: Math.round(cacheAge / (60 * 1000)) + ' minutes ago'
      });
    } catch (error) {
      console.error('❌ Failed to load volume cache:', error);
      // Clear corrupted cache
      localStorage.removeItem(this.cacheKey);
      localStorage.removeItem(this.cacheExpiryKey);
    }
  }

  /**
   * Clears all cached volume data
   */
  clearCache() {
    try {
      localStorage.removeItem(this.cacheKey);
      localStorage.removeItem(this.cacheExpiryKey);
      this.volumeData.clear();
      this.sessionStartTime = Date.now();
      console.log('🗑️ Volume cache cleared');
    } catch (error) {
      console.error('❌ Failed to clear volume cache:', error);
    }
  }

  /**
   * Gets volume statistics
   */
  getVolumeStats() {
    const allVolumes = this.getAllVolumeData();
    const totalVolume = this.getTotalVolume();
    const activeIssuers = allVolumes.filter(v => v.volume24h > 0).length;
    const sessionStats = this.getSessionStats();

    return {
      totalVolume,
      activeIssuers,
      totalTransactions: allVolumes.reduce((sum, v) => sum + v.transactionCount, 0),
      topIssuer: allVolumes[0] || null,
      sessionMinutes: sessionStats.sessionMinutes,
      lastUpdated: Date.now()
    };
  }

  /**
   * Gets cached volume data for a specific issuer
   * @param {string} issuer - Issuer address
   * @returns {Object|null} Cached volume data or null if not found
   */
  getCachedVolume(issuer) {
    const volumeInfo = this.volumeData.get(issuer);
    if (!volumeInfo) return null;
    
    return {
      issuer,
      currency: volumeInfo.currency,
      volume24h: volumeInfo.sessionVolume, // Use session volume for compatibility
      transactionCount: volumeInfo.transactionCount,
      lastUpdated: volumeInfo.lastUpdated
    };
  }

  /**
   * Gets all cached volume data
   * @returns {Array} Array of cached volume data
   */
  getAllCachedVolumeData() {
    const result = [];
    
    for (const [issuer, volumeInfo] of this.volumeData.entries()) {
      result.push({
        issuer,
        currency: volumeInfo.currency,
        volume24h: volumeInfo.sessionVolume, // Use session volume for compatibility
        transactionCount: volumeInfo.transactionCount,
        lastUpdated: volumeInfo.lastUpdated
      });
    }

    return result.sort((a, b) => b.volume24h - a.volume24h);
  }
}

// Create singleton instance
const volumeTracker = new VolumeTracker();

export default volumeTracker;
export { VolumeTracker };