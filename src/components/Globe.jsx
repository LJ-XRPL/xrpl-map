import React, { useEffect, useRef, useState, useMemo } from 'react';
import GlobeGL from 'react-globe.gl';
import rwaData from '../data/rwas.js';
import stablecoinData from '../data/stablecoins.js';
import { connect, disconnect, subscribeToTransactions, unsubscribeFromTransactions } from '../utils/xrpl.js';
import { getTransactionColor } from '../utils/transactionSimulator.js'; // We can still use the color utility

const Globe = ({ onTransactionUpdate }) => {
  const globeRef = useRef();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef();
  const [countries, setCountries] = useState({ features: [] });
  const [transactions, setTransactions] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  const mapData = useMemo(() => [
    ...rwaData.flatMap(region => region.assets.map(asset => ({ ...asset, type: 'RWA' }))),
    ...stablecoinData.flatMap(region => region.coins.map(coin => ({ ...coin, type: 'Stablecoin' })))
  ], []);

  const issuerAddresses = useMemo(() => [...new Set(mapData.map(item => item.issuer))], [mapData]);

  useEffect(() => {
    const init = async () => {
      await connect();
      setIsConnected(true);
    };
    init();

    return () => {
      disconnect();
    };
  }, []);
  
  useEffect(() => {
    if (!isConnected) return;

    const handleTransaction = (tx) => {
      const issuer = mapData.find(item => item.issuer === tx.transaction.Account);
      if (!issuer) return;

      const newTransaction = {
        id: tx.transaction.hash,
        from: tx.transaction.Account,
        to: tx.transaction.Destination,
        amount: tx.transaction.Amount.value || tx.transaction.Amount,
        currency: tx.transaction.Amount.currency || 'XRP',
        type: tx.transaction.TransactionType,
        timestamp: Date.now(),
        lat: issuer.lat,
        lng: issuer.lng,
        city: issuer.city,
        issuerName: issuer.name,
        color: getTransactionColor(tx.transaction.TransactionType)
      };

      setTransactions(prev => [...prev, newTransaction].slice(-50));
      onTransactionUpdate?.(prev => [newTransaction, ...prev].slice(0, 100));

      setTimeout(() => {
        setTransactions(prev => prev.filter(t => t.id !== newTransaction.id));
      }, 3000);
    };

    if (issuerAddresses.length > 0) {
      console.log('Subscribing to addresses:', issuerAddresses);
      subscribeToTransactions(issuerAddresses, handleTransaction);
    }

    return () => {
      if (issuerAddresses.length > 0) {
        unsubscribeFromTransactions(issuerAddresses);
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
        polygonsData={countries.features}
        polygonCapColor={() => 'rgba(0, 0, 0, 0.7)'}
        polygonSideColor={() => 'rgba(255, 255, 255, 0.05)'}
        polygonStrokeColor={() => '#666'}
        showAtmosphere={true}
        atmosphereColor={'#ffffff'}
        atmosphereAltitude={0.15}
        pointsData={mapData}
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
      />
    </div>
  );
};

export default Globe;
