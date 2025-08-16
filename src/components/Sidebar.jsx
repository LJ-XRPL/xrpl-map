import React, { useState } from 'react';
import { truncateAddress, getExplorerLink } from '../utils/formatters.js';
import { renderLineChart, renderMarketCapGrowthScatter, getGrowthTrend } from '../utils/chartUtils.js';
import marketCapManager from '../utils/marketCapManager.js';

const Sidebar = ({ rwaData, isLoading }) => {

  const [collapsedRegions, setCollapsedRegions] = useState({});
  const [collapsedAnalytics, setCollapsedAnalytics] = useState({});
  const [activeTab, setActiveTab] = useState('assets');

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
  <aside className="sidebar">
      <h1 className="title">Real-World Assets</h1>
      
      <div className="tab-container">
        <div className="tab-buttons">
          <button 
            className={`tab-button ${activeTab === 'assets' ? 'active' : ''}`}
            onClick={() => setActiveTab('assets')}
          >
            📊 Assets
          </button>
          <button 
            className={`tab-button ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            📈 Analytics
          </button>
        </div>
        
        <div className="tab-content">
          {activeTab === 'assets' && (
            <div className="assets-view">
              {rwaData.map(region => {
                              const regionTotal = region.assets.reduce((total, asset) => total + (asset.amount || 0), 0);
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
            {!collapsedRegions[region.region] && region.assets.map(asset => (
              <div className="asset" key={asset.name}>
              <p className="asset-name">{asset.name}</p>
              <p className="asset-city">{asset.city}</p>
              <div className="asset-issuer-container">
                <span className="flag-emoji">
                  {asset.city === 'New York' && '🇺🇸'}
                  {asset.city === 'São Paulo' && '🇧🇷'}
                  {asset.city === 'Paris' && '🇫🇷'}
                  {asset.city === 'Singapore' && '🇸🇬'}
                  {asset.city === 'Dubai' && '🇦🇪'}
                  {asset.city === 'London' && '🇬🇧'}
                  {asset.city === 'Riyadh' && '🇸🇦'}
                </span>
                {Array.isArray(asset.issuer) 
                  ? asset.issuer.map((addr, idx) => (
                      <a 
                        key={idx}
                        href={getExplorerLink(addr)} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="asset-issuer-link"
                      >
                        {truncateAddress(addr)}
                        {idx < asset.issuer.length - 1 && <br />}
                      </a>
                    ))
                  : (
                      <a 
                        href={getExplorerLink(asset.issuer)} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="asset-issuer-link"
                      >
                        {truncateAddress(asset.issuer)}
                      </a>
                    )
                }
              </div>
              <div className="asset-stats">
                <div className="asset-stat-item">
                  <span className="stat-label">MC</span>
                  <span>${((asset.amount || 0) / 1000000).toFixed(2)}M</span>
                </div>
                <div className="asset-stat-item">
                  <span className="stat-label">VOL {asset.volume24h && asset.volume24h > 0 ? '🟢' : '⚪'}</span>
                  <span>${((asset.volume24h || 0) / 1000000).toFixed(2)}M</span>
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
                  {/* Market Cap Growth Overview */}
                  <div className="chart-section">
                    <h4 className="chart-title">Market Cap vs Growth Rate Analysis</h4>
                    {renderMarketCapGrowthScatter(rwaData.flatMap(region => region.assets))}
                  </div>
                  
                  {/* Top Growing Assets */}
                  {rwaData.flatMap(region => region.assets)
                    .sort((a, b) => getGrowthTrend(b.amount) - getGrowthTrend(a.amount))
                    .slice(0, 3)
                    .map(asset => {
                    const growth = getGrowthTrend(asset.amount || 0);
                    const marketCapData = marketCapManager.getMarketCapGrowthData(asset.amount || 0);
                    return (
                      <div key={asset.name} className="growth-item">
                        <div className="growth-header">
                          <span className="asset-name-small">{asset.name}</span>
                          <span className={`growth-indicator ${growth >= 0 ? 'positive' : 'negative'}`}>
                            {growth >= 0 ? '📈' : '📉'} {Math.abs(growth).toFixed(1)}%
                          </span>
                        </div>
                        <div className="chart-container">
                          {renderLineChart(marketCapData, growth >= 0 ? '#00ff88' : '#ff4444', 'marketCap')}
                          <span className="chart-label">90-day market cap growth</span>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Traction & Adoption Metrics */}
                  <div className="chart-section">
                    <h4 className="chart-title">Adoption Traction</h4>
                    {rwaData.flatMap(region => region.assets).slice(0, 2).map(asset => {
                      const marketCapData = marketCapManager.getMarketCapGrowthData(asset.amount || 0);
                      const totalGrowth = (((asset.amount || 0) / ((asset.amount || 0) * 0.35)) - 1) * 100;
                      return (
                        <div key={`traction-${asset.name}`} className="volume-chart">
                          <span className="volume-label">{asset.name} - Adoption Rate (+{totalGrowth.toFixed(0)}%)</span>
                          {renderLineChart(marketCapData, '#ffa500', 'adoptionRate')}
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
                    {rwaData.map(region => {
                      const regionTotal = region.assets.reduce((total, asset) => total + (asset.amount || 0), 0);
                                              const totalMarketCap = rwaData.reduce((total, r) => 
                          total + r.assets.reduce((rTotal, asset) => rTotal + (asset.amount || 0), 0), 0
                        );
                      const percentage = ((regionTotal / totalMarketCap) * 100).toFixed(1);
                      
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

export default Sidebar;

