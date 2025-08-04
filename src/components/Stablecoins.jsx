import React, { useState } from 'react';
import stablecoinData from '../data/stablecoins.js';
import { truncateAddress, getExplorerLink } from '../utils/formatters.js';

const Stablecoins = () => {
  const [collapsedRegions, setCollapsedRegions] = useState({});

  const toggleRegion = (regionName) => {
    setCollapsedRegions(prev => ({
      ...prev,
      [regionName]: !prev[regionName]
    }));
  };

  return (
    <aside className="endpoints">
      <h1 className="title">Stablecoins</h1>
      <p className="tagline">on the XRPL</p>
      {stablecoinData.map(region => (
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
      ))}
    </aside>
  );
};

export default Stablecoins;
