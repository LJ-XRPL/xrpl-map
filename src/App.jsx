import React, { useState } from 'react';
import Globe from './components/Globe';
import Sidebar from './components/Sidebar';
import Stablecoins from './components/Stablecoins';
import TransactionFeed from './components/TransactionFeed';
import './App.css';

function App() {
  const [recentTransactions, setRecentTransactions] = useState([]);

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
            <div className="stat-value">96,857,996</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Market Cap</div>
            <div className="stat-value">$96.8M</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">24h Volume</div>
            <div className="stat-value">$4.8M</div>
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
