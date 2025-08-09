import React, { useState } from 'react';
import { truncateAddress, getExplorerLink } from '../utils/formatters.js';

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

  const getGrowthTrend = (amount) => {
    // Simulate growth trends based on amount size
    const growth = Math.sin(Date.now() / 10000000 + amount / 1000000) * 15 + Math.random() * 10;
    return growth;
  };

  const getVolumeHistory = (amount) => {
    // Generate 7 days of volume data
    return Array.from({ length: 7 }, (_, i) => ({
      day: i + 1,
      volume: amount * (0.03 + Math.random() * 0.04)
    }));
  };

  const renderMiniChart = (data, color = '#00ff88') => {
    const maxVolume = Math.max(...data.map(d => d.volume));
    const minVolume = Math.min(...data.map(d => d.volume));
    const range = maxVolume - minVolume;
    
    return (
      <div className="mini-chart">
        {data.map((point, i) => {
          const height = range > 0 ? ((point.volume - minVolume) / range) * 20 + 5 : 12;
          return (
            <div 
              key={i}
              className="chart-bar"
              style={{ 
                height: `${height}px`,
                backgroundColor: color,
                opacity: 0.7 + (i * 0.04)
              }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <aside className="endpoints">
      <h1 className="title">Stablecoins</h1>
      <p className="tagline">on the XRPL {isLoading && '🔄'}</p>
      
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
        const regionTotal = region.coins.reduce((total, coin) => total + coin.amount, 0);
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
                <span className="region-total">${(regionTotal / 1000000).toFixed(1)}M</span>
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
                {truncateAddress(coin.issuer)}
              </a>
              <div className="asset-stats">
                <div className="asset-stat-item">
                  <span className="stat-label">MC</span>
                  <span>${coin.amount.toLocaleString()}</span>
                </div>
                <div className="asset-stat-item">
                  <span className="stat-label">24H VOL</span>
                  <span>${(coin.amount * 0.05).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
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
                  {stablecoinData.flatMap(region => region.coins).map(coin => {
                    const growth = getGrowthTrend(coin.amount);
                    const volumeData = getVolumeHistory(coin.amount);
                    return (
                      <div key={coin.name} className="growth-item">
                        <div className="growth-header">
                          <span className="asset-name-small">{coin.name}</span>
                          <span className={`growth-indicator ${growth >= 0 ? 'positive' : 'negative'}`}>
                            {growth >= 0 ? '↗' : '↘'} {Math.abs(growth).toFixed(1)}%
                          </span>
                        </div>
                        <div className="chart-container">
                          {renderMiniChart(volumeData, growth >= 0 ? '#00ff88' : '#ff4444')}
                          <span className="chart-label">7d volume</span>
                        </div>
                      </div>
                    );
                  })}
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
                      const regionTotal = region.coins.reduce((total, coin) => total + coin.amount, 0);
                      const totalMarketCap = stablecoinData.reduce((total, r) => 
                        total + r.coins.reduce((rTotal, coin) => rTotal + coin.amount, 0), 0
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
                            <div className="region-amount">${(regionTotal / 1000000).toFixed(1)}M</div>
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
