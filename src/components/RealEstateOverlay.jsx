import { useMemo } from 'react';
import * as THREE from 'three';

const RealEstateOverlay = ({ mapData, globeRef }) => {
  // Create 3D buildings for real estate projects
  const realEstateBuildings = useMemo(() => {
    const buildings = [];
    
    // Find all real estate related assets
    const realEstateAssets = mapData.filter(item => 
      item.type === 'RWA' && (
        item.currency === 'DLD' || // Dubai Land Department
        item.name.toLowerCase().includes('real estate') ||
        item.name.toLowerCase().includes('land') ||
        item.name.toLowerCase().includes('property')
      )
    );

    realEstateAssets.forEach(asset => {
      const baseLatitude = asset.lat;
      const baseLongitude = asset.lng;
      
      // Create building cluster based on asset type
      let buildingOffsets = [];
      
      if (asset.currency === 'DLD') {
        // Dubai Land Department - spread across major UAE cities
        // Using actual relative coordinates from Dubai (25.2048, 55.2708)
        buildingOffsets = [
          { lat: 0, lng: 0, height: 0.08, width: 0.4, depth: 0.4 },              // Dubai (Main HQ)
          { lat: -0.95, lng: -1.03, height: 0.06, width: 0.3, depth: 0.3 },      // Abu Dhabi (24.25, 54.24)
          { lat: 0.14, lng: 0.07, height: 0.05, width: 0.25, depth: 0.25 },      // Sharjah (25.35, 55.34)
          { lat: 0.16, lng: 0.15, height: 0.07, width: 0.35, depth: 0.3 },       // Ajman (25.37, 55.42)
          { lat: 0.55, lng: 0.19, height: 0.04, width: 0.2, depth: 0.2 },        // Ras Al Khaimah (25.76, 55.46)
          { lat: -0.04, lng: 1.04, height: 0.045, width: 0.25, depth: 0.25 },    // Fujairah (25.16, 56.31)
        ];
      } else {
        // Default real estate cluster - moderate spread
        buildingOffsets = [
          { lat: 0, lng: 0, height: 0.06, width: 0.3, depth: 0.3 },
          { lat: 0.03, lng: 0.04, height: 0.04, width: 0.2, depth: 0.2 },
          { lat: -0.025, lng: 0.035, height: 0.05, width: 0.25, depth: 0.25 },
        ];
      }

      buildingOffsets.forEach((offset, index) => {
        // Define UAE city names for DLD buildings
        let buildingCity = asset.city;
        if (asset.currency === 'DLD') {
          const uaeCities = ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah'];
          buildingCity = uaeCities[index] || asset.city;
        }
        
        buildings.push({
          id: `${asset.currency}-building-${index}`,
          lat: baseLatitude + offset.lat,
          lng: baseLongitude + offset.lng,
          height: offset.height,
          width: offset.width,
          depth: offset.depth,
          color: '#00ff88', // Green for all real estate projects
          assetName: asset.name,
          assetCity: buildingCity,
          assetAmount: asset.amount,
          assetCurrency: asset.currency,
          buildingNumber: index + 1,
        });
      });
    });

    return buildings;
  }, [mapData]);

  const createBuildingObject = (d) => {
    // Create Monopoly-style house with triangular roof
    const houseGroup = new THREE.Group();
    
    // House dimensions
    const houseWidth = d.width;
    const houseDepth = d.depth;
    const wallHeight = d.height * 12; // Base wall height
    const roofHeight = wallHeight * 0.6; // Triangular roof height
    
    // Create the main house body (rectangular base)
    const houseGeometry = new THREE.BoxGeometry(houseWidth, wallHeight, houseDepth);
    const houseMaterial = new THREE.MeshLambertMaterial({ 
      color: d.color,
      transparent: true,
      opacity: 0.9
    });
    const houseMesh = new THREE.Mesh(houseGeometry, houseMaterial);
    houseMesh.position.y = wallHeight / 2;
    
    // Create triangular roof using a pyramid geometry
    const roofGeometry = new THREE.ConeGeometry(houseWidth * 0.8, roofHeight, 4);
    const roofMaterial = new THREE.MeshLambertMaterial({ 
      color: '#004d1a', // Darker green for roof
      transparent: true,
      opacity: 0.9
    });
    const roofMesh = new THREE.Mesh(roofGeometry, roofMaterial);
    roofMesh.position.y = wallHeight + roofHeight / 2;
    roofMesh.rotation.y = Math.PI / 4; // Rotate to make it look like a house roof
    
    // Add white outline edges to the house
    const houseEdges = new THREE.EdgesGeometry(houseGeometry);
    const edgeMaterial = new THREE.LineBasicMaterial({ 
      color: '#ffffff', 
      transparent: true, 
      opacity: 0.6 
    });
    const houseWireframe = new THREE.LineSegments(houseEdges, edgeMaterial);
    houseWireframe.position.y = wallHeight / 2;
    
    // Add roof edges
    const roofEdges = new THREE.EdgesGeometry(roofGeometry);
    const roofWireframe = new THREE.LineSegments(roofEdges, edgeMaterial);
    roofWireframe.position.y = wallHeight + roofHeight / 2;
    roofWireframe.rotation.y = Math.PI / 4;
    
    // Assemble the house
    houseGroup.add(houseMesh);
    houseGroup.add(roofMesh);
    houseGroup.add(houseWireframe);
    houseGroup.add(roofWireframe);
    
    // Rotate the entire house to face outward from the globe surface
    // Calculate the position on the globe to determine rotation
    const lat = d.lat * Math.PI / 180;
    const lng = d.lng * Math.PI / 180;
    
    // Set rotation to make house face "up" from the globe surface
    houseGroup.rotation.x = -lat + Math.PI / 2;
    houseGroup.rotation.y = lng;
    houseGroup.rotation.z = 0;
    
    return houseGroup;
  };

  const getBuildingLabel = (d) => `
    <div style="color: white; background: rgba(0,0,0,0.8); padding: 8px; border-radius: 4px; max-width: 200px;">
      <strong>${d.assetName}</strong><br/>
      <span style="color: #00ff88;">Real Estate Asset</span><br/>
      ${d.assetCity}<br/>
      <span style="color: #888; font-size: 0.9em;">Building ${d.buildingNumber}</span><br/>
      <span style="color: #fff; font-weight: bold;">$${d.assetAmount.toLocaleString()}</span>
    </div>
  `;

  return {
    objectsData: realEstateBuildings,
    objectLat: d => d.lat,
    objectLng: d => d.lng,
    objectAltitude: 0.01, // All buildings sit on the surface
    objectThreeObject: createBuildingObject,
    objectLabel: getBuildingLabel,
  };
};

export default RealEstateOverlay;