import React, { useEffect, useRef, useState, useMemo } from 'react';
import GlobeGL from 'react-globe.gl';
import RealEstateOverlay from './RealEstateOverlay.jsx';
import ConnectionStatus from './ConnectionStatus.jsx';
import ConnectionIndicator from './ConnectionIndicator.jsx';

import { connect, disconnect, subscribeToTransactions, unsubscribeFromTransactions } from '../utils/xrpl.js';
import { getTransactionColor } from '../utils/transactionSimulator.js';
import { parseTransaction } from '../utils/transactionParser.js';

const Globe = ({ onTransactionUpdate, rwaData, stablecoinData }) => {
  const globeRef = useRef();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef();
  const [countries, setCountries] = useState({ features: [] });
  const [transactions, setTransactions] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const stopPollingRef = useRef(null);
  const [animationTime, setAnimationTime] = useState(0);

  const mapData = useMemo(() => [
    ...rwaData.flatMap(region => region.assets.map(asset => ({ ...asset, type: 'RWA' }))),
    ...stablecoinData.flatMap(region => region.coins.map(coin => ({ ...coin, type: 'Stablecoin' })))
  ], [rwaData, stablecoinData]);

  // Filter out real estate assets from regular points (they'll be shown as 3D buildings)
  const filteredMapData = useMemo(() => {
    const filtered = mapData.filter(item => {
      if (item.type === 'RWA' && (
        item.currency === 'DLD' || 
        item.name.toLowerCase().includes('real estate') ||
        item.name.toLowerCase().includes('land') ||
        item.name.toLowerCase().includes('property')
      )) {
        return false;
      }
      return true;
    });

    // Group issuers by location and add offsets to prevent overlap
    const locationGroups = {};
    filtered.forEach(item => {
      const locationKey = `${item.lat.toFixed(3)},${item.lng.toFixed(3)}`;
      if (!locationGroups[locationKey]) {
        locationGroups[locationKey] = [];
      }
      locationGroups[locationKey].push(item);
    });

    // Add offsets to items in the same location
    return filtered.map(item => {
      const locationKey = `${item.lat.toFixed(3)},${item.lng.toFixed(3)}`;
      const group = locationGroups[locationKey];
      
      if (group.length === 1) {
        return item; // No offset needed for single items
      }

      // Calculate offset based on position in group
      const index = group.findIndex(groupItem => 
        groupItem.issuer === item.issuer && groupItem.currency === item.currency
      );
      
      if (index === -1) return item;

      // Create a small offset pattern (spiral-like)
      const angle = (index / group.length) * 2 * Math.PI;
      const radius = 0.005; // Much smaller offset radius (about 500m)
      const offsetLat = Math.cos(angle) * radius;
      const offsetLng = Math.sin(angle) * radius;

      // Ensure coordinates stay within valid bounds
      const newLat = Math.max(-90, Math.min(90, item.lat + offsetLat));
      const newLng = Math.max(-180, Math.min(180, item.lng + offsetLng));

      return {
        ...item,
        lat: newLat,
        lng: newLng
      };
    });
  }, [mapData]);

  // Get real estate overlay props
  const realEstateOverlay = RealEstateOverlay({ mapData, globeRef });

  const issuerAddresses = useMemo(() => [...new Set(mapData.map(item => item.issuer))], [mapData]);

  useEffect(() => {
    const init = async () => {
      setIsConnecting(true);
      setConnectionError(null);
      
      let retryCount = 0;
      const maxRetries = 3;
      
      const attemptConnection = async () => {
        try {
          await connect();
          setIsConnected(true);
          setIsConnecting(false);
          setConnectionError(null);
        } catch (error) {
          retryCount++;
          if (retryCount < maxRetries) {
            console.log(`🔄 Connection attempt ${retryCount} failed, retrying in 3 seconds...`);
            setTimeout(attemptConnection, 3000);
          } else {
            setConnectionError(`Connection failed after ${maxRetries} attempts: ${error.message}`);
            setIsConnecting(false);
            setIsConnected(false);
          }
        }
      };
      
      attemptConnection();
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



      setTransactions(prev => [...prev, newTransaction].slice(-50));
      onTransactionUpdate?.(prev => [newTransaction, ...prev].slice(0, 100));

      // Keep transactions visible for 3 seconds, then remove them
      setTimeout(() => {
        setTransactions(prev => prev.filter(t => t.id !== newTransaction.id));
      }, 3000);
    };

    // Start continuous transaction polling
    if (issuerAddresses.length > 0) {
      console.log(`🔄 Starting continuous transaction polling for ${issuerAddresses.length} issuers`);
      stopPollingRef.current = subscribeToTransactions(issuerAddresses, handleTransaction);
    }

    return () => {
      if (stopPollingRef.current) {
        console.log('🛑 Stopping transaction polling');
        unsubscribeFromTransactions(stopPollingRef.current);
      }
    };
  }, [isConnected, issuerAddresses, mapData, onTransactionUpdate]);

  // Reconnection effect - restart polling if connection is restored
  useEffect(() => {
    if (isConnected && issuerAddresses.length > 0 && !stopPollingRef.current) {
      console.log('🔄 Reconnection detected - restarting transaction polling');
      const handleTransaction = (txData) => {
        const parsedTransaction = parseTransaction(txData, mapData);
        if (!parsedTransaction) return;

        const newTransaction = {
          ...parsedTransaction,
          color: getTransactionColor(parsedTransaction.type)
        };

        setTransactions(prev => [...prev, newTransaction].slice(-50));
        onTransactionUpdate?.(prev => [newTransaction, ...prev].slice(0, 100));

        setTimeout(() => {
          setTransactions(prev => prev.filter(t => t.id !== newTransaction.id));
        }, 3000);
      };

      stopPollingRef.current = subscribeToTransactions(issuerAddresses, handleTransaction);
    }
  }, [isConnected, issuerAddresses, mapData, onTransactionUpdate]);

  useEffect(() => {
    // Load topojson library if not already loaded
    const loadTopoJSON = async () => {
      if (!window.topojson) {
        try {
          const script = document.createElement('script');
          script.src = '//unpkg.com/topojson-client@3';
          script.async = true;
          script.onload = () => {
            console.log('TopoJSON library loaded successfully');
          };
          script.onerror = () => {
            console.warn('Failed to load TopoJSON library');
          };
          document.head.appendChild(script);
        } catch (error) {
          console.warn('Error loading TopoJSON library:', error);
        }
      }
    };

    loadTopoJSON();

    fetch('//unpkg.com/world-atlas/countries-110m.json')
      .then(res => res.json())
      .then(data => {
        // Check if topojson is available, otherwise use a fallback
        if (window.topojson && window.topojson.feature) {
          const geoJson = window.topojson.feature(data, data.objects.countries);
          setCountries(geoJson);
        } else {
          // Fallback: create a basic countries object
          console.warn('TopoJSON not available, using fallback');
          setCountries({ features: [] });
        }
      })
      .catch(error => {
        console.error('Failed to load countries data:', error);
        setCountries({ features: [] });
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
        // Enhanced rendering quality
        enablePointerInteraction={true}
        enableGlobeInteraction={true}
        // Realistic Earth texture
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        // Crisp graticules with better visibility
        showGraticules={true}
                graticulesLineColor={'rgba(255, 255, 255, 0.3)'}
        graticulesResolution={15}
        // Country outlines only
        polygonsData={countries.features}
        polygonCapColor={() => 'rgba(0, 0, 0, 0)'} // Transparent
        polygonSideColor={() => 'rgba(0, 0, 0, 0)'} // Transparent
        polygonStrokeColor={() => 'rgba(255, 255, 255, 0.4)'} // White borders
        polygonStroke={0.5}
        polygonAltitude={() => 0} // No elevation
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
      
      <ConnectionStatus 
        isConnected={isConnected}
        isConnecting={isConnecting}
        connectionError={connectionError}
      />
      
      <ConnectionIndicator 
        isConnected={isConnected}
        isConnecting={isConnecting}
        connectionError={connectionError}
      />
    </div>
  );
};

export default Globe;