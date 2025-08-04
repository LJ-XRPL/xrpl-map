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