import React, { useState } from 'react';
import { truncateAddress, getExplorerLink } from '../utils/formatters.js';
import { renderLineChart, renderStablecoinTractionScatter, getGrowthTrend } from '../utils/chartUtils.js';
import marketCapManager from '../utils/marketCapManager.js';

const Stablecoins = ({ stablecoinData, isLoading }) => {

  const [collapsedRegions, setCollapsedRegions] = useState({});
  const [collapsedAnalytics, setCollapsedAnalytics] = useState({});
  const [activeTab, setActiveTab] = useState('coins');

  const toggleRegion = (regionName) => {
    setCollapsedRegions(prev => ({
      ...prev,
      [regionName]: !prev[regionName]
    }));
  };

  const toggleAnalyticsSection = (sectionName) => {
    setCollapsedAnalytics(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };





  return (
  <aside className="endpoints">
      <h1 className="title">Stablecoins</h1>
      
      <div className="tab-container">
        <div className="tab-buttons">
          <button 
            className={`tab-button ${activeTab === 'coins' ? 'active' : ''}`}
            onClick={() => setActiveTab('coins')}
          >
            💰 Coins
          </button>
          <button 
            className={`tab-button ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            📈 Analytics
          </button>
        </div>
        
        <div className="tab-content">
          {activeTab === 'coins' && (
            <div className="coins-view">
              {stablecoinData.map(region => {
        const regionTotal = region.coins.reduce((total, coin) => total + (coin.amount || 0), 0);
        return (
          <div className="section" key={region.region}>
            <h2 
              className="section-header" 
              onClick={() => toggleRegion(region.region)}
            >
              <span className={`collapse-icon ${collapsedRegions[region.region] ? 'collapsed' : ''}`}>
                ▼
              </span>
              <div className="region-info">
                <span className="region-name">{region.region}</span>
                <span className="region-total">${(regionTotal / 1000000).toFixed(2)}M</span>
              </div>
            </h2>
          {!collapsedRegions[region.region] && region.coins.map(coin => (
            <div className="asset" key={coin.name}>
              <p className="asset-name">{coin.name}</p>
              <p className="asset-city">{coin.city}</p>
              <a 
                href={getExplorerLink(coin.issuer)} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="asset-issuer"
              >
                <span className="flag-emoji">
                  {coin.city === 'New York' && '🇺🇸'}
                  {coin.city === 'São Paulo' && '🇧🇷'}
                  {coin.city === 'Paris' && '🇫🇷'}
                </span>
                {Array.isArray(coin.issuer) 
                  ? coin.issuer.map((addr, idx) => (
                      <span key={idx}>
                        {truncateAddress(addr)}
                        {idx < coin.issuer.length - 1 && <br />}
                      </span>
                    ))
                  : truncateAddress(coin.issuer)
                }
              </a>
              <div className="asset-stats">
                <div className="asset-stat-item">
                  <span className="stat-label">MC</span>
                  <span>${((coin.amount || 0) / 1000000).toFixed(2)}M</span>
                </div>
                <div className="asset-stat-item">
                  <span className="stat-label">VOL {coin.volume24h && coin.volume24h > 0 ? '🟢' : '⚪'}</span>
                  <span>${((coin.volume24h || 0) / 1000000).toFixed(2)}M</span>
                </div>
              </div>
            </div>
                ))}
              </div>
            );
          })}
            </div>
          )}
          
          {activeTab === 'analytics' && (
            <div className="analytics-view">
              <div className="analytics-summary">
                <h3 
                  className="analytics-header" 
                  onClick={() => toggleAnalyticsSection('growth')}
                >
                  <span className={`collapse-icon ${collapsedAnalytics['growth'] ? 'collapsed' : ''}`}>
                    ▼
                  </span>
                  Growth Overview
                </h3>
                {!collapsedAnalytics['growth'] && (
                <div className="growth-metrics">
                  {/* Supply Growth & Utilization Overview */}
                  <div className="chart-section">
                    <h4 className="chart-title">Supply vs Utilization Traction</h4>
                    {renderStablecoinTractionScatter(stablecoinData.flatMap(region => region.coins))}
                  </div>
                  
                  {/* Top Growing Stablecoins */}
                  {stablecoinData.flatMap(region => region.coins)
                    .sort((a, b) => (b.amount || 0) - (a.amount || 0))
                    .slice(0, 2)
                    .map(coin => {
                    const growth = getGrowthTrend(coin.amount || 0);
                    const supplyGrowthData = marketCapManager.getStablecoinGrowthData(coin.amount || 0);
                    return (
                      <div key={coin.name} className="growth-item">
                        <div className="growth-header">
                          <span className="asset-name-small">{coin.name}</span>
                          <span className={`growth-indicator ${growth >= 0 ? 'positive' : 'negative'}`}>
                            {growth >= 0 ? '📈' : '📉'} {Math.abs(growth).toFixed(1)}%
                          </span>
                        </div>
                        <div className="chart-container">
                          {renderLineChart(supplyGrowthData, growth >= 0 ? '#00ff88' : '#ff4444', 'supply')}
                          <span className="chart-label">90-day supply growth</span>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Adoption & Market Penetration */}
                  <div className="chart-section">
                    <h4 className="chart-title">Market Adoption Metrics</h4>
                    {stablecoinData.flatMap(region => region.coins).slice(0, 3).map(coin => {
                      const supplyGrowthData = marketCapManager.getStablecoinGrowthData(coin.amount || 0);
                      const totalGrowth = (((coin.amount || 0) / ((coin.amount || 0) * 0.25)) - 1) * 100;
                      return (
                        <div key={`adoption-${coin.name}`} className="volume-chart">
                          <span className="volume-label">{coin.name} - Market Penetration (+{totalGrowth.toFixed(0)}%)</span>
                          {renderLineChart(supplyGrowthData, '#ff6b6b', 'utilization')}
                        </div>
                      );
                    })}
                  </div>
                </div>
                )}
              </div>
              
              <div className="regional-breakdown">
                <h3 
                  className="analytics-header" 
                  onClick={() => toggleAnalyticsSection('regional')}
                >
                  <span className={`collapse-icon ${collapsedAnalytics['regional'] ? 'collapsed' : ''}`}>
                    ▼
                  </span>
                  Regional Distribution
                </h3>
                {!collapsedAnalytics['regional'] && (
                  <div>
                    {stablecoinData.map(region => {
                      const regionTotal = region.coins.reduce((total, coin) => total + (coin.amount || 0), 0);
                      const totalMarketCap = stablecoinData.reduce((total, r) => 
                        total + r.coins.reduce((rTotal, coin) => rTotal + (coin.amount || 0), 0), 0
                      );
                      const percentage = totalMarketCap > 0 ? ((regionTotal / totalMarketCap) * 100).toFixed(1) : '0.0';
                      
                      return (
                        <div key={region.region} className="regional-stat">
                          <div className="region-bar-container">
                            <div className="region-label">
                              <span>{region.region}</span>
                              <span className="region-percentage">{percentage}%</span>
                            </div>
                            <div className="region-bar">
                              <div 
                                className="region-fill" 
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <div className="region-amount">${(regionTotal / 1000000).toFixed(2)}M</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
  </aside>
);
};

export default Stablecoins;

