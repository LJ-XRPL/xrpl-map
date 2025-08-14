import React, { useState, useMemo, useEffect } from 'react';
import Globe from './components/Globe';
import Sidebar from './components/Sidebar';
import Stablecoins from './components/Stablecoins';
import TransactionFeed from './components/TransactionFeed';
import VolumeBreakdownModal from './components/VolumeBreakdownModal';
import rwaData from './data/rwas.js';
import stablecoinData from './data/stablecoins.js';
import { refreshAllSupplies } from './utils/supplyFetcher.js';
import { getVolumeDataForDisplay } from './utils/volumeIntegrator.js';
import { Analytics } from '@vercel/analytics/react';
import './styles/App.css';

function App() {
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [liveRwaData, setLiveRwaData] = useState(rwaData);
  const [liveStablecoinData, setLiveStablecoinData] = useState(stablecoinData);
  const [isLoadingSupplies, setIsLoadingSupplies] = useState(false);
  const [mobileActiveSection, setMobileActiveSection] = useState('rwas');
  const [isMobileTabExpanded, setIsMobileTabExpanded] = useState(false);
  const [volumeData, setVolumeData] = useState(null);
  const [isVolumeModalOpen, setIsVolumeModalOpen] = useState(false);
  const [activeTransactionFilters, setActiveTransactionFilters] = useState([
    'Payment', 'OfferCreate', 'OfferCancel', 'TrustSet', 'EscrowCreate', 'EscrowFinish', 'NFTokenMint', 'CheckCreate', 'CheckCash'
  ]); 
  // Chain selector state - commented out for now
  // const [selectedChain, setSelectedChain] = useState('xrpl');
  // const [isChainDropdownOpen, setIsChainDropdownOpen] = useState(false);
  // const chainDropdownRef = useRef(null);

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
        // Fallback to original data if refresh fails
        setLiveRwaData(rwaData);
        setLiveStablecoinData(stablecoinData);
      } finally {
        setIsLoadingSupplies(false);
      }
    };

    // Initial fetch with a delay to avoid blocking the UI
    const initialTimeout = setTimeout(fetchSupplies, 2000);
    
    // Refresh supply data every 5 minutes
    const interval = setInterval(fetchSupplies, 5 * 60 * 1000);
    
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, []);

  // Update volume data periodically
  useEffect(() => {
    const updateVolumeData = () => {
      const volumeInfo = getVolumeDataForDisplay(liveRwaData, liveStablecoinData);
      setVolumeData(volumeInfo);
    };

    // Initial update
    updateVolumeData();

    // Update every 30 seconds
    const volumeInterval = setInterval(updateVolumeData, 30000);

    return () => clearInterval(volumeInterval);
  }, [liveRwaData, liveStablecoinData]);

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
    
    // Use real volume data if available, otherwise fallback to simulated
    let total24hVolume = 0;
    if (volumeData && volumeData.totalStats) {
      total24hVolume = volumeData.totalStats.totalVolume;
    } else {
      // Fallback to simulated volume (5% of market cap)
      total24hVolume = totalMarketCap * 0.05;
    }

    return {
      totalSupply: totalMarketCap,
      marketCap: totalMarketCap,
      volume24h: total24hVolume
    };
  }, [liveRwaData, liveStablecoinData, volumeData]);

  // Close dropdown when clicking outside
  // Chain selector click outside handler - commented out for now
  // useEffect(() => {
  //   const handleClickOutside = (event) => {
  //     if (chainDropdownRef.current && !chainDropdownRef.current.contains(event.target)) {
  //       setIsChainDropdownOpen(false);
  //     }
  //   };

  //   document.addEventListener('mousedown', handleClickOutside);
  //   return () => {
  //     document.removeEventListener('mousedown', handleClickOutside);
  //   };
  // }, []);

  return (
    <div className="dashboard">
      <div className="title-bar">
        <div className="dashboard-title-container">
          {/* Chain Selector - Commented out for now
          <div className="chain-selector" ref={chainDropdownRef}>
            <button 
              className="chain-dropdown-btn"
              onClick={() => setIsChainDropdownOpen(!isChainDropdownOpen)}
            >
              <span className="chain-icon">
                {selectedChain === 'xrpl' ? '🟢' : '🟣'}
              </span>
              <span className="chain-name">
                {selectedChain === 'xrpl' ? 'XRPL' : 'Solana'}
              </span>
              <span className="dropdown-arrow">▼</span>
            </button>
            {isChainDropdownOpen && (
              <div className="chain-dropdown">
                <div 
                  className={`chain-option ${selectedChain === 'xrpl' ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedChain('xrpl');
                    setIsChainDropdownOpen(false);
                  }}
                >
                  <span className="chain-icon">🟢</span>
                  <span className="chain-name">XRPL</span>
                  <span className="chain-status">Live</span>
                </div>
                <div className="chain-option disabled">
                  <span className="chain-icon">🟣</span>
                  <span className="chain-name">Solana</span>
                  <span className="chain-status">Coming Soon</span>
                </div>
              </div>
            )}
          </div>
          */}
          <div className="dashboard-title">
            <h1>XRPL RWA HQ</h1>
            <p>Real-time RWA & stablecoin analytics. Watch TradFi come onchain.</p>

          </div>
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
          {/* <button className="volume-breakdown-btn" onClick={() => setIsVolumeModalOpen(true)}>
            <span className="btn-icon">📊</span>
            <span className="btn-text">Volume Breakdown</span>
          </button> */}
        </div>
      </div>
      {/* Mobile Pull-up Tab */}
      <div className={`mobile-pullup-tab ${isMobileTabExpanded ? 'expanded' : ''}`}>
        <div className="pullup-handle" onClick={() => setIsMobileTabExpanded(!isMobileTabExpanded)}>
          <div className="handle-indicator"></div>
        </div>
        
        <div className="pullup-content">
          <div className="pullup-tabs">
            <button 
              className={`pullup-tab ${mobileActiveSection === 'rwas' ? 'active' : ''}`}
              onClick={() => setMobileActiveSection('rwas')}
            >
              📊 Assets
            </button>
            <button 
              className={`pullup-tab ${mobileActiveSection === 'stablecoins' ? 'active' : ''}`}
              onClick={() => setMobileActiveSection('stablecoins')}
            >
              💰 Coins
            </button>
          </div>
          
          <div className="pullup-section-content">
            {mobileActiveSection === 'rwas' && (
              <Sidebar rwaData={volumeData ? volumeData.rwaData : liveRwaData} isLoading={isLoadingSupplies} />
            )}
            {mobileActiveSection === 'stablecoins' && (
              <Stablecoins stablecoinData={volumeData ? volumeData.stablecoinData : liveStablecoinData} isLoading={isLoadingSupplies} />
            )}
          </div>
        </div>
      </div>
      
      <div className="dashboard-content">
        <div className="desktop-sidebar">
          <Sidebar rwaData={volumeData ? volumeData.rwaData : liveRwaData} isLoading={isLoadingSupplies} />
        </div>
                <main className="main">
          <Globe 
            onTransactionUpdate={setRecentTransactions} 
            rwaData={liveRwaData} 
            stablecoinData={liveStablecoinData}
            activeTransactionFilters={activeTransactionFilters}
            onFilterChange={setActiveTransactionFilters}
          />
          {/* <div className="app-credit">
            <span>Crafted with ❤️ by </span>
            <a 
              href="https://x.com/luke_judges" 
              target="_blank" 
              rel="noopener noreferrer"
              className="credit-link"
            >
              @luke_judges
            </a>
          </div> */}
        </main>
        <div className="desktop-stablecoins">
          <Stablecoins stablecoinData={volumeData ? volumeData.stablecoinData : liveStablecoinData} isLoading={isLoadingSupplies} />
        </div>
      </div>
      <TransactionFeed transactions={recentTransactions} activeFilters={activeTransactionFilters} />
      
      {/* Volume Breakdown Modal */}
      <VolumeBreakdownModal 
        isOpen={isVolumeModalOpen}
        onClose={() => setIsVolumeModalOpen(false)}
        rwaData={liveRwaData}
        stablecoinData={liveStablecoinData}
      />
      
      <Analytics />
    </div>
  );
}

export default App;
