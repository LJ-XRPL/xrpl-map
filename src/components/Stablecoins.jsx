import React from 'react';
import stablecoinData from '../data/stablecoins.js';

const Stablecoins = () => (
  <aside className="endpoints">
    <h1 className="title">Stablecoins</h1>
    <p className="tagline">on the XRPL</p>
    {stablecoinData.map(region => (
      <div className="section" key={region.region}>
        <h2>{region.region}</h2>
        {region.coins.map(coin => (
          <div className="asset" key={coin.name}>
            <p className="asset-name">{coin.name}</p>
            <p className="asset-city">{coin.city}</p>
            <p className="asset-issuer">{coin.issuer}</p>
            <p className="asset-amount">
              {coin.amount.toLocaleString()} {coin.currency}
            </p>
          </div>
        ))}
      </div>
    ))}
  </aside>
);

export default Stablecoins;
