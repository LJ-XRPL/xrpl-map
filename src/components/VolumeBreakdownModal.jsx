import React from 'react';
import volumeTracker from '../utils/volumeTracker.js';

const VolumeBreakdownModal = ({ isOpen, onClose, rwaData, stablecoinData }) => {
  if (!isOpen) return null;

  // Get volume data for analysis
  const allVolumeData = volumeTracker.getAllVolumeData();
  const totalStats = volumeTracker.getVolumeStats();
  
  // Categorize volume data by asset type
  const rwaIssuers = new Set();
  const stablecoinIssuers = new Set();
  
  rwaData.forEach(region => {
    region.assets.forEach(asset => {
      rwaIssuers.add(asset.issuer);
    });
  });
  
  stablecoinData.forEach(region => {
    region.coins.forEach(coin => {
      stablecoinIssuers.add(coin.issuer);
    });
  });

  // Calculate volume by asset type
  let rwaVolume = 0;
  let stablecoinVolume = 0;
  const rwaVolumeData = [];
  const stablecoinVolumeData = [];

  allVolumeData.forEach(volumeInfo => {
    if (rwaIssuers.has(volumeInfo.issuer)) {
      rwaVolume += volumeInfo.volume24h;
      rwaVolumeData.push(volumeInfo);
    } else if (stablecoinIssuers.has(volumeInfo.issuer)) {
      stablecoinVolume += volumeInfo.volume24h;
      stablecoinVolumeData.push(volumeInfo);
    }
  });

  // Sort by volume
  rwaVolumeData.sort((a, b) => b.volume24h - a.volume24h);
  stablecoinVolumeData.sort((a, b) => b.volume24h - a.volume24h);

  const totalVolume = rwaVolume + stablecoinVolume;
  const rwaPercentage = totalVolume > 0 ? (rwaVolume / totalVolume) * 100 : 0;
  const stablecoinPercentage = totalVolume > 0 ? (stablecoinVolume / totalVolume) * 100 : 0;

  // Get asset/coin names for display
  const getAssetName = (issuer, type) => {
    if (type === 'RWA') {
      for (const region of rwaData) {
        const asset = region.assets.find(a => a.issuer === issuer);
        if (asset) return { name: asset.name, currency: asset.currency, city: asset.city };
      }
    } else {
      for (const region of stablecoinData) {
        const coin = region.coins.find(c => c.issuer === issuer);
        if (coin) return { name: coin.name, currency: coin.currency, city: coin.city };
      }
    }
    return { name: 'Unknown Asset', currency: 'Unknown', city: 'Unknown' };
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content volume-breakdown-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📊 24H Volume Breakdown</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        
        <div className="modal-body">
          {/* Summary Stats */}
          <div className="volume-summary">
            <div className="summary-stat">
              <div className="stat-label">Total 24H Volume</div>
              <div className="stat-value">${totalVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            </div>
            <div className="summary-stat">
              <div className="stat-label">Active Assets</div>
              <div className="stat-value">{totalStats.activeIssuers}</div>
            </div>
            <div className="summary-stat">
              <div className="stat-label">Total Transactions</div>
              <div className="stat-value">{totalStats.totalTransactions}</div>
            </div>
          </div>

          {/* Asset Type Breakdown */}
          <div className="asset-type-breakdown">
            <div className="breakdown-section">
              <div className="section-header">
                <h3>🏢 Real-World Assets</h3>
                <div className="section-stats">
                  <span className="volume-amount">${rwaVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  <span className="volume-percentage">({rwaPercentage.toFixed(1)}%)</span>
                </div>
              </div>
              <div className="volume-bar">
                <div 
                  className="volume-fill rwa-fill" 
                  style={{ width: `${rwaPercentage}%` }}
                ></div>
              </div>
              <div className="asset-list">
                {rwaVolumeData.length > 0 ? (
                  rwaVolumeData.map((volumeInfo, index) => {
                    const assetInfo = getAssetName(volumeInfo.issuer, 'RWA');
                    return (
                      <div key={index} className="asset-volume-item">
                        <div className="asset-info">
                          <span className="asset-name">{assetInfo.name}</span>
                          <span className="asset-currency">{assetInfo.currency}</span>
                          <span className="asset-city">📍 {assetInfo.city}</span>
                        </div>
                        <div className="asset-volume">
                          <span className="volume-amount">${volumeInfo.volume24h.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                          <span className="transaction-count">({volumeInfo.transactionCount} txs)</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="no-volume">No RWA trading volume in the last 24 hours</div>
                )}
              </div>
            </div>

            <div className="breakdown-section">
              <div className="section-header">
                <h3>💰 Stablecoins</h3>
                <div className="section-stats">
                  <span className="volume-amount">${stablecoinVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  <span className="volume-percentage">({stablecoinPercentage.toFixed(1)}%)</span>
                </div>
              </div>
              <div className="volume-bar">
                <div 
                  className="volume-fill stablecoin-fill" 
                  style={{ width: `${stablecoinPercentage}%` }}
                ></div>
              </div>
              <div className="asset-list">
                {stablecoinVolumeData.length > 0 ? (
                  stablecoinVolumeData.map((volumeInfo, index) => {
                    const coinInfo = getAssetName(volumeInfo.issuer, 'Stablecoin');
                    return (
                      <div key={index} className="asset-volume-item">
                        <div className="asset-info">
                          <span className="asset-name">{coinInfo.name}</span>
                          <span className="asset-currency">{coinInfo.currency}</span>
                          <span className="asset-city">📍 {coinInfo.city}</span>
                        </div>
                        <div className="asset-volume">
                          <span className="volume-amount">${volumeInfo.volume24h.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                          <span className="transaction-count">({volumeInfo.transactionCount} txs)</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="no-volume">No stablecoin trading volume in the last 24 hours</div>
                )}
              </div>
            </div>
          </div>

          {/* Additional Insights */}
          {totalVolume > 0 && (
            <div className="volume-insights">
              <h3>💡 Insights</h3>
              <div className="insights-grid">
                <div className="insight-item">
                  <span className="insight-label">Most Active Asset Type:</span>
                  <span className="insight-value">
                    {rwaVolume > stablecoinVolume ? '🏢 RWAs' : '💰 Stablecoins'}
                  </span>
                </div>
                {totalStats.topIssuer && (
                  <div className="insight-item">
                    <span className="insight-label">Top Volume Asset:</span>
                    <span className="insight-value">
                      {getAssetName(totalStats.topIssuer.issuer, 
                        rwaIssuers.has(totalStats.topIssuer.issuer) ? 'RWA' : 'Stablecoin'
                      ).currency}
                    </span>
                  </div>
                )}
                <div className="insight-item">
                  <span className="insight-label">Avg Volume per Asset:</span>
                  <span className="insight-value">
                    ${(totalVolume / Math.max(totalStats.activeIssuers, 1)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            </div>
          )}

          {totalVolume === 0 && (
            <div className="no-data-message">
              <h3>📈 Getting Started</h3>
              <p>Volume data will appear here as transactions are detected on the XRPL. The system tracks all payments and trades involving tracked issuers in real-time.</p>
              <p>Currently monitoring {rwaData.reduce((sum, r) => sum + r.assets.length, 0)} RWA issuers and {stablecoinData.reduce((sum, r) => sum + r.coins.length, 0)} stablecoin issuers.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VolumeBreakdownModal;