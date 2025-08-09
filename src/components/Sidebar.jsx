import React, { useState } from 'react';
import { truncateAddress, getExplorerLink } from '../utils/formatters.js';

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

  const getGrowthTrend = (amount) => {
    // More realistic growth simulation based on market conditions
    const marketCycle = Math.sin(Date.now() / 86400000) * 8; // Daily cycle
    const volatility = (amount / 10000000) * 5; // Larger assets more stable
    const growth = marketCycle + (Math.random() - 0.5) * volatility;
    return growth;
  };

  const getMarketCapGrowthData = (currentAmount) => {
    // Generate 90 days of market cap growth data
    const startingCap = currentAmount * (0.3 + Math.random() * 0.4); // Started 30-70% of current
    return Array.from({ length: 90 }, (_, i) => {
      const dayOffset = i - 89;
      const growthRate = 0.02 + (Math.random() - 0.5) * 0.015; // 0.5-3.5% daily growth
      const marketCap = startingCap * Math.pow(1 + growthRate, i);
      const traction = Math.log10(marketCap / 1000000) * 20 + (Math.random() * 10); // Traction score
      
      return {
        day: dayOffset,
        marketCap: Math.min(currentAmount * 1.1, marketCap), // Cap at 110% of current
        traction: Math.max(0, Math.min(100, traction)),
        adoptionRate: (marketCap / startingCap - 1) * 100, // Growth percentage
        date: new Date(Date.now() + dayOffset * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      };
    });
  };

  const renderLineChart = (data, color = '#00ff88', metric = 'price') => {
    const values = data.map(d => d[metric]);
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const range = maxValue - minValue || 1;
    
    const points = data.map((point, i) => {
      const x = (i / (data.length - 1)) * 280; // Chart width
      const y = 40 - ((point[metric] - minValue) / range) * 35; // Invert Y for SVG
      return `${x},${y}`;
    }).join(' ');
    
    return (
      <div className="line-chart">
        <svg width="280" height="45" viewBox="0 0 280 45">
          <defs>
            <linearGradient id={`gradient-${metric}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
              <stop offset="100%" stopColor={color} stopOpacity="0.1"/>
            </linearGradient>
          </defs>
          <polyline
            points={points}
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points={`${points} 280,40 0,40`}
            fill={`url(#gradient-${metric})`}
            stroke="none"
          />
          {data.map((point, i) => {
            const x = (i / (data.length - 1)) * 280;
            const y = 40 - ((point[metric] - minValue) / range) * 35;
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="1.5"
                fill={color}
                opacity="0.8"
              />
            );
          })}
        </svg>
        <div className="chart-labels">
          <span className="chart-start">{data[0]?.date}</span>
          <span className="chart-end">{data[data.length - 1]?.date}</span>
        </div>
      </div>
    );
  };

  const renderMarketCapGrowthScatter = (assets) => {
    const maxAmount = Math.max(...assets.map(a => a.amount));
    const minAmount = Math.min(...assets.map(a => a.amount));
    
    return (
      <div className="scatter-plot">
        <svg width="280" height="120" viewBox="0 0 280 120">
          <defs>
            <linearGradient id="growth-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ff4444" stopOpacity="0.2"/>
              <stop offset="100%" stopColor="#00ff88" stopOpacity="0.2"/>
            </linearGradient>
          </defs>
          
          {[0, 1, 2, 3, 4].map(i => (
            <g key={i}>
              <line x1={i * 70} y1="0" x2={i * 70} y2="100" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
              <line x1="0" y1={i * 25} x2="280" y2={i * 25} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
            </g>
          ))}
          
          {assets.map((asset, i) => {
            const x = (asset.amount / maxAmount) * 260 + 10;
            const growthRate = getGrowthTrend(asset.amount);
            const y = 90 - ((growthRate + 15) / 30) * 80; // Map -15% to +15% growth
            const size = Math.max(4, Math.min(10, Math.log10(asset.amount) - 4));
            const color = growthRate >= 0 ? '#00ff88' : '#ff4444';
            
            return (
              <circle
                key={i}
                cx={x}
                cy={Math.max(10, Math.min(90, y))}
                r={size}
                fill={color}
                fillOpacity="0.7"
                stroke={color}
                strokeWidth="1.5"
                strokeOpacity="0.9"
              />
            );
          })}
          
          <text x="140" y="115" textAnchor="middle" fontSize="10" fill="#888">Market Cap (USD)</text>
          <text x="5" y="55" textAnchor="middle" fontSize="10" fill="#888" transform="rotate(-90 5 55)">Growth Rate (%)</text>
        </svg>
        <div className="scatter-legend">
          <div className="legend-item">
            <div className="legend-dot" style={{backgroundColor: '#00ff88'}}></div>
            <span>Growing Assets</span>
          </div>
          <div className="legend-item">
            <div className="legend-dot" style={{backgroundColor: '#ff4444'}}></div>
            <span>Declining Assets</span>
          </div>
        </div>
      </div>
    );
  };

  return (
  <aside className="sidebar">
      <h1 className="title">Real-World Assets</h1>
      <p className="tagline">{isLoading && '🔄 Loading...'}</p>
      
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
        const regionTotal = region.assets.reduce((total, asset) => total + asset.amount, 0);
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
            {!collapsedRegions[region.region] && region.assets.map(asset => (
              <div className="asset" key={asset.name}>
              <p className="asset-name">{asset.name}</p>
              <p className="asset-city">{asset.city}</p>
              <a 
                href={getExplorerLink(asset.issuer)} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="asset-issuer"
              >
                <span className="flag-emoji">
                  {asset.city === 'New York' && '🇺🇸'}
                  {asset.city === 'São Paulo' && '🇧🇷'}
                  {asset.city === 'Paris' && '🇫🇷'}
                  {asset.city === 'Singapore' && '🇸🇬'}
                  {asset.city === 'Dubai' && '🇦🇪'}
                  {asset.city === 'London' && '🇬🇧'}
                  {asset.city === 'Riyadh' && '🇸🇦'}
                </span>
                {truncateAddress(asset.issuer)}
              </a>
              <div className="asset-stats">
                <div className="asset-stat-item">
                  <span className="stat-label">MC</span>
                  <span>${asset.amount.toLocaleString()}</span>
                </div>
                <div className="asset-stat-item">
                  <span className="stat-label">24H VOL {asset.volume24h && asset.volume24h > 0 ? '🟢' : '⚪'}</span>
                  <span>${(asset.volume24h || (asset.amount * 0.05)).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
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
                    const growth = getGrowthTrend(asset.amount);
                    const marketCapData = getMarketCapGrowthData(asset.amount);
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
                      const marketCapData = getMarketCapGrowthData(asset.amount);
                      const totalGrowth = ((asset.amount / (asset.amount * 0.35)) - 1) * 100;
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
                      const regionTotal = region.assets.reduce((total, asset) => total + asset.amount, 0);
                      const totalMarketCap = rwaData.reduce((total, r) => 
                        total + r.assets.reduce((rTotal, asset) => rTotal + asset.amount, 0), 0
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

export default Sidebar;

