/**
 * Volume Tracker - Calculates real-time 24h trading volume from XRPL transactions
 * Tracks volume by issuer address and currency over rolling 24-hour periods
 */

class VolumeTracker {
  constructor() {
    this.volumeData = new Map(); // Map<issuerAddress, VolumeInfo>
    this.transactionHistory = []; // Array of transaction records
    this.cleanupInterval = null;
    
    // Start cleanup process to remove old transactions
    this.startCleanup();
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

    // Create transaction record
    const txRecord = {
      issuer,
      currency,
      amount: parseFloat(amount),
      timestamp: timestamp || Date.now(),
      id: `${issuer}-${currency}-${timestamp || Date.now()}`
    };

    // Add to transaction history
    this.transactionHistory.push(txRecord);

    // Update volume data for this issuer
    this.updateVolumeForIssuer(issuer, currency, txRecord.amount, txRecord.timestamp);

    console.log(`📊 Volume recorded: ${currency} ${amount} for ${issuer.substring(0, 8)}...`);
  }

  /**
   * Updates volume data for a specific issuer
   */
  updateVolumeForIssuer(issuer, currency, amount, timestamp) {
    if (!this.volumeData.has(issuer)) {
      this.volumeData.set(issuer, {
        issuer,
        currency,
        volume24h: 0,
        transactionCount: 0,
        lastUpdated: timestamp,
        transactions: []
      });
    }

    const volumeInfo = this.volumeData.get(issuer);
    volumeInfo.transactions.push({ amount, timestamp });
    volumeInfo.transactionCount++;
    volumeInfo.lastUpdated = timestamp;

    // Recalculate 24h volume
    this.recalculate24hVolume(issuer);
  }

  /**
   * Recalculates 24-hour volume for an issuer
   */
  recalculate24hVolume(issuer) {
    const volumeInfo = this.volumeData.get(issuer);
    if (!volumeInfo) return;

    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);

    // Filter transactions from last 24 hours
    const recentTransactions = volumeInfo.transactions.filter(
      tx => tx.timestamp >= oneDayAgo
    );

    // Calculate total volume
    const volume24h = recentTransactions.reduce((sum, tx) => sum + tx.amount, 0);

    // Update volume info
    volumeInfo.volume24h = volume24h;
    volumeInfo.transactions = recentTransactions; // Keep only recent transactions
  }

  /**
   * Gets 24h volume for a specific issuer
   * @param {string} issuer - Issuer address
   * @returns {number} 24h volume
   */
  get24hVolume(issuer) {
    const volumeInfo = this.volumeData.get(issuer);
    if (!volumeInfo) return 0;

    // Recalculate to ensure freshness
    this.recalculate24hVolume(issuer);
    return volumeInfo.volume24h;
  }

  /**
   * Gets volume data for all tracked issuers
   * @returns {Array} Array of volume information objects
   */
  getAllVolumeData() {
    const result = [];
    
    for (const [issuer, volumeInfo] of this.volumeData.entries()) {
      this.recalculate24hVolume(issuer);
      result.push({
        issuer,
        currency: volumeInfo.currency,
        volume24h: volumeInfo.volume24h,
        transactionCount: volumeInfo.transactionCount,
        lastUpdated: volumeInfo.lastUpdated
      });
    }

    return result.sort((a, b) => b.volume24h - a.volume24h);
  }

  /**
   * Gets total volume across all issuers
   * @returns {number} Total 24h volume
   */
  getTotalVolume() {
    let total = 0;
    for (const [issuer] of this.volumeData.entries()) {
      total += this.get24hVolume(issuer);
    }
    return total;
  }

  /**
   * Cleanup old transactions and recalculate volumes
   */
  cleanup() {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);

    // Remove old transactions from history
    this.transactionHistory = this.transactionHistory.filter(
      tx => tx.timestamp >= oneDayAgo
    );

    // Recalculate all volumes
    for (const [issuer] of this.volumeData.entries()) {
      this.recalculate24hVolume(issuer);
    }

    console.log(`🧹 Volume tracker cleanup completed. Tracking ${this.transactionHistory.length} recent transactions`);
  }

  /**
   * Starts periodic cleanup process
   */
  startCleanup() {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Stops cleanup process
   */
  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Gets volume statistics
   */
  getVolumeStats() {
    const allVolumes = this.getAllVolumeData();
    const totalVolume = this.getTotalVolume();
    const activeIssuers = allVolumes.filter(v => v.volume24h > 0).length;
    const totalTransactions = this.transactionHistory.length;

    return {
      totalVolume,
      activeIssuers,
      totalTransactions,
      topIssuer: allVolumes[0] || null,
      lastUpdated: Date.now()
    };
  }
}

// Create singleton instance
const volumeTracker = new VolumeTracker();

export default volumeTracker;
export { VolumeTracker };