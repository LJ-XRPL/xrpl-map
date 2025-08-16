import React, { useEffect, useRef, useState, useMemo } from 'react';
import GlobeGL from 'react-globe.gl';
import RealEstateOverlay from './RealEstateOverlay.jsx';
import ConnectionStatus from './ConnectionStatus.jsx';
import ConnectionIndicator from './ConnectionIndicator.jsx';
import TransactionTypeSelector from './TransactionTypeSelector.jsx';

import { connect, disconnect, subscribeToTransactions, unsubscribeFromTransactions } from '../utils/xrpl.js';
import { getTransactionColor } from '../utils/transactionSimulator.js';
import { parseTransaction } from '../utils/transactionParser.js';
import volumeManager from '../utils/volumeManager.js';
import twitterIntegration from '../utils/twitterIntegration.js';

const Globe = ({ onTransactionUpdate, rwaData, stablecoinData, activeTransactionFilters, onFilterChange }) => {
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

    // Group issuers by location and create cluster representation
    const locationGroups = {};
    filtered.forEach(item => {
      const locationKey = `${item.lat.toFixed(2)},${item.lng.toFixed(2)}`; // Less precise grouping
      if (!locationGroups[locationKey]) {
        locationGroups[locationKey] = [];
      }
      locationGroups[locationKey].push(item);
    });

    // Create cluster points for multiple issuers in same location
    const clusterPoints = [];
    
    Object.entries(locationGroups).forEach(([locationKey, items]) => {
      if (items.length === 1) {
        // Single issuer - show as normal point
        clusterPoints.push({
          ...items[0],
          isCluster: false,
          clusterSize: 1
        });
      } else {
        // Multiple issuers - create cluster point
        const avgLat = items.reduce((sum, item) => sum + item.lat, 0) / items.length;
        const avgLng = items.reduce((sum, item) => sum + item.lng, 0) / items.length;
        const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0);
        const currencies = [...new Set(items.map(item => item.currency))];
        
        clusterPoints.push({
          lat: avgLat,
          lng: avgLng,
          name: `${items.length} Assets`,
          city: items[0].city,
          amount: totalAmount,
          currency: currencies.join('/'),
          type: 'Cluster',
          isCluster: true,
          clusterSize: items.length,
          clusterItems: items,
          issuer: items.map(item => item.issuer).flat()
        });
      }
    });

    return clusterPoints;
  }, [mapData]);

  // Get real estate overlay props
  const realEstateOverlay = RealEstateOverlay({ mapData, globeRef });

  const issuerAddresses = useMemo(() => {
    const addresses = [];
    mapData.forEach(item => {
      if (Array.isArray(item.issuer)) {
        addresses.push(...item.issuer);
      } else {
        addresses.push(item.issuer);
      }
    });
    return [...new Set(addresses)];
  }, [mapData]);







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

    // Start volume tracking
    volumeManager.startTracking(mapData);

    const handleTransaction = (txData) => {
      // Process transaction for volume tracking
      volumeManager.processTransaction(txData);

      // Use the transaction parser utility for display
      const parsedTransaction = parseTransaction(txData, mapData);
      
      if (!parsedTransaction) {
        return; // Transaction was filtered out or invalid
      }

      // Debug: Log transaction types being received
      console.log(`📊 Received transaction: ${parsedTransaction.type} - ${parsedTransaction.amount} ${parsedTransaction.currency}`);

      // Check if this transaction type is in the active filters
      if (!activeTransactionFilters.includes(parsedTransaction.type)) {
        console.log(`🚫 Filtered out: ${parsedTransaction.type} (not in active filters)`);
        return; // Skip this transaction type
      }

      console.log(`✅ Transaction passed filters: ${parsedTransaction.type}`);

      // Add additional properties for the globe visualization
      const newTransaction = {
        ...parsedTransaction,
        color: getTransactionColor(parsedTransaction.type)
      };

      setTransactions(prev => [...prev, newTransaction].slice(-50));
      onTransactionUpdate?.(prev => [newTransaction, ...prev].slice(0, 100));
      
      console.log(`📤 Sent transaction to feed: ${newTransaction.type} - ${newTransaction.amount} ${newTransaction.currency}`);

      // Post tweet for new transaction
      if (parsedTransaction.amount && parsedTransaction.amount > 0) {
        // Find issuer information for the tweet
        const issuer = mapData.find(item => {
          if (Array.isArray(item.issuer)) {
            return item.issuer.includes(parsedTransaction.from) || item.issuer.includes(parsedTransaction.to);
          }
          return item.issuer === parsedTransaction.from || item.issuer === parsedTransaction.to;
        });

        const transactionForTweet = {
          ...parsedTransaction,
          issuer: issuer || { name: 'Unknown Asset' }
        };

        // Post tweet asynchronously (don't block the UI)
        twitterIntegration.postTransactionUpdate(transactionForTweet)
          .then(success => {
            if (success) {
              console.log('🐦 Tweet posted for transaction:', parsedTransaction.type, parsedTransaction.amount, parsedTransaction.currency);
            }
          })
          .catch(error => {
            console.error('🐦 Error posting tweet:', error);
          });
      }

      // Keep transactions visible for 3 seconds (firework duration), then remove them
      setTimeout(() => {
        setTransactions(prev => prev.filter(t => t.id !== newTransaction.id));
      }, 3000);
    };

    // Start continuous transaction polling
    if (issuerAddresses.length > 0) {
      console.log(`🔄 Starting continuous transaction polling for ${issuerAddresses.length} issuers:`);
      issuerAddresses.forEach((address, index) => {
        const issuer = mapData.find(item => {
          if (Array.isArray(item.issuer)) {
            return item.issuer.includes(address);
          }
          return item.issuer === address;
        });
        console.log(`  ${index + 1}. ${address} - ${issuer ? issuer.name : 'Unknown'} (${issuer ? issuer.currency : 'Unknown'})`);
      });
      stopPollingRef.current = subscribeToTransactions(issuerAddresses, handleTransaction);
    }

    return () => {
      if (stopPollingRef.current) {
        console.log('🛑 Stopping transaction polling');
        unsubscribeFromTransactions(stopPollingRef.current);
      }
    };
  }, [isConnected, issuerAddresses, mapData, onTransactionUpdate, activeTransactionFilters]);

  // Reconnection effect - restart polling if connection is restored
  useEffect(() => {
    if (isConnected && issuerAddresses.length > 0 && !stopPollingRef.current) {
      console.log('🔄 Reconnection detected - restarting transaction polling');
      const handleTransaction = (txData) => {
        // Process transaction for volume tracking
        volumeManager.processTransaction(txData);

        const parsedTransaction = parseTransaction(txData, mapData);
        if (!parsedTransaction) return;

        // Debug: Log transaction types being received
        console.log(`📊 Reconnection - Received transaction: ${parsedTransaction.type} - ${parsedTransaction.amount} ${parsedTransaction.currency}`);

        // Check if this transaction type is in the active filters
        if (!activeTransactionFilters.includes(parsedTransaction.type)) {
          console.log(`🚫 Reconnection - Filtered out: ${parsedTransaction.type} (not in active filters)`);
          return; // Skip this transaction type
        }

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
  }, [isConnected, issuerAddresses, mapData, onTransactionUpdate, activeTransactionFilters]);



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
      
      // Update zoom level on resize
      if (globeRef.current) {
        const isMobile = window.innerWidth <= 768;
        const altitude = isMobile ? 2.2 : 1.5; // More zoomed out on mobile
        
        globeRef.current.pointOfView({ altitude });
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);

    if (globeRef.current) {
      globeRef.current.controls().autoRotate = true;
      globeRef.current.controls().autoRotateSpeed = 0.25;
      
      // Set different zoom levels for mobile vs desktop
      const isMobile = window.innerWidth <= 768;
      const altitude = isMobile ? 3.75 : 1.75; // More zoomed out on mobile
      
      globeRef.current.pointOfView({ altitude });
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
            if (d.isCluster) {
              // Cluster points - rainbow effect based on cluster size
              const hue = (d.clusterSize * 30) % 360;
              const intensity = Math.sin(animationTime * 0.001 + d.lat + d.lng) * 0.3 + 0.7;
              return `hsla(${hue}, 80%, 60%, ${intensity})`;
            } else {
              const baseColor = d.type === 'RWA' ? [0, 255, 136] : [255, 107, 107];
              const intensity = Math.sin(animationTime * 0.001 + d.lat + d.lng) * 0.3 + 0.7;
              return `rgba(${baseColor[0]}, ${baseColor[1]}, ${baseColor[2]}, ${intensity})`;
            }
          }}
          pointAltitude={d => {
            // Variable altitude based on amount for visual hierarchy
            const logAmount = Math.log10(d.amount || 1);
            return 0.02 + (logAmount / 100);
          }}
          pointRadius={d => {
            // Variable radius based on amount and cluster size
            if (d.isCluster) {
              return 1 + (d.clusterSize * 0.3); // Larger radius for clusters
            }
            const logAmount = Math.log10(d.amount || 1);
            return 0.5 + (logAmount / 20);
          }}
          pointLabel={d => {
            if (d.isCluster) {
              // Cluster label showing all assets
              const assetList = d.clusterItems.map(item => 
                `${item.name} (${item.currency})`
              ).join('<br/>');
              
              return `
                <div style="
                  color: white; 
                  background: linear-gradient(135deg, rgba(0,0,0,0.95), rgba(20,20,40,0.95)); 
                  padding: 12px 16px; 
                  border-radius: 8px;
                  border: 2px solid #ff6b6b;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                  backdrop-filter: blur(10px);
                  max-width: 300px;
                ">
                  <strong style="color: #ff6b6b;">${d.clusterSize} Assets in ${d.city}</strong><br/>
                  💰 Total: ${d.amount.toLocaleString()} ${d.currency}<br/>
                  <div style="margin-top: 8px; font-size: 12px; opacity: 0.8;">
                    ${assetList}
                  </div>
                </div>
              `;
            } else {
              return `
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
              `;
            }
          }}
          ringsData={transactions}
          ringLat={d => d.lat}
          ringLng={d => d.lng}
          ringMaxRadius={d => {
            // Simple expanding ring effect
            const time = (Date.now() - d.timestamp) / 2000; // 2 second animation
            const progress = Math.min(time, 1);
            const logAmount = Math.log10(d.amount || 1);
            const baseRadius = 1 + (logAmount / 10);
            
            // Ring expands outward smoothly
            return baseRadius + (progress * 3);
          }}
          ringPropagationSpeed={d => 3} // Consistent speed
          ringRepeatPeriod={2000} // 2 second cycle
          ringColor={d => {
            // Clean, bright ring colors
            if (!d.color) return 'rgba(255, 255, 255, 0.6)';
            
            const time = (Date.now() - d.timestamp) / 2000;
            const progress = Math.min(time, 1);
            
            // Fade out as ring expands
            const alpha = (1 - progress) * 0.8;
            
            if (d.color.startsWith('#')) {
              const r = parseInt(d.color.slice(1, 3), 16);
              const g = parseInt(d.color.slice(3, 5), 16);
              const b = parseInt(d.color.slice(5, 7), 16);
              return `rgba(${r}, ${g}, ${b}, ${alpha})`;
            }
            return d.color;
          }}
          ringResolution={32} // Optimized for performance
          // Enhanced arcs with firework effect
          arcsData={transactions}
          arcStartLat={d => d.lat}
          arcStartLng={d => d.lng}
          arcEndLat={d => {
            // Arc trajectory that goes up and lands back down
            const time = (Date.now() - d.timestamp) / 2000; // 2 second animation
            const progress = Math.min(time, 1);
            
            // Create a parabolic arc that goes up and comes back down
            const arcHeight = Math.sin(progress * Math.PI) * 0.3; // Peak at middle of animation
            const horizontalDistance = progress * 0.4; // Total horizontal distance
            
            // Calculate end position with arc trajectory
            const endLat = d.lat + horizontalDistance;
            return endLat;
          }}
          arcEndLng={d => {
            const time = (Date.now() - d.timestamp) / 2000;
            const progress = Math.min(time, 1);
            
            // Create a parabolic arc that goes up and comes back down
            const arcHeight = Math.sin(progress * Math.PI) * 0.3; // Peak at middle of animation
            const horizontalDistance = progress * 0.4; // Total horizontal distance
            
            // Calculate end position with arc trajectory
            const endLng = d.lng + horizontalDistance;
            return endLng;
          }}
          arcColor={d => {
            // Clean, simple arc colors
            if (!d.color) return 'rgba(255, 255, 255, 0.5)';
            
            const time = (Date.now() - d.timestamp) / 2000;
            const progress = Math.min(time, 1);
            
            // Simple fade out effect
            const alpha = (1 - progress) * 0.7;
            
            if (d.color.startsWith('#')) {
              const r = parseInt(d.color.slice(1, 3), 16);
              const g = parseInt(d.color.slice(3, 5), 16);
              const b = parseInt(d.color.slice(5, 7), 16);
              return `rgba(${r}, ${g}, ${b}, ${alpha})`;
            }
            return d.color;
          }}
          arcAltitude={d => {
            // Parabolic arc that goes up and lands back down
            const time = (Date.now() - d.timestamp) / 2000;
            const progress = Math.min(time, 1);
            
            // Create a parabolic trajectory: starts at ground, goes up, comes back down
            const arcHeight = Math.sin(progress * Math.PI) * 0.4; // Peak height at middle
            
            // Base height varies by transaction type
            const baseHeight = d.type === 'Payment' ? 0.1 : 0.05;
            
            return baseHeight + arcHeight;
          }}
          arcStroke={d => {
            // Simple arc stroke
            return d.type === 'Payment' ? 1 : 0.5;
          }}
          arcDashLength={3}
          arcDashGap={2}
          arcDashAnimateTime={d => {
            // Simple animation speed
            return d.type === 'Payment' ? 1500 : 2000;
          }}
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
      
      <TransactionTypeSelector 
        activeFilters={activeTransactionFilters}
        onFilterChange={onFilterChange}
      />
    </div>
  );
};

export default Globe;