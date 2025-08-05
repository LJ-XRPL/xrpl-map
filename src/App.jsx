import React, { useState, useMemo } from 'react';
import Globe from './components/Globe';
import Sidebar from './components/Sidebar';
import Stablecoins from './components/Stablecoins';
import TransactionFeed from './components/TransactionFeed';
import rwaData from './data/rwas.js';
import stablecoinData from './data/stablecoins.js';
import './App.css';

function App() {
  const [recentTransactions, setRecentTransactions] = useState([]);

  // Calculate total market cap from all assets
  const totalStats = useMemo(() => {
    // Sum all RWA amounts
    const rwaTotal = rwaData.reduce((total, region) => {
      return total + region.assets.reduce((regionTotal, asset) => regionTotal + asset.amount, 0);
    }, 0);

    // Sum all stablecoin amounts
    const stablecoinTotal = stablecoinData.reduce((total, region) => {
      return total + region.coins.reduce((regionTotal, coin) => regionTotal + coin.amount, 0);
    }, 0);

    const totalMarketCap = rwaTotal + stablecoinTotal;
    const total24hVolume = totalMarketCap * 0.05; // 5% of market cap as 24h volume

    return {
      totalSupply: totalMarketCap,
      marketCap: totalMarketCap,
      volume24h: total24hVolume
    };
  }, []);

  return (
    <div className="dashboard">
      <div className="title-bar">
        <div className="dashboard-title">
          <h1>XRPL RWA HQ</h1>
          <p>Real-time RWA & stablecoin analytics. Watch TradFi come onchain.</p>
        </div>
        <div className="dashboard-stats">
          <div className="stat-item">
            <div className="stat-label">Total Supply</div>
            <div className="stat-value">{totalStats.totalSupply.toLocaleString()}</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Market Cap</div>
            <div className="stat-value">${(totalStats.marketCap / 1000000).toFixed(1)}M</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">24h Volume</div>
            <div className="stat-value">${(totalStats.volume24h / 1000000).toFixed(1)}M</div>
          </div>
        </div>
      </div>
      <div className="dashboard-content">
        <Sidebar />
        <main className="main">
          <Globe onTransactionUpdate={setRecentTransactions} />
        </main>
        <Stablecoins />
      </div>
      <TransactionFeed transactions={recentTransactions} />
    </div>
  );
}

export default App;
