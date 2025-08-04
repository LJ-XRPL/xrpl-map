import React, { useEffect, useRef, useState } from 'react';
import GlobeGL from 'react-globe.gl';
import rwaData from '../data/rwas.js';
import stablecoinData from '../data/stablecoins.js';

const Globe = () => {
  const globeRef = useRef();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef();
  const [countries, setCountries] = useState({ features: [] });

  // Combine RWA and stablecoin data into a single array for the map
  const mapData = [
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
  ];

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
        pointLabel={d => `<div style="color: white; background: rgba(0,0,0,0.8); padding: 5px; border-radius: 3px;">
          <strong>${d.name}</strong><br/>
          ${d.city}<br/>
          ${d.type}: ${d.amount.toLocaleString()} ${d.currency}
        </div>`}
      />
    </div>
  );
};

export default Globe;
