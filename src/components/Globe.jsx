import React, { useEffect, useRef, useState, useMemo } from 'react';
import GlobeGL from 'react-globe.gl';
import RealEstateOverlay from './RealEstateOverlay.jsx';

import { connect, disconnect, subscribeToTransactions, unsubscribeFromTransactions } from '../utils/xrpl.js';
import { getTransactionColor } from '../utils/transactionSimulator.js';
import { parseTransaction, shouldLogTransaction } from '../utils/transactionParser.js';

const Globe = ({ onTransactionUpdate, rwaData, stablecoinData }) => {
  const globeRef = useRef();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef();
  const [countries, setCountries] = useState({ features: [] });
  const [transactions, setTransactions] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const stopPollingRef = useRef(null);
  const [animationTime, setAnimationTime] = useState(0);

  const mapData = useMemo(() => [
    ...rwaData.flatMap(region => region.assets.map(asset => ({ ...asset, type: 'RWA' }))),
    ...stablecoinData.flatMap(region => region.coins.map(coin => ({ ...coin, type: 'Stablecoin' })))
  ], [rwaData, stablecoinData]);

  // Filter out real estate assets from regular points (they'll be shown as 3D buildings)
  const filteredMapData = useMemo(() => {
    return mapData.filter(item => {
      // Remove real estate related assets from regular points
      if (item.type === 'RWA' && (
        item.currency === 'DLD' || // Dubai Land Department
        item.name.toLowerCase().includes('real estate') ||
        item.name.toLowerCase().includes('land') ||
        item.name.toLowerCase().includes('property')
      )) {
        return false;
      }
      return true;
    });
  }, [mapData]);

  // Get real estate overlay props
  const realEstateOverlay = RealEstateOverlay({ mapData, globeRef });

  const issuerAddresses = useMemo(() => [...new Set(mapData.map(item => item.issuer))], [mapData]);

  useEffect(() => {
    const init = async () => {
      await connect();
      setIsConnected(true);
    };
    init();

    return () => {
      if (stopPollingRef.current) {
        unsubscribeFromTransactions(stopPollingRef.current);
      }
      disconnect();
    };
  }, []);
  
  useEffect(() => {
    if (!isConnected) return;

    const handleTransaction = (txData) => {
      // Use the transaction parser utility
      const parsedTransaction = parseTransaction(txData, mapData);
      
      if (!parsedTransaction) {
        return; // Transaction was filtered out or invalid
      }

      // Add additional properties for the globe visualization
      const newTransaction = {
        ...parsedTransaction,
        color: getTransactionColor(parsedTransaction.type)
      };

      // Only log for BBRL and EUROP transactions
      if (shouldLogTransaction(newTransaction)) {
        console.log(`✅ Processed ${newTransaction.currency} transaction for display:`, newTransaction);
      }

      setTransactions(prev => [...prev, newTransaction].slice(-50));
      onTransactionUpdate?.(prev => [newTransaction, ...prev].slice(0, 100));

      setTimeout(() => {
        setTransactions(prev => prev.filter(t => t.id !== newTransaction.id));
      }, 3000);
    };

    if (issuerAddresses.length > 0) {
      console.log('--- Starting Transaction Polling ---');
      issuerAddresses.forEach(address => {
        const issuer = mapData.find(item => item.issuer === address);
        const issuerName = issuer ? `${issuer.name} (${issuer.currency})` : 'Unknown Issuer';
        console.log(`📡 Polling for ${issuerName} transactions: ${address}`);
      });
      stopPollingRef.current = subscribeToTransactions(issuerAddresses, handleTransaction);
    }

    return () => {
      if (stopPollingRef.current) {
        unsubscribeFromTransactions(stopPollingRef.current);
      }
    };
  }, [isConnected, issuerAddresses, mapData, onTransactionUpdate]);

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

  // Animation loop for dynamic effects
  useEffect(() => {
    let animationId;
    const animationLoop = () => {
      setAnimationTime(Date.now());
      animationId = requestAnimationFrame(animationLoop);
    };
    animationId = requestAnimationFrame(animationLoop);
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []);

  return (
    <div ref={containerRef} className="globe-container">
      <GlobeGL
        ref={globeRef}
        backgroundColor="#000000"
        width={size.width}
        height={size.height}
        // Black and white globe with enhanced depth
        showGraticules={true}
        graticulesLineColor={'rgba(255, 255, 255, 0.1)'}
        graticulesResolution={10}
        // Enhanced polygons with monochrome depth
        polygonsData={countries.features}
        polygonCapColor={d => {
          // Monochrome with subtle variations for depth
          const name = d.properties?.NAME || 'Unknown';
          const variation = Math.sin(name.length || 1) * 0.1;
          const baseAlpha = 0.15;
          const alpha = Math.max(0.05, Math.min(0.3, baseAlpha + variation));
          return `rgba(20, 40, 20, ${alpha})`;
        }}
        polygonSideColor={d => {
          // Darker sides for depth effect
          const name = d.properties?.NAME || 'Unknown';
          const variation = Math.sin(name.length || 1) * 0.05;
          const alpha = Math.max(0.1, Math.min(0.4, 0.2 + variation));
          return `rgba(255, 255, 255, ${alpha * 0.4})`;
        }}
        polygonStrokeColor={() => 'rgba(255, 255, 255, 0.3)'}
        polygonStroke={0.5}
        polygonAltitude={d => {
          // Enhanced variable altitude for more pronounced depth
          const name = d.properties?.NAME || 'Unknown';
          const baseAltitude = 0.01;
          const variation = Math.sin(name.length || 1) * 0.008;
          const altitude = baseAltitude + variation;
          return Math.max(0.002, Math.min(0.025, altitude));
        }}
        // Subtle white atmosphere
        showAtmosphere={true}
        atmosphereColor={'#ffffff'}
        atmosphereAltitude={0.15}
        pointsData={filteredMapData}
        pointLat={d => d.lat}
        pointLng={d => d.lng}
        pointColor={d => {
          // Enhanced point colors with glow effect
          const baseColor = d.type === 'RWA' ? [0, 255, 136] : [255, 107, 107];
          const intensity = Math.sin(animationTime * 0.001 + d.lat + d.lng) * 0.3 + 0.7;
          return `rgba(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]}, ${intensity})`;
        }}
        pointAltitude={d => {
          // Variable altitude based on amount for visual hierarchy
          const logAmount = Math.log10(d.amount || 1);
          return 0.02 + (logAmount / 100);
        }}
        pointRadius={d => {
          // Variable radius based on amount
          const logAmount = Math.log10(d.amount || 1);
          return 0.5 + (logAmount / 20);
        }}
        pointLabel={d => `
          <div style="
            color: white; 
            background: linear-gradient(135deg, rgba(0,0,0,0.9), rgba(20,20,40,0.9)); 
            padding: 8px 12px; 
            border-radius: 8px;
            border: 1px solid ${d.type === 'RWA' ? '#00ff88' : '#ff6b6b'};
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            backdrop-filter: blur(10px);
          ">
            <strong style="color: ${d.type === 'RWA' ? '#00ff88' : '#ff6b6b'};">${d.name}</strong><br/>
            📍 ${d.city}<br/>
            💰 ${d.amount.toLocaleString()} ${d.currency}<br/>
            <small style="opacity: 0.7;">${d.type} Asset</small>
          </div>
        `}
        ringsData={transactions}
        ringLat={d => d.lat}
        ringLng={d => d.lng}
        ringMaxRadius={d => {
          // Variable ring size based on transaction amount
          const logAmount = Math.log10(d.amount || 1);
          return 2 + (logAmount / 5);
        }}
        ringPropagationSpeed={d => d.type === 'Payment' ? 4 : 2} // Faster for payments
        ringRepeatPeriod={2000}
        ringColor={d => {
          // Enhanced ring colors with opacity gradient
          if (!d.color) return 'rgba(255, 255, 255, 0.5)';
          const alpha = Math.sin(animationTime * 0.003) * 0.3 + 0.7;
          // Extract RGB from hex color or use the color directly if it's already rgba
          if (d.color.startsWith('#')) {
            const r = parseInt(d.color.slice(1, 3), 16);
            const g = parseInt(d.color.slice(3, 5), 16);
            const b = parseInt(d.color.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
          }
          return d.color; // Return as-is if already in rgba format
        }}
        ringResolution={128} // Higher resolution for smoother rings
        // Enhanced arcs with more dynamic behavior
        arcsData={transactions}
        arcStartLat={d => d.lat}
        arcStartLng={d => d.lng}
        arcEndLat={d => {
          // More sophisticated arc destinations
          const range = d.type === 'Payment' ? 30 : 15;
          return d.lat + (Math.random() - 0.5) * range;
        }}
        arcEndLng={d => {
          const range = d.type === 'Payment' ? 30 : 15;
          return d.lng + (Math.random() - 0.5) * range;
        }}
        arcColor={d => d.color}
        arcAltitude={d => {
          // Variable arc height based on transaction type
          return d.type === 'Payment' ? 0.4 : 0.25;
        }}
        arcStroke={d => d.type === 'Payment' ? 1 : 0.5}
        arcDashLength={3}
        arcDashGap={2}
        arcDashAnimateTime={d => d.type === 'Payment' ? 2000 : 3000}
        objectsData={realEstateOverlay.objectsData}
        objectLat={realEstateOverlay.objectLat}
        objectLng={realEstateOverlay.objectLng}
        objectAltitude={realEstateOverlay.objectAltitude}
        objectThreeObject={realEstateOverlay.objectThreeObject}
        objectLabel={realEstateOverlay.objectLabel}
      />
      
      <div className="xrpl-logo-overlay">
        <img src={`${process.env.PUBLIC_URL}/xrpl-white.svg`} alt="XRPL" className="xrpl-logo" />
      </div>
    </div>
  );
};

export default Globe;