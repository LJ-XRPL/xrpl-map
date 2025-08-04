import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import GlobeGL from 'react-globe.gl';
import rwaData from '../data/rwas.js';
import stablecoinData from '../data/stablecoins.js';
import { simulateTransaction } from '../utils/transactionSimulator.js';
import { TransactionAudio } from '../utils/transactionAudio.js';

const Globe = ({ onTransactionUpdate }) => {
  const globeRef = useRef();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef();
  const [countries, setCountries] = useState({ features: [] });
  const [transactions, setTransactions] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [isSimulationRunning, setIsSimulationRunning] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const audioRef = useRef(new TransactionAudio());

  // Combine RWA and stablecoin data into a single array for the map
  const mapData = useMemo(() => [
    ...rwaData.flatMap(region => 
      region.assets.map(asset => ({
        ...asset,
        type: 'RWA',
        region: region.region
      }))
    ),
    ...stablecoinData.flatMap(region => 
      region.coins.map(coin => ({
        ...coin,
        type: 'Stablecoin',
        region: region.region
      }))
    )
  ], []);

  // Generate random transaction from random issuer
  const generateRandomTransaction = useCallback(() => {
    if (mapData.length === 0) return null;
    const randomIssuer = mapData[Math.floor(Math.random() * mapData.length)];
    return simulateTransaction(randomIssuer);
  }, [mapData]);

  // Add new transaction and create firework effect
  const addTransaction = useCallback((transaction) => {
    // Play transaction sound
    if (audioEnabled) {
      audioRef.current.playTransactionSound(transaction.type, transaction.amount);
    }

    setTransactions(prev => {
      const newTransactions = [...prev, transaction];
      // Keep only last 50 transactions for performance
      return newTransactions.slice(-50);
    });

    setRecentTransactions(prev => {
      const newRecent = [transaction, ...prev];
      // Keep up to 100 recent transactions for a smooth scroll
      const updated = newRecent.slice(0, 100);
      onTransactionUpdate?.(updated);
      return updated;
    });

    // Remove transaction after animation (3 seconds)
    setTimeout(() => {
      setTransactions(prev => prev.filter(tx => tx.id !== transaction.id));
    }, 3000);
  }, [audioEnabled]);

  // Transaction simulation loop
  useEffect(() => {
    if (!isSimulationRunning) return;

    const interval = setInterval(() => {
      const transaction = generateRandomTransaction();
      if (transaction) {
        addTransaction(transaction);
      }
    }, Math.random() * 3000 + 1000); // Random interval between 1-4 seconds

    return () => clearInterval(interval);
  }, [generateRandomTransaction, addTransaction, isSimulationRunning]);

  // Handle user interaction to resume audio context
  const handleUserInteraction = useCallback(() => {
    audioRef.current.resume();
  }, []);

  useEffect(() => {
    document.addEventListener('click', handleUserInteraction);
    return () => document.removeEventListener('click', handleUserInteraction);
  }, [handleUserInteraction]);

  useEffect(() => {
    fetch('//unpkg.com/world-atlas/countries-110m.json')
      .then(res => res.json())
      .then(data => {
        const geoJson = window.topojson.feature(data, data.objects.countries);
        setCountries(geoJson);
      });
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);

    if (globeRef.current) {
      globeRef.current.controls().autoRotate = true;
      globeRef.current.controls().autoRotateSpeed = 0.25;
      globeRef.current.pointOfView({ altitude: 1.75 });
    }

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSimulation = () => {
    setIsSimulationRunning(!isSimulationRunning);
  };

  const toggleAudio = () => {
    const newAudioState = audioRef.current.toggle();
    setAudioEnabled(newAudioState);
  };

  return (
    <div ref={containerRef} className="globe-container">
      {/* Control panel */}
      <div className="control-panel">
        <button 
          className={`control-btn ${isSimulationRunning ? 'active' : ''}`}
          onClick={toggleSimulation}
          title={isSimulationRunning ? 'Pause Simulation' : 'Resume Simulation'}
        >
          {isSimulationRunning ? '⏸️' : '▶️'}
        </button>
        <button 
          className={`control-btn ${audioEnabled ? 'active' : ''}`}
          onClick={toggleAudio}
          title={audioEnabled ? 'Mute Audio' : 'Enable Audio'}
        >
          {audioEnabled ? '🔊' : '🔇'}
        </button>
      </div>

      <GlobeGL
        ref={globeRef}
        backgroundColor="#000000"
        width={size.width}
        height={size.height}
        showGraticules={true}
        polygonsData={countries.features}
        polygonCapColor={() => 'rgba(0, 0, 0, 0.7)'}
        polygonSideColor={() => 'rgba(255, 255, 255, 0.05)'}
        polygonStrokeColor={() => '#666'}
        showAtmosphere={true}
        atmosphereColor={'#ffffff'}
        atmosphereAltitude={0.15}
        
        // Static issuer points
        pointsData={mapData}
        pointLat={d => d.lat}
        pointLng={d => d.lng}
        pointColor={d => d.type === 'RWA' ? '#00ff88' : '#ff6b6b'}
        pointAltitude={0.02}
        pointRadius={0.8}
        pointLabel={d => `<div style="color: white; background: rgba(0,0,0,0.8); padding: 5px; border-radius: 3px;">
          <strong>${d.name}</strong><br/>
          ${d.city}<br/>
          ${d.type}: ${d.amount.toLocaleString()} ${d.currency}
        </div>`}
        
        // Transaction fireworks
        ringsData={transactions}
        ringLat={d => d.lat}
        ringLng={d => d.lng}
        ringMaxRadius={3}
        ringPropagationSpeed={3}
        ringRepeatPeriod={3000}
        ringColor={d => d.color}
        ringResolution={64}
        
        // Transaction arcs (optional - for more visual effect)
        arcsData={transactions}
        arcStartLat={d => d.lat}
        arcStartLng={d => d.lng}
        arcEndLat={d => d.lat + (Math.random() - 0.5) * 20}
        arcEndLng={d => d.lng + (Math.random() - 0.5) * 20}
        arcColor={d => d.color}
        arcAltitude={0.3}
        arcStroke={0.5}
        arcDashLength={2}
        arcDashGap={1}
        arcDashAnimateTime={3000}
      />
    </div>
  );
};

export default Globe;
