import React, { useState } from 'react';
import rwaData from '../data/rwas.js';
import { truncateAddress, getExplorerLink } from '../utils/formatters.js';

const Sidebar = () => {
  const [collapsedRegions, setCollapsedRegions] = useState({});

  const toggleRegion = (regionName) => {
    setCollapsedRegions(prev => ({
      ...prev,
      [regionName]: !prev[regionName]
    }));
  };

  return (
    <aside className="sidebar">
      <h1 className="title">Real-World Assets</h1>
      <p className="tagline">on the XRPL</p>
      {rwaData.map(region => (
        <div className="section" key={region.region}>
          <h2 
            className="section-header" 
            onClick={() => toggleRegion(region.region)}
          >
            <span className={`collapse-icon ${collapsedRegions[region.region] ? 'collapsed' : ''}`}>
              ▼
            </span>
            {region.region}
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
                </span>
                {truncateAddress(asset.issuer)}
              </a>
              <div className="asset-stats">
                <div className="asset-stat-item">
                  <span className="stat-label">MC</span>
                  <span>${asset.amount.toLocaleString()}</span>
                </div>
                <div className="asset-stat-item">
                  <span className="stat-label">24H VOL</span>
                  <span>${(asset.amount * 0.05).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </aside>
  );
};

export default Sidebar;
