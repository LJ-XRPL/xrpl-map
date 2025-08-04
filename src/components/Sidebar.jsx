import React from 'react';
import rwaData from '../data/rwas.js';

const Sidebar = () => (
  <aside className="sidebar">
    <h1 className="title">Real-World Assets</h1>
    <p className="tagline">on the XRPL</p>
    {rwaData.map(region => (
      <div className="section" key={region.region}>
        <h2>{region.region}</h2>
        {region.assets.map(asset => (
          <div className="asset" key={asset.name}>
            <p className="asset-name">{asset.name}</p>
            <p className="asset-city">{asset.city}</p>
            <p className="asset-issuer">{asset.issuer}</p>
            <p className="asset-amount">
              {asset.amount.toLocaleString()} {asset.currency}
            </p>
          </div>
        ))}
      </div>
    ))}
  </aside>
);

export default Sidebar;
