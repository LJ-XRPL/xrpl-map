import React, { useState, useMemo, useEffect } from 'react';
import Globe from './components/Globe';
import Sidebar from './components/Sidebar';
import Stablecoins from './components/Stablecoins';
import TransactionFeed from './components/TransactionFeed';
import VolumeBreakdownModal from './components/VolumeBreakdownModal';
import VoiceQuery from './components/VoiceQuery';

import rwaData from './data/rwas.js';
import stablecoinData from './data/stablecoins.js';
import { refreshAllSupplies } from './utils/supplyFetcher.js';
import volumeManager from './utils/volumeManager.js';
import marketCapManager from './utils/marketCapManager.js';
import { Analytics } from '@vercel/analytics/react';
import './styles/App.css';

function App() {
  const [recentTransactions, setRecentTransactions] = useState([]);
  
  // Debug: Log when transactions are updated
  useEffect(() => {
    console.log(`🔄 Recent transactions updated: ${recentTransactions.length} transactions`);
    if (recentTransactions.length > 0) {
      console.log(`📋 Latest transaction:`, recentTransactions[0]);
    }
  }, [recentTransactions]);
  const [liveRwaData, setLiveRwaData] = useState(rwaData);
  const [liveStablecoinData, setLiveStablecoinData] = useState(stablecoinData);
  const [isLoadingSupplies, setIsLoadingSupplies] = useState(false);
  const [mobileActiveSection, setMobileActiveSection] = useState('rwas');
  const [isMobileTabExpanded, setIsMobileTabExpanded] = useState(false);

  const [isVolumeModalOpen, setIsVolumeModalOpen] = useState(false);
  const [activeTransactionFilters, setActiveTransactionFilters] = useState([
    'Payment', 'OfferCreate', 'OfferCancel', 'TrustSet', 'EscrowCreate', 'EscrowFinish', 'NFTokenMint', 'CheckCreate', 'CheckCash'
  ]); 
  const [voiceQueryResult, setVoiceQueryResult] = useState(null);
  const [voiceResponse, setVoiceResponse] = useState(null);
  
  // Use voice query results for debugging/logging
  useEffect(() => {
    if (voiceQueryResult) {
      console.log('🎤 Voice query processed:', voiceQueryResult);
    }
  }, [voiceQueryResult]);
  
  useEffect(() => {
    if (voiceResponse) {
      console.log('🔊 Voice response received:', voiceResponse);
    }
  }, [voiceResponse]);
  // Chain selector state - commented out for now
  // const [selectedChain, setSelectedChain] = useState('xrpl');
  // const [isChainDropdownOpen, setIsChainDropdownOpen] = useState(false);
  // const chainDropdownRef = useRef(null);

  // Clear all volume data on app load
  useEffect(() => {
    console.log('🗑️ Clearing all volume data on app load...');
    volumeManager.clearData();
    
    // Also clear any cached volume data from localStorage
    try {
      localStorage.removeItem('xrpl_volume_cache');
      console.log('🗑️ Cleared cached volume data from localStorage');
    } catch (error) {
      console.error('Failed to clear cached volume data:', error);
    }
    
    console.log('📊 Volume tracking ready for legitimate on-chain data only');
  }, []);

  // Fetch real-time supply data on component mount
  useEffect(() => {
    const fetchSupplies = async () => {
      setIsLoadingSupplies(true);
      try {
        const updatedData = await refreshAllSupplies(rwaData, stablecoinData);
        // Update asset data with calculated market caps
        const dataWithMarketCaps = marketCapManager.updateAssetDataWithMarketCaps(updatedData.rwaData, updatedData.stablecoinData);
        setLiveRwaData(dataWithMarketCaps.rwaData);
        setLiveStablecoinData(dataWithMarketCaps.stablecoinData);
      } catch (error) {
        console.error('Failed to fetch live supply data:', error);
        // Don't fallback to hardcoded data - use empty data instead
        setLiveRwaData([]);
        setLiveStablecoinData([]);
      } finally {
        setIsLoadingSupplies(false);
      }
    };

    // Initial fetch with a shorter delay to improve perceived performance
    const initialTimeout = setTimeout(fetchSupplies, 500);
    
    // Refresh supply data every 10 minutes (reduced frequency)
    const interval = setInterval(fetchSupplies, 10 * 60 * 1000);
    
    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, []);

  // Simple volume update - just apply volume to current data
  useEffect(() => {
    const updateVolumeData = () => {
      if (liveRwaData && liveRwaData.length > 0) {
        const updatedRwaData = volumeManager.updateAssetDataWithVolume(liveRwaData);
        setLiveRwaData(updatedRwaData);
      }

      if (liveStablecoinData && liveStablecoinData.length > 0) {
        const updatedStablecoinData = volumeManager.updateAssetDataWithVolume(liveStablecoinData);
        setLiveStablecoinData(updatedStablecoinData);
      }
    };

    // Update volume data every 30 seconds
    const volumeInterval = setInterval(updateVolumeData, 30000);
    
    // Debug: Log volume state every 5 minutes
    const debugInterval = setInterval(() => {
      volumeManager.logVolumeState();
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(volumeInterval);
      clearInterval(debugInterval);
    };
  }, [liveRwaData, liveStablecoinData]);



  // Calculate total market cap from all assets using live data
  const totalStats = useMemo(() => {
    // Use the new market cap manager
    const marketStats = marketCapManager.getMarketStatistics(liveRwaData, liveStablecoinData);
    
    // Use real on-chain volume from volume manager
    const total24hVolume = volumeManager.getTotalVolume();

    return {
      totalSupply: marketStats.totalMarketCap,
      marketCap: marketStats.totalMarketCap,
      volume24h: total24hVolume,
      activeAssets: marketStats.activeAssets,
      totalAssets: marketStats.totalAssets,
      volumeToMarketCapRatio: total24hVolume > 0 ? (total24hVolume / marketStats.totalMarketCap) : 0
    };
  }, [liveRwaData, liveStablecoinData]);

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
            <div className="stat-label">Volume</div>
            <div className="stat-value">${(totalStats.volume24h / 1000000).toFixed(2)}M</div>
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
              <Sidebar rwaData={liveRwaData} isLoading={isLoadingSupplies} />
            )}
            {mobileActiveSection === 'stablecoins' && (
              <Stablecoins stablecoinData={liveStablecoinData} isLoading={isLoadingSupplies} />
            )}
          </div>
        </div>
      </div>
      
      <div className="dashboard-content">
        <div className="desktop-sidebar">
          <Sidebar rwaData={liveRwaData} isLoading={isLoadingSupplies} />
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
          <Stablecoins stablecoinData={liveStablecoinData} isLoading={isLoadingSupplies} />
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
      
      {/* Voice Query Interface - Floating Button */}
      <VoiceQuery 
        onQueryResult={(query, transcript) => {
          setVoiceQueryResult({ query, transcript });
          console.log('🎤 Voice query:', transcript, query);
        }}
        onVoiceResponse={(response, naturalResponse) => {
          setVoiceResponse({ response, naturalResponse });
          console.log('🔊 Voice response:', naturalResponse);
        }}
      />
    </div>
  );
}

export default App;
