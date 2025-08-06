import React, { useEffect, useRef, useState, useMemo } from 'react';
import GlobeGL from 'react-globe.gl';
import rwaData from '../data/rwas.js';
import stablecoinData from '../data/stablecoins.js';
import RealEstateOverlay from './RealEstateOverlay.jsx';
import { connect, disconnect, subscribeToTransactions, unsubscribeFromTransactions } from '../utils/xrpl.js';
import { getTransactionColor } from '../utils/transactionSimulator.js';

const Globe = ({ onTransactionUpdate }) => {
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
  ], []);

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
      const tx = txData.transaction;
      const hash = txData.hash || tx.hash;
      
      // Find the correct issuer based on the transaction account
      // This works for both RLUSD and BBRL issuers
      const issuer = mapData.find(item => 
        item.issuer === tx.Account || 
        item.issuer === tx.Destination ||
        // For offers, check if the currency matches our tracked issuers
        (tx.TakerPays && typeof tx.TakerPays === 'object' && tx.TakerPays.issuer === item.issuer) ||
        (tx.TakerGets && typeof tx.TakerGets === 'object' && tx.TakerGets.issuer === item.issuer)
      );
      
      if (!issuer) {
        // Only log for BBRL since we silenced RLUSD logs
        if (tx.Account === 'rH5CJsqvNqZGxrMyGaqLEoMWRYcVTAPZMt') {
          console.log('🤷 No matching issuer found for BBRL transaction');
        }
        return;
      }

      // Parse amount and currency based on transaction type and issuer
      let amount = 'Unknown';
      let currency = issuer.currency;
      
      // For OfferCreate transactions, use TakerPays amount
      if (tx.TransactionType === 'OfferCreate' && tx.TakerPays) {
        if (typeof tx.TakerPays === 'object' && tx.TakerPays.value) {
          amount = parseFloat(tx.TakerPays.value).toFixed(2);
          currency = issuer.currency;
        } else if (typeof tx.TakerPays === 'string') {
          // XRP amount in drops
          amount = (parseInt(tx.TakerPays) / 1000000).toFixed(2);
          currency = 'XRP';
        }
      } else if (tx.TransactionType === 'OfferCancel') {
        amount = 'Cancelled';
        currency = issuer.currency;
      } else if (tx.Amount) {
        // Standard payment
        if (typeof tx.Amount === 'string') {
          amount = (parseInt(tx.Amount) / 1000000).toFixed(2);
          currency = 'XRP';
        } else if (typeof tx.Amount === 'object' && tx.Amount.value) {
          const amountValue = parseFloat(tx.Amount.value);
          amount = isNaN(amountValue) ? '0.00' : amountValue.toFixed(2);
          
          // For token payments, determine currency based on issuer address
          if (tx.Amount.issuer === 'rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De') {
            currency = 'RLUSD';
          } else if (tx.Amount.issuer === 'rH5CJsqvNqZGxrMyGaqLEoMWRYcVTAPZMt') {
            currency = 'BBRL';
          } else if (tx.Amount.issuer === 'rMkEuRii9w9uBMQDnWV5AA43gvYZR9JxVK') {
            currency = 'EUROP';
          } else {
            // Fallback to issuer currency from our data
            currency = issuer.currency;
          }
        } else if (typeof tx.Amount === 'object') {
          // Handle case where Amount object exists but no value field
          amount = '0.00';
          currency = issuer.currency;
        }
      } else {
        // Fallback for transactions without Amount field
        amount = '0.00';
        currency = issuer.currency;
      }

      const newTransaction = {
        id: hash,
        hash: hash, // Add hash property for explorer links
        from: tx.Account,
        to: tx.Destination || 'Market',
        amount: amount,
        currency: currency,
        type: tx.TransactionType || 'Unknown',
        timestamp: Date.now(),
        lat: issuer.lat,
        lng: issuer.lng,
        city: issuer.city,
        issuerName: issuer.name,
        color: getTransactionColor(tx.TransactionType || 'Payment')
      };

      // Only log for BBRL and EUROP transactions
      if (issuer.currency === 'BBRL') {
        console.log('✅ Processed BBRL transaction for display:', newTransaction);
      } else if (issuer.currency === 'EUROP') {
        console.log('✅ Processed EUROP transaction for display:', newTransaction);
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
        polygonsData={countries.features}
        polygonCapColor={() => 'rgba(0, 0, 0, 0.7)'}
        polygonSideColor={() => 'rgba(255, 255, 255, 0.05)'}
        polygonStrokeColor={() => '#666'}
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
        <img src="/xrpl-white.svg" alt="XRPL" className="xrpl-logo" />
      </div>
    </div>
  );
};

export default Globe;