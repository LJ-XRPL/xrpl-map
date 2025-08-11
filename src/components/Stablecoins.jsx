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
    // More realistic stablecoin growth simulation (typically more stable)
    const marketCycle = Math.sin(Date.now() / 86400000) * 3; // Smaller volatility for stablecoins
    const volatility = (amount / 50000000) * 2; // Even more stable for larger stablecoins
    const growth = marketCycle + (Math.random() - 0.5) * volatility;
    return growth;
  };

  const getStablecoinGrowthData = (currentAmount) => {
    // Generate 90 days of stablecoin supply growth data
    const startingSupply = currentAmount * (0.2 + Math.random() * 0.3); // Started 20-50% of current
    return Array.from({ length: 90 }, (_, i) => {
      const dayOffset = i - 89;
      const adoptionRate = 0.025 + (Math.random() - 0.5) * 0.01; // 1.5-3.5% daily growth
      const supply = startingSupply * Math.pow(1 + adoptionRate, i);
      const utilization = 60 + Math.sin(i / 10) * 20 + (Math.random() * 10); // 50-90% utilization
      
      return {
        day: dayOffset,
        supply: Math.min(currentAmount * 1.05, supply), // Cap at 105% of current
        utilization: Math.max(30, Math.min(95, utilization)),
        adoptionRate: (supply / startingSupply - 1) * 100,
        date: new Date(Date.now() + dayOffset * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      };
    });
  };

  const renderLineChart = (data, color = '#ff6b6b', metric = 'price') => {
    const values = data.map(d => d[metric]);
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const range = maxValue - minValue || 0.01;
    
    const points = data.map((point, i) => {
      const x = (i / (data.length - 1)) * 280;
      const y = 40 - ((point[metric] - minValue) / range) * 35;
      return `${x},${y}`;
    }).join(' ');
    
    return (
      <div className="line-chart">
        <svg width="280" height="45" viewBox="0 0 280 45">
          <defs>
            <linearGradient id={`stablecoin-gradient-${metric}`} x1="0%" y1="0%" x2="0%" y2="100%">
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
            fill={`url(#stablecoin-gradient-${metric})`}
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

  const renderStablecoinTractionScatter = (coins) => {
    const maxAmount = Math.max(...coins.map(c => c.amount));
    
    return (
      <div className="scatter-plot">
        <svg width="280" height="120" viewBox="0 0 280 120">
          {[0, 1, 2, 3, 4].map(i => (
            <g key={i}>
              <line x1={i * 70} y1="0" x2={i * 70} y2="100" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
              <line x1="0" y1={i * 25} x2="280" y2={i * 25} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
            </g>
          ))}
          
          {coins.map((coin, i) => {
            const x = (coin.amount / maxAmount) * 260 + 10;
            const utilization = 60 + (Math.random() * 30); // 60-90% utilization
            const y = 90 - (utilization / 100) * 80;
            const size = Math.max(5, Math.min(12, Math.log10(coin.amount) - 2));
            const color = utilization > 75 ? '#00ff88' : utilization > 50 ? '#ffa500' : '#ff6b6b';
            
            return (
              <circle
                key={i}
                cx={x}
                cy={Math.max(10, Math.min(90, y))}
                r={size}
                fill={color}
                fillOpacity="0.8"
                stroke={color}
                strokeWidth="1.5"
                strokeOpacity="0.9"
              />
            );
          })}
          
          <text x="140" y="115" textAnchor="middle" fontSize="10" fill="#888">Supply (USD)</text>
          <text x="5" y="55" textAnchor="middle" fontSize="10" fill="#888" transform="rotate(-90 5 55)">Utilization (%)</text>
        </svg>
        <div className="scatter-legend">
          <div className="legend-item">
            <div className="legend-dot" style={{backgroundColor: '#00ff88'}}></div>
            <span>High Utilization (75%+)</span>
          </div>
          <div className="legend-item">
            <div className="legend-dot" style={{backgroundColor: '#ffa500'}}></div>
            <span>Medium Utilization (50-75%)</span>
          </div>
          <div className="legend-item">
            <div className="legend-dot" style={{backgroundColor: '#ff6b6b'}}></div>
            <span>Low Utilization (&lt;50%)</span>
          </div>
        </div>
      </div>
    );
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
                  <span className="stat-label">24H VOL {coin.volume24h && coin.volume24h > 0 ? '🟢' : '⚪'}</span>
                  <span>${(coin.volume24h || (coin.amount * 0.05)).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
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
                    .sort((a, b) => b.amount - a.amount)
                    .slice(0, 2)
                    .map(coin => {
                    const growth = getGrowthTrend(coin.amount);
                    const supplyGrowthData = getStablecoinGrowthData(coin.amount);
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
                      const supplyGrowthData = getStablecoinGrowthData(coin.amount);
                      const totalGrowth = ((coin.amount / (coin.amount * 0.25)) - 1) * 100;
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

