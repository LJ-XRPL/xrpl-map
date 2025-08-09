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
      console.log('Starting transaction polling for addresses:', issuerAddresses);
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
  
  return (
    <div ref={containerRef} className="globe-container">
      <GlobeGL
        ref={globeRef}
        backgroundColor="#000000"
        width={size.width}
        height={size.height}
        showGraticules={true}
        graticulesLineColor={'rgba(255, 255, 255, 0.1)'}
        graticulesResolution={10}
        polygonsData={countries.features}
        polygonCapColor={d => {
          const baseAlpha = 0.15;
          const variation = Math.sin(d.properties?.NAME?.length || 0) * 0.05;
          return `rgba(20, 40, 20, ${baseAlpha + variation})`;
        }}
        polygonSideColor={() => 'rgba(255, 255, 255, 0.08)'}
        polygonStrokeColor={() => 'rgba(255, 255, 255, 0.3)'}
        polygonStroke={0.5}
        polygonAltitude={0.01}
        showAtmosphere={true}
        atmosphereColor={'#ffffff'}
        atmosphereAltitude={0.15}
        pointsData={filteredMapData}
        pointLat={d => d.lat}
        pointLng={d => d.lng}
        pointColor={d => d.type === 'RWA' ? '#00ff88' : '#ff6b6b'}
        pointAltitude={0.02}
        pointRadius={0.8}
        pointLabel={d => `
          <div style="color: white; background: rgba(0,0,0,0.8); padding: 5px; border-radius: 3px;">
            <strong>${d.name}</strong><br/>
            ${d.city}<br/>
            ${d.type}: ${d.amount.toLocaleString()} ${d.currency}
          </div>
        `}
        ringsData={transactions}
        ringLat={d => d.lat}
        ringLng={d => d.lng}
        ringMaxRadius={3}
        ringPropagationSpeed={3}
        ringRepeatPeriod={3000}
        ringColor={d => d.color}
        ringResolution={64}
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