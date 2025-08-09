import React, { useState, useMemo, useEffect } from 'react';
import Globe from './components/Globe';
import Sidebar from './components/Sidebar';
import Stablecoins from './components/Stablecoins';
import TransactionFeed from './components/TransactionFeed';
import rwaData from './data/rwas.js';
import stablecoinData from './data/stablecoins.js';
import { refreshAllSupplies } from './utils/supplyFetcher.js';
import './App.css';

function App() {
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [liveRwaData, setLiveRwaData] = useState(rwaData);
  const [liveStablecoinData, setLiveStablecoinData] = useState(stablecoinData);
  const [isLoadingSupplies, setIsLoadingSupplies] = useState(false);
  const [mobileActiveSection, setMobileActiveSection] = useState('rwas'); // 'rwas' or 'stablecoins'

  // Fetch real-time supply data on component mount
  useEffect(() => {
    const fetchSupplies = async () => {
      setIsLoadingSupplies(true);
      try {
        const updatedData = await refreshAllSupplies(rwaData, stablecoinData);
        setLiveRwaData(updatedData.rwaData);
        setLiveStablecoinData(updatedData.stablecoinData);
      } catch (error) {
        console.error('Failed to fetch live supply data:', error);
      } finally {
        setIsLoadingSupplies(false);
      }
    };

    fetchSupplies();
    
    // Refresh supply data every 5 minutes
    const interval = setInterval(fetchSupplies, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculate total market cap from all assets using live data
  const totalStats = useMemo(() => {
    // Sum all RWA amounts
    const rwaTotal = liveRwaData.reduce((total, region) => {
      return total + region.assets.reduce((regionTotal, asset) => regionTotal + asset.amount, 0);
    }, 0);

    // Sum all stablecoin amounts
    const stablecoinTotal = liveStablecoinData.reduce((total, region) => {
      return total + region.coins.reduce((regionTotal, coin) => regionTotal + coin.amount, 0);
    }, 0);

    const totalMarketCap = rwaTotal + stablecoinTotal;
    const total24hVolume = totalMarketCap * 0.05; // 5% of market cap as 24h volume

    return {
      totalSupply: totalMarketCap,
      marketCap: totalMarketCap,
      volume24h: total24hVolume
    };
  }, [liveRwaData, liveStablecoinData]);

  return (
    <div className="dashboard">
      <div className="title-bar">
        <div className="dashboard-title">
          <h1>XRPL RWA HQ</h1>
          <p>Real-time RWA & stablecoin analytics. Watch TradFi come onchain.</p>
          {isLoadingSupplies && (
            <p style={{ color: '#00ff88', fontSize: '0.8rem', margin: '4px 0 0 0' }}>
              🔄 Updating supply data from XRPL...
            </p>
          )}
        </div>
        <div className="dashboard-stats">
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
      {/* Mobile Section Toggle - Above Globe */}
      <div className="mobile-section-toggle-container">
        <div className="mobile-section-toggle">
          <button 
            className={`mobile-toggle-btn ${mobileActiveSection === 'rwas' ? 'active' : ''}`}
            onClick={() => setMobileActiveSection('rwas')}
          >
            📊 Real-World Assets
          </button>
          <button 
            className={`mobile-toggle-btn ${mobileActiveSection === 'stablecoins' ? 'active' : ''}`}
            onClick={() => setMobileActiveSection('stablecoins')}
          >
            💰 Stablecoins
          </button>
        </div>
      </div>
      
      <div className="dashboard-content">
        <div className="desktop-sidebar">
          <Sidebar rwaData={liveRwaData} isLoading={isLoadingSupplies} />
        </div>
        <main className="main">
          <Globe onTransactionUpdate={setRecentTransactions} rwaData={liveRwaData} stablecoinData={liveStablecoinData} />
        </main>
        <div className="desktop-stablecoins">
          <Stablecoins stablecoinData={liveStablecoinData} isLoading={isLoadingSupplies} />
        </div>
        
        {/* Mobile Section Content - Below Globe */}
        <div className="mobile-section-container">
          <div className="mobile-section-content">
            {mobileActiveSection === 'rwas' && (
              <Sidebar rwaData={liveRwaData} isLoading={isLoadingSupplies} />
            )}
            {mobileActiveSection === 'stablecoins' && (
              <Stablecoins stablecoinData={liveStablecoinData} isLoading={isLoadingSupplies} />
            )}
          </div>
        </div>
      </div>
      <TransactionFeed transactions={recentTransactions} />
    </div>
  );
}

export default App;
