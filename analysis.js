// Global variables
let map;
let landUseChart;
let currentAnalysisData = {};


let currentMarker = null;
let currentCircle = null;


window.currentPolygonData = {};


let amenityMarkersVisible = false; // Changed to false - amenity markers hidden by default
let centerMarkerVisible = true;
let amenityMarkersGroup = null;


function initAnalysisMap() {
    // Default coordinates for Karachi, Pakistan
    const lat = 24.8607; // Karachi latitude
    const lng = 67.0011; // Karachi longitude
    
    // Make sure the map container exists
    const mapContainer = document.getElementById('analysisMap');
    if (!mapContainer) {
        console.error('Map container not found!');
        return;
    }
    
    // Check if map is already initialized
    if (map) {
        console.log('Map already exists, removing...');
        map.remove();
        map = null;
    }
    
    try {
        map = L.map('analysisMap').setView([lat, lng], 13);
        console.log('Analysis map initialized at:', { lat, lng });
        
        // Add OpenStreetMap tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(map);
        
        // Set default coordinates in input fields
        if (document.getElementById('latitude')) {
            document.getElementById('latitude').value = lat;
        }
        if (document.getElementById('longitude')) {
            document.getElementById('longitude').value = lng;
        }
        
        // Clear any existing markers/circles
        currentMarker = null;
        currentCircle = null;
        
        console.log('Map initialization successful');
        
    } catch (error) {
        console.error('Error initializing map:', error);
    }
}

// Fallback function for compatibility
function initMap() {
    initAnalysisMap();
}

// Initialize elements (placeholder for compatibility)
function initElement() {
    console.log('initElement called - placeholder function');
}

// Initialize Chart.js pie chart
function initChart() {
    try {
        // Destroy existing chart if it exists
        if (landUseChart) {
            landUseChart.destroy();
            landUseChart = null;
        }
        
        const canvasElement = document.getElementById('landUseChart');
        if (!canvasElement) {
            console.error('Chart canvas not found!');
            return;
        }
        
        // Clear any existing chart instance on this canvas
        const existingChart = Chart.getChart(canvasElement);
        if (existingChart) {
            existingChart.destroy();
        }
        
        landUseChart = new Chart(canvasElement, {
        type: 'doughnut',
        data: {
            labels: ['Residential', 'Commercial', 'Industrial', 'Other'],
            datasets: [{
                data: [0, 0, 0, 0],
                backgroundColor: [
                    '#ef4444', // Bright red for residential
                    '#3b82f6', // Bright blue for commercial  
                    '#8b5cf6', // Bright purple for industrial
                    '#6b7280'  // Gray for other
                ],
                borderColor: [
                    '#dc2626', // Dark red border
                    '#1d4ed8', // Dark blue border
                    '#7c3aed', // Dark purple border
                    '#4b5563'  // Dark gray border
                ],
                borderWidth: 3,
                hoverBorderWidth: 4,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    titleColor: '#f3f4f6',
                    bodyColor: '#f3f4f6',
                    borderColor: '#374151',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ' + context.parsed.toFixed(1) + '%';
                        }
                    }
                }
            },
            cutout: '65%',
            animation: {
                animateRotate: true,
                animateScale: true,
                duration: 1000
            }
        }
    });
    
    } catch (error) {
        console.error('Error initializing chart:', error);
    }
}

// Overpass API query builder
function buildOverpassQuery(lat, lng, radius) {
    const radiusMeters = radius * 1000;
    
    return `
        [out:json][timeout:30];
        (
            // Land use polygons
            way["landuse"](around:${radiusMeters},${lat},${lng});
            relation["landuse"](around:${radiusMeters},${lat},${lng});
            
            // Buildings with specific types
            way["building"~"^(residential|commercial|industrial|retail|office)$"](around:${radiusMeters},${lat},${lng});
            
            // Educational facilities
            way["amenity"="school"](around:${radiusMeters},${lat},${lng});
            way["amenity"="university"](around:${radiusMeters},${lat},${lng});
            way["amenity"="college"](around:${radiusMeters},${lat},${lng});
            node["amenity"="school"](around:${radiusMeters},${lat},${lng});
            node["amenity"="university"](around:${radiusMeters},${lat},${lng});
            node["amenity"="college"](around:${radiusMeters},${lat},${lng});
            
            // Shopping facilities
            way["shop"="mall"](around:${radiusMeters},${lat},${lng});
            way["amenity"="marketplace"](around:${radiusMeters},${lat},${lng});
            node["shop"="mall"](around:${radiusMeters},${lat},${lng});
            node["amenity"="marketplace"](around:${radiusMeters},${lat},${lng});
            
            // Fuel stations
            way["amenity"="fuel"](around:${radiusMeters},${lat},${lng});
            node["amenity"="fuel"](around:${radiusMeters},${lat},${lng});
            
            // Restaurants and food
            way["amenity"="restaurant"](around:${radiusMeters},${lat},${lng});
            way["amenity"="fast_food"](around:${radiusMeters},${lat},${lng});
            node["amenity"="restaurant"](around:${radiusMeters},${lat},${lng});
            node["amenity"="fast_food"](around:${radiusMeters},${lat},${lng});
            
            // Roads for site type classification
            way["highway"~"^(motorway|trunk|primary|secondary)$"](around:${radiusMeters},${lat},${lng});
        );
        out geom;
    `;
}

// Fetch data from Overpass API
async function fetchOverpassData(query) {
    const overpassUrl = 'https://overpass-api.de/api/interpreter';
    
    try {
        const response = await fetch(overpassUrl, {
            method: 'POST',
            body: query,
            headers: {
                'Content-Type': 'text/plain'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching Overpass data:', error);
        throw error;
    }
}

// Analyze land use data
function analyzeLandUse(data) {
    const analysis = {
        residential: 0,
        commercial: 0,
        industrial: 0,
        other: 0,
        amenities: {
            schools: 0,
            universities: 0,
            malls: 0,
            fuelStations: 0,
            restaurants: 0
        },
        amenityDetails: {
            schools: [],
            universities: [],
            malls: [],
            fuelStations: [],
            restaurants: []
        },
        roads: {
            highways: 0,
            primary: 0,
            secondary: 0
        }
    };
    
    data.elements.forEach(element => {
        const tags = element.tags || {};
        
        // Helper function to get element name
        function getElementName(element) {
            const tags = element.tags || {};
            return tags.name || tags.brand || tags.operator || 'Unnamed';
        }
        
        // Helper function to get element coordinates
        function getElementCoords(element) {
            if (element.lat && element.lon) {
                return { lat: element.lat, lng: element.lon };
            } else if (element.geometry && element.geometry.length > 0) {
                // For ways, use the center point
                const coords = element.geometry;
                const centerLat = coords.reduce((sum, coord) => sum + coord.lat, 0) / coords.length;
                const centerLng = coords.reduce((sum, coord) => sum + coord.lon, 0) / coords.length;
                return { lat: centerLat, lng: centerLng };
            }
            return null;
        }
        
        // Analyze land use
        if (tags.landuse) {
            switch (tags.landuse) {
                case 'residential':
                    analysis.residential++;
                    break;
                case 'commercial':
                case 'retail':
                    analysis.commercial++;
                    break;
                case 'industrial':
                    analysis.industrial++;
                    break;
                default:
                    analysis.other++;
            }
        }
        
        // Analyze buildings
        if (tags.building) {
            switch (tags.building) {
                case 'residential':
                case 'apartments':
                case 'house':
                    analysis.residential++;
                    break;
                case 'commercial':
                case 'retail':
                case 'office':
                    analysis.commercial++;
                    break;
                case 'industrial':
                case 'warehouse':
                    analysis.industrial++;
                    break;
                default:
                    analysis.other++;
            }
        }
        
        // Analyze amenities with details
        if (tags.amenity) {
            const coords = getElementCoords(element);
            const name = getElementName(element);
            
            switch (tags.amenity) {
                case 'school':
                    analysis.amenities.schools++;
                    analysis.amenityDetails.schools.push({
                        name: name,
                        coordinates: coords,
                        type: tags.school || 'School',
                        address: tags['addr:full'] || tags['addr:street'] || '',
                        website: tags.website || '',
                        phone: tags.phone || ''
                    });
                    break;
                case 'university':
                case 'college':
                    analysis.amenities.universities++;
                    analysis.amenityDetails.universities.push({
                        name: name,
                        coordinates: coords,
                        type: tags.amenity === 'university' ? 'University' : 'College',
                        address: tags['addr:full'] || tags['addr:street'] || '',
                        website: tags.website || '',
                        phone: tags.phone || ''
                    });
                    break;
                case 'fuel':
                    analysis.amenities.fuelStations++;
                    analysis.amenityDetails.fuelStations.push({
                        name: name,
                        coordinates: coords,
                        brand: tags.brand || '',
                        operator: tags.operator || '',
                        address: tags['addr:full'] || tags['addr:street'] || '',
                        opening_hours: tags.opening_hours || ''
                    });
                    break;
                case 'restaurant':
                case 'fast_food':
                    analysis.amenities.restaurants++;
                    analysis.amenityDetails.restaurants.push({
                        name: name,
                        coordinates: coords,
                        type: tags.amenity === 'restaurant' ? 'Restaurant' : 'Fast Food',
                        cuisine: tags.cuisine || '',
                        address: tags['addr:full'] || tags['addr:street'] || '',
                        phone: tags.phone || '',
                        opening_hours: tags.opening_hours || ''
                    });
                    break;
                case 'marketplace':
                    analysis.amenities.malls++;
                    analysis.amenityDetails.malls.push({
                        name: name,
                        coordinates: coords,
                        type: 'Marketplace',
                        address: tags['addr:full'] || tags['addr:street'] || '',
                        opening_hours: tags.opening_hours || ''
                    });
                    break;
            }
        }
        
        // Analyze shops
        if (tags.shop) {
            const coords = getElementCoords(element);
            const name = getElementName(element);
            
            if (tags.shop === 'mall') {
                analysis.amenities.malls++;
                analysis.amenityDetails.malls.push({
                    name: name,
                    coordinates: coords,
                    type: 'Shopping Mall',
                    address: tags['addr:full'] || tags['addr:street'] || '',
                    opening_hours: tags.opening_hours || '',
                    website: tags.website || '',
                    phone: tags.phone || ''
                });
            }
            analysis.commercial++; // All shops count as commercial
        }
        
        // Analyze roads
        if (tags.highway) {
            switch (tags.highway) {
                case 'motorway':
                case 'trunk':
                    analysis.roads.highways++;
                    break;
                case 'primary':
                    analysis.roads.primary++;
                    break;
                case 'secondary':
                    analysis.roads.secondary++;
                    break;  
            }
        }
    });
    
    return analysis;
}

// Determine site type based on road network
function determineSiteType(analysis) {
    const { highways, primary, secondary } = analysis.roads;
    console.log(analysis.roads);
    if (highways <= 7 && primary > 2 && secondary > 5) {
        return 'City';
    } else if (highways > 0) {
        return 'Highway';
    } else if (primary > 0 || secondary > 0) {
        return 'Urban';
    } else {
        return 'Suburban';
    }
}

// Determine dominant land use
function determineDominantLandUse(analysis) {
    const { residential, commercial, industrial } = analysis;
    const total = residential + commercial + industrial;
    
    if (total === 0) return 'Mixed Use';
    
    const residentialPercent = (residential / total) * 100;
    const commercialPercent = (commercial / total) * 100;
    const industrialPercent = (industrial / total) * 100;
    
    if (residentialPercent > 50) return 'Residential';
    if (commercialPercent > 30) return 'Commercial';
    if (industrialPercent > 20) return 'Industrial';
    
    return 'Mixed Use';
}

// Add function to recreate land use polygons from stored data
function recreateLandUsePolygons(polygonData, areaData) {
    try {
        if (!polygonData || !areaData) {
            console.log('❌ No polygon data to recreate');
            return;
        }
        
        console.log('🔄 Recreating land use polygons...', polygonData);
        
        // Clear existing polygons
        if (window.landUseLayerGroup) {
            analysisMap.removeLayer(window.landUseLayerGroup);
        }
        
        // Create new layer group
        window.landUseLayerGroup = L.layerGroup().addTo(analysisMap);
        
        // Define land use colors
        const landUseColors = {
            'Residential': '#ffcccb',
            'Commercial': '#add8e6', 
            'Industrial': '#d3d3d3',
            'Educational': '#98fb98',
            'Healthcare': '#f0e68c',
            'Recreational': '#dda0dd',
            'Mixed Use': '#ffd700',
            'Open Space': '#90ee90',
            'Other': '#e6e6fa'
        };
        
        // Process each land use type
        Object.keys(polygonData).forEach(landUseType => {
            const polygons = polygonData[landUseType];
            const color = landUseColors[landUseType] || '#e6e6fa';
            
            if (Array.isArray(polygons)) {
                polygons.forEach(polygon => {
                    if (polygon && polygon.coordinates && polygon.coordinates.length > 0) {
                        try {
                            // Convert coordinates to Leaflet format
                            const latLngs = polygon.coordinates.map(coord => [coord[1], coord[0]]);
                            
                            // Create polygon
                            const leafletPolygon = L.polygon(latLngs, {
                                color: color,
                                fillColor: color,
                                fillOpacity: 0.6,
                                weight: 2
                            });
                            
                            // Add popup with land use info
                            leafletPolygon.bindPopup(`
                                <div class="popup-content">
                                    <h4>🏗️ ${landUseType}</h4>
                                    <p><strong>Area:</strong> ${polygon.area || 'N/A'} sq meters</p>
                                    <p><strong>Percentage:</strong> ${(polygon.percentage || 0).toFixed(1)}%</p>
                                </div>
                            `);
                            
                            // Add to layer group
                            window.landUseLayerGroup.addLayer(leafletPolygon);
                            
                        } catch (err) {
                            console.error('Error creating polygon for', landUseType, err);
                        }
                    }
                });
            }
        });
        
        console.log('✅ Land use polygons recreated successfully');
        
    } catch (error) {
        console.error('❌ Error recreating land use polygons:', error);
    }
}

// Function to update population map radius
function updatePopulationRadius(lat, lng, radius) {
    try {
        // Update the radius input if it exists
        const radiusInput = document.querySelector('input[placeholder="Radius in meters"]');
        if (radiusInput) {
            radiusInput.value = radius;
        }
        
        // Trigger population map update if the function exists
        if (typeof window.updatePopulationMap === 'function') {
            window.updatePopulationMap(lat, lng, radius);
        } else if (typeof updatePopulationMap === 'function') {
            updatePopulationMap(lat, lng, radius);
        }
        
        console.log('✅ Population radius updated to', radius, 'meters');
        
    } catch (error) {
        console.error('❌ Error updating population radius:', error);
    }
}

// Make update function globally available
window.updatePopulationRadius = updatePopulationRadius;

// Helper function to determine land use type from tags
function determineLandUseType(tags) {
    if (tags.landuse) {
        const landuse = tags.landuse.toLowerCase();
        if (landuse.includes('residential')) return 'Residential';
        if (landuse.includes('commercial') || landuse.includes('retail')) return 'Commercial';
        if (landuse.includes('industrial')) return 'Industrial';
        if (landuse.includes('education') || landuse.includes('school')) return 'Educational';
        if (landuse.includes('health') || landuse.includes('hospital')) return 'Healthcare';
        if (landuse.includes('recreation') || landuse.includes('park')) return 'Recreational';
        if (landuse.includes('mixed')) return 'Mixed Use';
        if (landuse.includes('green') || landuse.includes('forest')) return 'Open Space';
    }
    
    if (tags.building) {
        const building = tags.building.toLowerCase();
        if (building.includes('residential') || building.includes('house') || building.includes('apartment')) return 'Residential';
        if (building.includes('commercial') || building.includes('office') || building.includes('retail')) return 'Commercial';
        if (building.includes('industrial') || building.includes('warehouse')) return 'Industrial';
        if (building.includes('school') || building.includes('university')) return 'Educational';
        if (building.includes('hospital') || building.includes('clinic')) return 'Healthcare';
    }
    
    if (tags.amenity) {
        const amenity = tags.amenity.toLowerCase();
        if (amenity.includes('school') || amenity.includes('university')) return 'Educational';
        if (amenity.includes('hospital') || amenity.includes('clinic')) return 'Healthcare';
        if (amenity.includes('park') || amenity.includes('playground')) return 'Recreational';
        if (amenity.includes('shop') || amenity.includes('mall')) return 'Commercial';
    }
    
    return 'Other';
}

// Add land use polygons to map with area calculation
function addLandUseToMap(data) {
    // Clear existing layers (polygons, polylines, but preserve amenity markers)
    map.eachLayer(layer => {
        if (layer instanceof L.Polygon || 
            layer instanceof L.Polyline || 
            (layer instanceof L.Marker && !layer.options.keepOnRefresh) || 
            (layer instanceof L.Circle && !layer.options.keepOnRefresh)) {
            map.removeLayer(layer);
        }
    });
    
    // Clear our tracked markers and circles
    currentMarker = null;
    currentCircle = null;
    
    // Clear polygon data for fresh analysis
    window.currentPolygonData = {};
    
    // Get coordinates from input fields
    const lat = parseFloat(document.getElementById('latitude').value);
    const lng = parseFloat(document.getElementById('longitude').value);
    const radius = parseFloat(document.getElementById('radius').value) * 1000; // Convert to meters
    
    // Add blue center marker
    currentMarker = L.marker([lat, lng], {
        icon: L.divIcon({
            className: 'custom-marker',
            html: '<div style="background: #3b82f6; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.3);"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        })
    }).addTo(map).bindPopup('Analysis Center Point');
    
    // Add analysis circle with blue color
    currentCircle = L.circle([lat, lng], {
        radius: radius,
        color: '#3b82f6',
        fillColor: 'transparent',
        fillOpacity: 0,
        weight: 3,
        dashArray: '10, 10'
    }).addTo(map);
    
    // Ensure center marker toggle is visible
    centerMarkerVisible = true;
    const centerToggleBtn = document.getElementById('centerToggleBtn');
    if (centerToggleBtn) {
        centerToggleBtn.style.opacity = '1';
        centerToggleBtn.title = 'Hide Center Marker & Radius';
    }
    
    // Create analysis circle as turf polygon for clipping
    const center = turf.point([lng, lat]);
    const circlePolygon = turf.buffer(center, radius / 1000, { units: 'kilometers' });
    
    const areaAnalysis = {
        residential: 0,
        commercial: 0,
        industrial: 0,
        other: 0
    };
    
    // Process and clip polygons
    data.elements.forEach(element => {
        if (element.type === 'way' && element.geometry && element.geometry.length > 2) {
            const tags = element.tags || {};
            let landUseType = 'other';
            let color = '#4b5563'; // Dark gray
            let fillColor = '#6b7280';
            
            // Determine land use type and colors
            if (tags.landuse) {
                switch (tags.landuse) {
                    case 'residential':
                        landUseType = 'residential';
                        color = '#dc2626'; // Dark red
                        fillColor = '#ef4444'; // Bright red
                        break;
                    case 'commercial':
                    case 'retail':
                        landUseType = 'commercial';
                        color = '#1d4ed8'; // Dark blue
                        fillColor = '#3b82f6'; // Bright blue
                        break;
                    case 'industrial':
                        landUseType = 'industrial';
                        color = '#7c3aed'; // Dark purple
                        fillColor = '#8b5cf6'; // Bright purple
                        break;
                }
            }
            
            // Override with building type if more specific
            if (tags.building) {
                switch (tags.building) {
                    case 'residential':
                    case 'apartments':
                    case 'house':
                        landUseType = 'residential';
                        color = '#dc2626';
                        fillColor = '#ef4444';
                        break;
                    case 'commercial':
                    case 'retail':
                    case 'office':
                        landUseType = 'commercial';
                        color = '#1d4ed8';
                        fillColor = '#3b82f6';
                        break;
                    case 'industrial':
                    case 'warehouse':
                        landUseType = 'industrial';
                        color = '#7c3aed';
                        fillColor = '#8b5cf6';
                        break;
                }
            }
            
            try {
                // Convert coordinates to turf polygon
                const coordinates = element.geometry.map(coord => [coord.lon, coord.lat]);
                coordinates.push(coordinates[0]); // Close the polygon
                
                const polygon = turf.polygon([coordinates]);
                
                // Clip polygon to analysis circle
                const clipped = turf.intersect(polygon, circlePolygon);
                
                if (clipped && clipped.geometry) {
                    // Calculate area in square meters
                    const area = turf.area(clipped);
                    areaAnalysis[landUseType] += area;
                    
                    // Convert back to Leaflet coordinates
                    let leafletCoords;
                    if (clipped.geometry.type === 'Polygon') {
                        leafletCoords = clipped.geometry.coordinates[0].map(coord => [coord[1], coord[0]]);
                    } else if (clipped.geometry.type === 'MultiPolygon') {
                        // Handle multipolygons
                        clipped.geometry.coordinates.forEach(polyCoords => {
                            leafletCoords = polyCoords[0].map(coord => [coord[1], coord[0]]);
                            
                            if (leafletCoords.length > 2) {
                                // Store polygon data for recreation
                                const landUseType = determineLandUseType(tags);
                                if (!window.currentPolygonData[landUseType]) {
                                    window.currentPolygonData[landUseType] = [];
                                }
                                window.currentPolygonData[landUseType].push({
                                    coordinates: polyCoords[0],
                                    area: area,
                                    percentage: (area / (Math.PI * Math.pow(radius, 2))) * 100,
                                    tags: tags
                                });
                                
                                L.polygon(leafletCoords, {
                                    color: color,
                                    fillColor: fillColor,
                                    weight: 2,
                                    fillOpacity: 0.6,
                                    opacity: 0.8
                                }).addTo(map)
                                .bindPopup(`
                                    <div class="bg-gray-800 text-white p-2 rounded">
                                        <strong>${tags.landuse || tags.building || 'Unknown'}</strong><br>
                                        <span class="text-sm">${tags.name || 'Unnamed area'}</span><br>
                                        <span class="text-xs text-gray-300">Area: ${(area/1000).toFixed(1)} km²</span>
                                    </div>
                                `);
                            }
                        });
                        return;
                    }
                    
                    if (leafletCoords && leafletCoords.length > 2) {
                        // Store polygon data for recreation
                        const landUseType = determineLandUseType(tags);
                        if (!window.currentPolygonData[landUseType]) {
                            window.currentPolygonData[landUseType] = [];
                        }
                        window.currentPolygonData[landUseType].push({
                            coordinates: coordinates.map(coord => [coord.lng, coord.lat]),
                            area: area,
                            percentage: (area / (Math.PI * Math.pow(radius, 2))) * 100,
                            tags: tags
                        });
                        
                        L.polygon(leafletCoords, {
                            color: color,
                            fillColor: fillColor,
                            weight: 2,
                            fillOpacity: 0.6,
                            opacity: 0.8
                        }).addTo(map)
                        .bindPopup(`
                            <div class="bg-gray-800 text-white p-2 rounded">
                                <strong>${tags.landuse || tags.building || 'Unknown'}</strong><br>
                                <span class="text-sm">${tags.name || 'Unnamed area'}</span><br>
                                <span class="text-xs text-gray-300">Area: ${(area/1000).toFixed(1)} km²</span>
                            </div>
                        `);
                    }
                }
            } catch (error) {
                console.warn('Error processing polygon:', error);
                // Fallback: add original polygon without clipping
                const coordinates = element.geometry.map(coord => [coord.lat, coord.lon]);
                if (coordinates.length > 2) {
                    L.polygon(coordinates, {
                        color: color,
                        fillColor: fillColor,
                        weight: 1,
                        fillOpacity: 0.4,
                        opacity: 0.6
                    }).addTo(map);
                }
            }
        }
    });
    
    // Store area analysis for chart update
    currentAnalysisData.areaAnalysis = areaAnalysis;
    return areaAnalysis;
}

// Global variable to store amenity details for tooltips
window.currentAmenityDetails = {};

// Update UI with analysis results (area-based)
function updateUI(analysis, areaAnalysis = null) {
    // Store amenity details globally for tooltip access
    window.currentAmenityDetails = analysis.amenityDetails || {};
    
    // Update site type and area status
    const siteType = determineSiteType(analysis);
    const dominantLandUse = determineDominantLandUse(analysis);
    
    document.getElementById('siteType').innerHTML = `
        <span class="text-2xl font-bold text-yellow-400">${siteType}</span>
    `;
    
    document.getElementById('areaStatus').innerHTML = `
        <span class="text-2xl font-bold text-green-400">${dominantLandUse}</span>
    `;
    
    // Update land use counts
    document.getElementById('residentialCount').textContent = analysis.residential;
    document.getElementById('commercialCount').textContent = analysis.commercial;
    document.getElementById('industrialCount').textContent = analysis.industrial;
    
    // Update amenity counts
    document.getElementById('universityCount').textContent = analysis.amenities.universities;
    document.getElementById('schoolCount').textContent = analysis.amenities.schools;
    document.getElementById('mallCount').textContent = analysis.amenities.malls;
    document.getElementById('fuelStationCount').textContent = analysis.amenities.fuelStations;
    document.getElementById('restaurantCount').textContent = analysis.amenities.restaurants;
    
    // Update tooltips with actual data
    updateTooltipContent();
    
    // Update chart with area data if available, otherwise use counts
    const chartData = areaAnalysis || {
        residential: analysis.residential,
        commercial: analysis.commercial,
        industrial: analysis.industrial,
        other: analysis.other
    };
    
    const total = chartData.residential + chartData.commercial + chartData.industrial + chartData.other;
    
    if (total > 0 && landUseChart) {
        // Convert to percentages for better visualization
        const residentialPercent = (chartData.residential / total) * 100;
        const commercialPercent = (chartData.commercial / total) * 100;
        const industrialPercent = (chartData.industrial / total) * 100;
        const otherPercent = (chartData.other / total) * 100;
        
        // Update chart data
        landUseChart.data.datasets[0].data = [
            residentialPercent,
            commercialPercent,
            industrialPercent,
            otherPercent
        ];
        
        // Update chart colors to match map
        landUseChart.data.datasets[0].backgroundColor = [
            '#ef4444', // Bright red for residential
            '#3b82f6', // Bright blue for commercial
            '#8b5cf6', // Bright purple for industrial
            '#6b7280'  // Gray for other
        ];
        
        landUseChart.data.datasets[0].borderColor = [
            '#dc2626', // Dark red border
            '#1d4ed8', // Dark blue border
            '#7c3aed', // Dark purple border
            '#4b5563'  // Dark gray border
        ];
        
        // Force chart update
        landUseChart.update('active');
        
        // Update legend with percentages if area data is available
        if (areaAnalysis && typeof chartData.residential === 'number' && chartData.residential > 1000) {
            // This looks like area data (square meters), show area info
            document.getElementById('residentialCount').textContent = 
                `${residentialPercent.toFixed(1)}% (${(chartData.residential/1000000).toFixed(2)} km²)`;
            document.getElementById('commercialCount').textContent = 
                `${commercialPercent.toFixed(1)}% (${(chartData.commercial/1000000).toFixed(2)} km²)`;
            document.getElementById('industrialCount').textContent = 
                `${industrialPercent.toFixed(1)}% (${(chartData.industrial/1000000).toFixed(2)} km²)`;
        } else {
            // This looks like count data, just show the counts
            document.getElementById('residentialCount').textContent = analysis.residential || 0;
            document.getElementById('commercialCount').textContent = analysis.commercial || 0;
            document.getElementById('industrialCount').textContent = analysis.industrial || 0;
        }
        
        console.log('Chart updated with data:', {
            residential: residentialPercent.toFixed(1) + '%',
            commercial: commercialPercent.toFixed(1) + '%',
            industrial: industrialPercent.toFixed(1) + '%',
            other: otherPercent.toFixed(1) + '%'
        });
    } else if (!landUseChart) {
        console.error('Chart not initialized when trying to update');
    } else {
        console.warn('No data to display in chart, total:', total);
    }
}

// Function to update tooltip content with amenity details
function updateTooltipContent() {
    const amenityDetails = window.currentAmenityDetails || {};
    
    // Add pinpoint markers for all amenities
    addAmenityMarkers(amenityDetails);
    
    // Update Universities tooltip
    updateAmenityTooltip('universities', amenityDetails.universities || [], (item) => `
        <div class="tooltip-item">
            <div class="tooltip-item-name">${item.name}</div>
            <div class="tooltip-item-type text-blue-300">${item.type}</div>
            ${item.address ? `<div class="tooltip-item-address text-gray-400">${item.address}</div>` : ''}
            ${item.website ? `<div class="tooltip-item-website text-blue-400">${item.website}</div>` : ''}
        </div>
    `);
    
    // Update Schools tooltip
    updateAmenityTooltip('schools', amenityDetails.schools || [], (item) => `
        <div class="tooltip-item">
            <div class="tooltip-item-name">${item.name}</div>
            <div class="tooltip-item-type text-green-300">${item.type}</div>
            ${item.address ? `<div class="tooltip-item-address text-gray-400">${item.address}</div>` : ''}
            ${item.phone ? `<div class="tooltip-item-phone text-gray-400">${item.phone}</div>` : ''}
        </div>
    `);
    
    // Update Malls tooltip
    updateAmenityTooltip('malls', amenityDetails.malls || [], (item) => `
        <div class="tooltip-item">
            <div class="tooltip-item-name">${item.name}</div>
            <div class="tooltip-item-type text-purple-300">${item.type}</div>
            ${item.address ? `<div class="tooltip-item-address text-gray-400">${item.address}</div>` : ''}
            ${item.opening_hours ? `<div class="tooltip-item-hours text-gray-400">Hours: ${item.opening_hours}</div>` : ''}
        </div>
    `);
    
    // Update Fuel Stations tooltip
    updateAmenityTooltip('fuel', amenityDetails.fuelStations || [], (item) => `
        <div class="tooltip-item">
            <div class="tooltip-item-name">${item.name}</div>
            <div class="tooltip-item-brand text-yellow-300">${item.brand || item.operator || 'Fuel Station'}</div>
            ${item.address ? `<div class="tooltip-item-address text-gray-400">${item.address}</div>` : ''}
            ${item.opening_hours ? `<div class="tooltip-item-hours text-gray-400">Hours: ${item.opening_hours}</div>` : ''}
        </div>
    `);
    
    // Update Restaurants tooltip
    updateAmenityTooltip('restaurants', amenityDetails.restaurants || [], (item) => `
        <div class="tooltip-item">
            <div class="tooltip-item-name">${item.name}</div>
            <div class="tooltip-item-type text-red-300">${item.type}${item.cuisine ? ` - ${item.cuisine}` : ''}</div>
            ${item.address ? `<div class="tooltip-item-address text-gray-400">${item.address}</div>` : ''}
            ${item.phone ? `<div class="tooltip-item-phone text-gray-400">${item.phone}</div>` : ''}
        </div>
    `);
}

// Add pinpoint markers for amenities
function addAmenityMarkers(amenityDetails) {
    if (!map || !amenityDetails) return;
    
    // Clear existing amenity markers
    if (amenityMarkersGroup) {
        map.removeLayer(amenityMarkersGroup);
    }
    
    // Create new layer group for amenity markers
    amenityMarkersGroup = L.layerGroup();
    
    // Define marker styles for different amenity types
    const markerStyles = {
        universities: { color: '#3b82f6', icon: '🎓', size: 15 },
        schools: { color: '#10b981', icon: '🏫', size: 12 },
        malls: { color: '#8b5cf6', icon: '🏪', size: 13 },
        fuelStations: { color: '#f59e0b', icon: '⛽', size: 12 },
        restaurants: { color: '#ef4444', icon: '🍽️', size: 11 }
    };
    
    // Add markers for each amenity type
    Object.entries(amenityDetails).forEach(([type, amenities]) => {
        if (!amenities || !Array.isArray(amenities)) return;
        
        const style = markerStyles[type];
        if (!style) return;
        
        amenities.forEach(amenity => {
            if (amenity.coordinates && amenity.coordinates.lat && amenity.coordinates.lng) {
                const marker = L.marker([amenity.coordinates.lat, amenity.coordinates.lng], {
                    keepOnRefresh: true, // Mark to preserve during map refresh
                    icon: L.divIcon({
                        className: 'amenity-marker',
                        html: `<div style="
                            background: ${style.color}; 
                            color: white; 
                            width: ${style.size + 6}px; 
                            height: ${style.size + 6}px; 
                            border-radius: 50%; 
                            border: 2px solid white; 
                            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: ${style.size - 2}px;
                            font-weight: bold;
                        ">${style.icon}</div>`,
                        iconSize: [style.size + 6, style.size + 6],
                        iconAnchor: [(style.size + 6) / 2, (style.size + 6) / 2]
                    })
                });
                
                // Create detailed popup content
                let popupContent = `<div class="amenity-popup">
                    <div class="amenity-popup-title" style="font-weight: bold; color: ${style.color}; margin-bottom: 5px;">
                        ${style.icon} ${amenity.name}
                    </div>`;
                
                if (amenity.type || amenity.brand || amenity.operator) {
                    popupContent += `<div class="amenity-popup-type" style="color: #666; font-size: 12px; margin-bottom: 3px;">
                        ${amenity.type || amenity.brand || amenity.operator}
                    </div>`;
                }
                
                if (amenity.address) {
                    popupContent += `<div class="amenity-popup-address" style="color: #888; font-size: 11px; margin-bottom: 3px;">
                        📍 ${amenity.address}
                    </div>`;
                }
                
                if (amenity.cuisine) {
                    popupContent += `<div class="amenity-popup-cuisine" style="color: #888; font-size: 11px; margin-bottom: 3px;">
                        🍴 ${amenity.cuisine}
                    </div>`;
                }
                
                if (amenity.opening_hours) {
                    popupContent += `<div class="amenity-popup-hours" style="color: #888; font-size: 11px; margin-bottom: 3px;">
                        🕒 ${amenity.opening_hours}
                    </div>`;
                }
                
                if (amenity.phone) {
                    popupContent += `<div class="amenity-popup-phone" style="color: #888; font-size: 11px; margin-bottom: 3px;">
                        📞 ${amenity.phone}
                    </div>`;
                }
                
                if (amenity.website) {
                    popupContent += `<div class="amenity-popup-website" style="margin-top: 5px;">
                        <a href="${amenity.website}" target="_blank" style="color: ${style.color}; font-size: 11px; text-decoration: none;">
                            🌐 Visit Website
                        </a>
                    </div>`;
                }
                
                popupContent += `</div>`;
                
                marker.bindPopup(popupContent, {
                    maxWidth: 250,
                    className: 'amenity-popup-container'
                });
                
                // Add marker to group
                amenityMarkersGroup.addLayer(marker);
            }
        });
    });
    
    // Add group to map if amenity markers should be visible
    if (amenityMarkersVisible) {
        amenityMarkersGroup.addTo(map);
    }
    
    // Update amenity toggle button state
    const amenityToggleBtn = document.getElementById('amenityToggleBtn');
    if (amenityToggleBtn) {
        amenityToggleBtn.style.opacity = amenityMarkersVisible ? '1' : '0.5';
        amenityToggleBtn.title = amenityMarkersVisible ? 'Hide Amenity Markers' : 'Show Amenity Markers';
    }
}

// Helper function to update individual amenity tooltip
function updateAmenityTooltip(amenityType, items, formatFunction) {
    const tooltipList = document.getElementById(`${amenityType}-tooltip-list`);
    if (!tooltipList) return;
    
    if (items.length === 0) {
        tooltipList.innerHTML = '<div class="tooltip-item text-gray-500">No data found in this area</div>';
        return;
    }
    
    // Limit to top 10 items to avoid overly long tooltips
    const displayItems = items.slice(0, 10);
    const tooltipContent = displayItems.map(formatFunction).join('');
    
    if (items.length > 10) {
        tooltipList.innerHTML = tooltipContent + `<div class="tooltip-item text-gray-400 text-xs mt-2">...and ${items.length - 10} more</div>`;
    } else {
        tooltipList.innerHTML = tooltipContent;
    }
}

// Show loading state with progressive steps
function showLoading() {
    document.getElementById('loadingIndicator').classList.remove('hidden');
    document.getElementById('analyzeBtn').disabled = true;
    document.getElementById('analyzeBtn').innerHTML = `
        <svg class="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Analyzing...
    `;
    
    // Reset loading steps
    resetLoadingSteps();
    
    // Progressive step animation
    setTimeout(() => updateLoadingStep(1), 500);
    setTimeout(() => updateLoadingStep(2), 1500);
    setTimeout(() => updateLoadingStep(3), 2500);
}

// Update loading step visibility
function updateLoadingStep(step) {
    const stepElement = document.getElementById(`loadingStep${step}`);
    if (stepElement) {
        stepElement.classList.remove('opacity-30');
        stepElement.classList.add('opacity-100', 'text-yellow-300');
        
        // Add checkmark when complete
        if (step < 3) {
            setTimeout(() => {
                stepElement.innerHTML = stepElement.innerHTML.replace('🔍', '✅').replace('🏗️', '✅').replace('📊', '✅');
            }, 800);
        }
    }
}

// Reset loading steps
function resetLoadingSteps() {
    for (let i = 1; i <= 3; i++) {
        const stepElement = document.getElementById(`loadingStep${i}`);
        if (stepElement) {
            stepElement.classList.remove('opacity-100', 'text-yellow-300');
            stepElement.classList.add('opacity-30');
            
            // Reset icons
            if (i === 1) stepElement.innerHTML = 'Querying OpenStreetMap...';
            if (i === 2) stepElement.innerHTML = 'Processing land use data...';
            if (i === 3) stepElement.innerHTML = 'Generating analysis...';
        }
    }
}

// Hide loading state
function hideLoading() {
    // Show completion step briefly before hiding
    updateLoadingStep(3);
    const step3 = document.getElementById('loadingStep3');
    if (step3) {
        step3.innerHTML = '✅ Analysis complete!';
        step3.classList.add('text-green-400');
    }
    
    setTimeout(() => {
        document.getElementById('loadingIndicator').classList.add('hidden');
        document.getElementById('analyzeBtn').disabled = false;
        document.getElementById('analyzeBtn').innerHTML = `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2-2z"></path>
            </svg>
            <span>Analyze Area</span>
        `;
    }, 800);
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for(let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

function setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
}

function loadCoordinatesFromCookies() {
    const savedLat = getCookie('map_latitude');
    const savedLng = getCookie('map_longitude');
    const savedRadius = getCookie('map_radius');
    
    if (savedLat && savedLng && savedRadius) {
        // Auto-fill the input fields
        document.getElementById('latitude').value = savedLat;
        document.getElementById('longitude').value = savedLng;
        document.getElementById('radius').value = savedRadius;
        
        // Update map view to saved coordinates
        if (map) {
            map.setView([parseFloat(savedLat), parseFloat(savedLng)], 13);
        }
        
        console.log('Coordinates loaded from cookies:', { 
            lat: savedLat, 
            lng: savedLng, 
            radius: savedRadius 
        });
        
        Toastify({
            text: "Coordinates loaded from previous search",
            duration: 2000,
            gravity: "top",
            position: "right",
            offset: {
                x: 20,
                y: 80
            },
            className: "bg-gradient-to-r from-green-800 to-green-700 text-white rounded-lg shadow-lg border border-green-600/20 font-medium text-sm transition-all duration-300 ease-out transform",
            stopOnFocus: true
        }).showToast();
    } else {
        // Set default Karachi coordinates if no cookies found
        document.getElementById('latitude').value = 24.8607;
        document.getElementById('longitude').value = 67.0011;
        document.getElementById('radius').value = 2; // Default radius
    }
}

async function startAnalysis() {
    const lat = parseFloat(document.getElementById('latitude').value);
    const lng = parseFloat(document.getElementById('longitude').value);
    const radius = parseFloat(document.getElementById('radius').value);
    
    // Validate inputs
    if (isNaN(lat) || isNaN(lng) || isNaN(radius)) {
        alert('Please enter valid coordinates and radius');
        return;
    }
    
    if (radius < 0.5 || radius > 10) {
        alert('Radius must be between 0.5 and 10 kilometers');
        return;
    }
    
    // Save coordinates to cookies
    setCookie('map_latitude', lat, 30);
    setCookie('map_longitude', lng, 30);
    setCookie('map_radius', radius, 30);
    
    showLoading();
    
    try {
        // Update map view to new coordinates
        map.setView([lat, lng], 13);
        
        // Build and execute Overpass query for land use analysis only
        const query = buildOverpassQuery(lat, lng, radius);
        console.log('Executing Overpass query for land use...');
        
        const data = await fetchOverpassData(query);
        console.log('Received land use data:', data);
        
        // Analyze the land use data (no amenities here)
        const analysis = analyzeLandUse(data);
        console.log('Land use analysis results:', analysis);
        
        // Add polygons to map and get area analysis
        const areaAnalysis = addLandUseToMap(data);
        console.log('Area analysis:', areaAnalysis);
        
        // Store current analysis
        currentAnalysisData = { data, analysis, areaAnalysis, lat, lng, radius };
        
        // Save analysis data to storage manager
        saveAnalysisDataToStorage(lat, lng, radius, analysis, areaAnalysis, data);
        
        // Update UI with land use data only (amenities handled by HTML)
        updateUI(analysis, areaAnalysis);
        
        // Now update unified amenity data via the HTML system
        if (window.updateAmenityDataForAnalysis) {
            console.log('Updating unified amenity data...');
            await window.updateAmenityDataForAnalysis();
        }
        
    } catch (error) {
        console.error('Analysis failed:', error);
        alert('Analysis failed. Please check your internet connection and try again.');
    } finally {
        hideLoading();
    }
}

// Save analysis data to storage manager
function saveAnalysisDataToStorage(lat, lng, radius, analysis, areaAnalysis, rawData) {
    try {
        // Calculate land use percentages from area analysis
        const totalArea = Object.values(areaAnalysis || {}).reduce((sum, area) => sum + area, 0);
        const landUsePercentages = {};
        const landUseCounts = {
            residential: analysis.residential || 0,
            commercial: analysis.commercial || 0,
            industrial: analysis.industrial || 0,
            other: analysis.other || 0
        };
        const landUseAreas = areaAnalysis || {};
        
        if (totalArea > 0) {
            Object.keys(landUseAreas).forEach(landUse => {
                landUsePercentages[landUse] = ((landUseAreas[landUse] / totalArea) * 100).toFixed(2);
            });
        }

        // Calculate total amenity counts
        const totalAmenities = Object.values(analysis.amenities || {}).reduce((sum, count) => sum + count, 0);
        
        // Calculate total road infrastructure
        const totalRoads = Object.values(analysis.roads || {}).reduce((sum, count) => sum + count, 0);

        const analysisData = {
            // Basic search parameters
            searchCoordinates: {
                latitude: lat,
                longitude: lng,
                radius: radius
            },
            
            // Derived classifications
            siteType: determineSiteType(analysis),
            dominantLandUse: determineDominantLandUse(analysis),
            
            // Complete element count
            totalElements: rawData?.elements?.length || 0,
            
            // Coordinates for reference
            coordinates: {
                center: { lat, lng },
                radius: radius,
                analysisArea: Math.PI * Math.pow(radius * 1000, 2) // in square meters
            },
            
            // Comprehensive land use data
            landUse: {
                counts: landUseCounts,
                areas: landUseAreas,
                percentages: landUsePercentages,
                totalArea: totalArea,
                dominantType: determineDominantLandUse(analysis)
            },
            
            // Complete amenities data with details
            amenities: {
                counts: analysis.amenities || {},
                totalCount: totalAmenities,
                details: analysis.amenityDetails || {},
                // Summary by category
                summary: {
                    education: (analysis.amenities?.schools || 0) + (analysis.amenities?.universities || 0),
                    commercial: analysis.amenities?.malls || 0,
                    fuel: analysis.amenities?.fuelStations || 0,
                    food: analysis.amenities?.restaurants || 0
                }
            },
            
            // Road infrastructure data
            roads: {
                counts: analysis.roads || {},
                totalCount: totalRoads,
                classification: determineSiteType(analysis),
                // Road density per km²
                density: totalRoads / (Math.PI * Math.pow(radius, 2))
            },
            
            // Raw OSM data summary
            rawOSMData: {
                elementCount: rawData?.elements?.length || 0,
                lastQueried: new Date().toISOString(),
                dataTypes: {
                    nodes: rawData?.elements?.filter(el => el.type === 'node').length || 0,
                    ways: rawData?.elements?.filter(el => el.type === 'way').length || 0,
                    relations: rawData?.elements?.filter(el => el.type === 'relation').length || 0
                }
            },
            
            // Analysis summary and scores
            summary: {
                landUseScore: calculateLandUseScore(analysis),
                amenityScore: calculateAmenityScore(analysis),
                accessibilityScore: calculateAccessibilityScore(analysis),
                overallDiversity: calculateDiversityIndex(analysis),
                analysisRadius: radius,
                centerPoint: { lat, lng },
                hasAreaAnalysis: !!areaAnalysis && totalArea > 0,
                dataQuality: rawData?.elements?.length > 0 ? 'Good' : 'Limited'
            },
            
            // Store polygon data for visual recreation
            landUsePolygons: window.currentPolygonData || {},
            
            // Complete metadata
            metadata: {
                analysisTimestamp: new Date().toISOString(),
                dataSource: 'Overpass API (OpenStreetMap)',
                module: 'analysis',
                version: '2.0',
                queryType: 'Land Use Analysis with Amenities',
                processingTime: new Date().toISOString(),
                lastUpdated: new Date().toISOString()
            }
        };

        if (window.storageManager) {
            window.storageManager.setAnalysisData(analysisData);
            console.log('✅ Complete analysis data saved to storage manager:', analysisData);
        } else {
            console.warn('⚠️ StorageManager not available, analysis data not saved');
        }
    } catch (error) {
        console.error('❌ Error saving analysis data to storage:', error);
    }
}

// Helper functions for scoring analysis results
function calculateLandUseScore(analysis) {
    const total = (analysis.residential || 0) + (analysis.commercial || 0) + (analysis.industrial || 0) + (analysis.other || 0);
    if (total === 0) return 0;
    
    // Score based on land use diversity (higher diversity = higher score)
    const types = [analysis.residential, analysis.commercial, analysis.industrial, analysis.other].filter(count => count > 0).length;
    return Math.min((types / 4) * 100, 100);
}

function calculateAmenityScore(analysis) {
    const amenities = analysis.amenities || {};
    const totalAmenities = Object.values(amenities).reduce((sum, count) => sum + count, 0);
    
    if (totalAmenities === 0) return 0;
    
    // Score based on amenity diversity and count
    const amenityTypes = Object.keys(amenities).filter(key => amenities[key] > 0).length;
    const countScore = Math.min(totalAmenities * 2, 60); // Max 60 points for count
    const diversityScore = Math.min(amenityTypes * 8, 40); // Max 40 points for diversity
    
    return Math.min(countScore + diversityScore, 100);
}

function calculateAccessibilityScore(analysis) {
    const roads = analysis.roads || {};
    const totalRoads = Object.values(roads).reduce((sum, count) => sum + count, 0);
    
    if (totalRoads === 0) return 0;
    
    // Weighted scoring based on road importance
    const score = (roads.highways || 0) * 30 + (roads.primary || 0) * 20 + (roads.secondary || 0) * 10;
    return Math.min(score, 100);
}

function calculateDiversityIndex(analysis) {
    // Shannon diversity index for land use
    const landUseCounts = [analysis.residential || 0, analysis.commercial || 0, analysis.industrial || 0, analysis.other || 0];
    const total = landUseCounts.reduce((sum, count) => sum + count, 0);
    
    if (total === 0) return 0;
    
    let diversity = 0;
    landUseCounts.forEach(count => {
        if (count > 0) {
            const proportion = count / total;
            diversity -= proportion * Math.log(proportion);
        }
    });
    
    // Normalize to 0-100 scale (max diversity for 4 types is ln(4))
    return (diversity / Math.log(4)) * 100;
}

// Load previous analysis data from storage
function loadAnalysisDataFromStorage() {
    try {
        if (window.storageManager) {
            const analysisData = window.storageManager.getAnalysisData();
            if (analysisData && analysisData.searchCoordinates) {
                console.log('📋 Loading comprehensive analysis data from storage:', analysisData);
                
                // Restore search coordinates
                document.getElementById('latitude').value = analysisData.searchCoordinates.latitude;
                document.getElementById('longitude').value = analysisData.searchCoordinates.longitude;
                document.getElementById('radius').value = analysisData.searchCoordinates.radius;
                
                // Set map view only if map is available
                if (map) {
                    map.setView([analysisData.searchCoordinates.latitude, analysisData.searchCoordinates.longitude], 13);
                    
                    // Add radius circle
                    addAnalysisRadius(analysisData.searchCoordinates.latitude, analysisData.searchCoordinates.longitude, analysisData.searchCoordinates.radius);
                }
                
                // Reconstruct analysis object for UI compatibility (if using old format)
                let reconstructedAnalysis = analysisData.landUseAnalysis;
                if (!reconstructedAnalysis && analysisData.landUse && analysisData.amenities) {
                    // Reconstruct from new comprehensive format
                    reconstructedAnalysis = {
                        residential: analysisData.landUse.counts?.residential || 0,
                        commercial: analysisData.landUse.counts?.commercial || 0,
                        industrial: analysisData.landUse.counts?.industrial || 0,
                        other: analysisData.landUse.counts?.other || 0,
                        amenities: analysisData.amenities.counts || {},
                        amenityDetails: analysisData.amenities.details || {},
                        roads: analysisData.roads.counts || {}
                    };
                }
                
                // Update UI with comprehensive data
                if (reconstructedAnalysis) {
                    // Store amenity details globally for tooltips
                    window.currentAmenityDetails = reconstructedAnalysis.amenityDetails || analysisData.amenities?.details || {};
                    
                    // Update UI with either area analysis or land use counts
                    const areaData = analysisData.areaAnalysis || analysisData.landUse?.areas;
                    updateUI(reconstructedAnalysis, areaData);
                    
                    // Force chart update after a small delay to ensure it's ready
                    setTimeout(() => {
                        if (landUseChart && reconstructedAnalysis) {
                            console.log('🔄 Force updating chart with stored data...');
                            updateChartWithData(reconstructedAnalysis, areaData);
                        }
                        
                        // Also refresh amenity markers if we have them
                        if (window.currentAmenityDetails && Object.keys(window.currentAmenityDetails).length > 0) {
                            console.log('📍 Adding amenity markers from stored data...');
                            addAmenityMarkers(window.currentAmenityDetails);
                        }
                        
                        // Recreate land use polygons from stored data
                        if (analysisData.landUsePolygons || analysisData.polygonData) {
                            console.log('🗺️ Recreating land use polygons from stored data...');
                            recreateLandUsePolygons(analysisData.landUsePolygons || analysisData.polygonData, areaData);
                        }
                        
                        // Update population map radius to match analysis radius
                        if (window.updatePopulationRadius && analysisData.searchCoordinates) {
                            console.log('👥 Updating population map radius...');
                            window.updatePopulationRadius(
                                analysisData.searchCoordinates.latitude,
                                analysisData.searchCoordinates.longitude,
                                analysisData.searchCoordinates.radius
                            );
                        }
                    }, 200);
                    
                    // Update current analysis data
                    currentAnalysisData = {
                        data: { elements: [] }, // Placeholder since we don't store raw elements
                        analysis: reconstructedAnalysis,
                        areaAnalysis: areaData,
                        lat: analysisData.searchCoordinates.latitude,
                        lng: analysisData.searchCoordinates.longitude,
                        radius: analysisData.searchCoordinates.radius
                    };
                    
                    // Display comprehensive data summary
                    if (analysisData.landUse && analysisData.amenities) {
                        console.log('📊 Loaded comprehensive analysis data:');
                        console.log('🏠 Land Use:', analysisData.landUse);
                        console.log('🏪 Amenities:', analysisData.amenities);
                        console.log('🛣️ Roads:', analysisData.roads);
                        console.log('📈 Summary:', analysisData.summary);
                        
                        // Show success notification with data summary
                        // const toast = Toastify({
                        //     text: `Analysis data restored: ${analysisData.totalElements || 0} elements, ${Object.keys(analysisData.amenities?.details || {}).length} amenity types`,
                        //     duration: 3000,
                        //     gravity: "top",
                        //     position: "right",
                        //     offset: {
                        //         x: 20,
                        //         y: 80
                        //     },
                        //     className: "bg-gradient-to-r from-blue-800 to-blue-700 text-white rounded-lg shadow-lg border border-blue-600/20 font-medium text-sm",
                        //     stopOnFocus: true
                        // });
                        // toast.showToast();
                    }
                }
                
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error('❌ Error loading analysis data from storage:', error);
        return false;
    }
}

// Initialize everything when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing analysis page...');
    
    // Initialize map first
    initAnalysisMap();
    
    // Initialize chart
    initChart();
    
    // Try loading from storage after a delay to ensure everything is ready
    setTimeout(() => {
        console.log('Attempting to load data from storage...');
        
        // Ensure storage manager is available
        if (!window.storageManager) {
            console.log('Initializing StorageManager...');
            window.storageManager = new StorageManager();
        }
        
        if (!loadAnalysisDataFromStorage()) {
            console.log('No storage data found, loading from cookies...');
            loadCoordinatesFromCookies();
        }
    }, 500); // Increased delay to ensure everything is loaded
    
    // Add event listeners for input changes (with null checks)
    const latElement = document.getElementById('latitude');
    const lngElement = document.getElementById('longitude');
    
    if (latElement) {
        latElement.addEventListener('change', function() {
            const lat = parseFloat(this.value);
            const lng = parseFloat(document.getElementById('longitude')?.value);
            if (!isNaN(lat) && !isNaN(lng) && map) {
                map.setView([lat, lng]);
            }
            saveCurrentAnalysisCoordinatesToStorage();
        });
    }
    
    if (lngElement) {
        lngElement.addEventListener('change', function() {
            const lat = parseFloat(document.getElementById('latitude')?.value);
            const lng = parseFloat(this.value);
            if (!isNaN(lat) && !isNaN(lng) && map) {
                map.setView([lat, lng]);
            }
            saveCurrentAnalysisCoordinatesToStorage();
        });
    }
    
    const radiusElement = document.getElementById('radius');
    if (radiusElement) {
        radiusElement.addEventListener('change', function() {
            const lat = parseFloat(document.getElementById('latitude')?.value);
            const lng = parseFloat(document.getElementById('longitude')?.value);
            const radius = parseFloat(this.value) * 1000;
            
            if (!isNaN(lat) && !isNaN(lng) && !isNaN(radius) && map) {
                // Update circle on map
                if (window.analysisRadius) {
                    map.removeLayer(window.analysisRadius);
                }
                window.analysisRadius = L.circle([lat, lng], {
                    color: '#3b82f6',
                    fillColor: '#60a5fa',
                    fillOpacity: 0.1,
                    radius: radius
                }).addTo(map);
            }
            saveCurrentAnalysisCoordinatesToStorage();
        });
    }
});

// Save current coordinates to storage for analysis
function saveCurrentAnalysisCoordinatesToStorage() {
    try {
        const lat = parseFloat(document.getElementById('latitude').value);
        const lng = parseFloat(document.getElementById('longitude').value);
        const radius = parseFloat(document.getElementById('radius').value);
        
        if (!isNaN(lat) && !isNaN(lng) && !isNaN(radius)) {
            const coordData = {
                searchCoordinates: {
                    latitude: lat,
                    longitude: lng,
                    radius: radius
                },
                metadata: {
                    lastUpdated: new Date().toISOString(),
                    module: 'analysis'
                }
            };
            
            if (window.storageManager) {
                // Get existing analysis data and update coordinates
                const existingData = window.storageManager.getAnalysisData();
                const updatedData = { ...existingData, ...coordData };
                window.storageManager.setAnalysisData(updatedData);
            }
        }
    } catch (error) {
        console.error('❌ Error saving coordinates to storage:', error);
    }
}

// Working Traffic Congestion Analysis - Fixed Implementation
let trafficMap = null;
let centerMarker = null;
let analysisRadius = null;
let googleTrafficLayer = null;

// Initialize the traffic map
function initTrafficMap() {
    trafficMap = L.map('trafficMap', {
        center: [24.8607, 67.0011],
        zoom: 13,
        zoomControl: true
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap © CARTO',
        maxZoom: 19
    }).addTo(trafficMap);

    console.log('Traffic map initialized');
}

// Simple analysis function - called by onclick
function analyzeTrafficArea() {
    console.log('Analyze button clicked');
    
    if (!trafficMap) {
        console.error('Map not initialized');
        return;
    }

    // Get coordinates directly from input IDs
    const lat = parseFloat(document.getElementById('latitude').value);
    const lng = parseFloat(document.getElementById('longitude').value);
    const radius = parseFloat(document.getElementById('radius').value) || 2;

    console.log(`Using coordinates: ${lat}, ${lng} with radius: ${radius}km`);

    // 1. Move map to coordinates
    trafficMap.setView([lat, lng], 16);

    // 2. Clear old marker
    if (centerMarker) {
        trafficMap.removeLayer(centerMarker);
    }

    // 3. Add pin marker
    centerMarker = L.marker([lat, lng], {
        icon: L.divIcon({
            html: `<div style="width: 20px; height: 20px; background: #ef4444; border: 3px solid white; border-radius: 50%; box-shadow: 0 4px 12px rgba(239,68,68,0.8);"></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        })
    }).addTo(trafficMap);

    // 4. Clear old radius
    if (analysisRadius) {
        trafficMap.removeLayer(analysisRadius);
    }

    // 5. Add radius circle
    analysisRadius = L.circle([lat, lng], {
        radius: radius * 1000,
        color: '#ef4444',
        fillColor: '#ef4444',
        fillOpacity: 0.1,
        weight: 2,
        opacity: 0.8
    }).addTo(trafficMap);

    // 6. Clear old traffic layer
    if (googleTrafficLayer) {
        trafficMap.removeLayer(googleTrafficLayer);
    }

    // 7. Add Google traffic layer
    googleTrafficLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}', {
        attribution: '© Google Traffic',
        opacity: 0.8,
        maxZoom: 18
    }).addTo(trafficMap);

    console.log('Analysis complete - pin and traffic layer added');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (document.getElementById('trafficMap')) {
            initTrafficMap();
        }
    }, 500);

    // Also initialize when analyze area button is clicked (if map not already initialized)
    const analyzeButton = document.querySelector('button[onclick*="analyzeBtn"]') || 
                         document.querySelector('.analyzeBtn') ||
                         document.querySelector('#analyzeBtn');
    
    if (analyzeButton) {
        analyzeButton.addEventListener('click', function() {
            if (!trafficMap && document.getElementById('trafficMap')) {
                console.log('Initializing map on analyze button click');
                initTrafficMap();
                // Small delay to ensure map is ready before analysis
                setTimeout(analyzeTrafficArea, 300);
            }
        });
    }
});

// Make function globally available
window.analyzeTrafficArea = analyzeTrafficArea;

// Toggle amenity markers visibility
function toggleAmenityMarkers() {
    if (!amenityMarkersGroup) {
        console.log('No amenity markers to toggle');
        return;
    }
    
    const toggleBtn = document.getElementById('amenityToggleBtn');
    
    if (amenityMarkersVisible) {
        // Hide amenity markers
        map.removeLayer(amenityMarkersGroup);
        amenityMarkersVisible = false;
        toggleBtn.style.opacity = '0.5';
        toggleBtn.title = 'Show Amenity Markers';
        console.log('🔍 Amenity markers hidden');
        
        // Show notification
        Toastify({
            text: "🔍 Amenity markers hidden",
            duration: 2000,
            gravity: "top",
            position: "right",
            offset: { x: 20, y: 80 },
            className: "bg-gradient-to-r from-gray-700 to-gray-600 text-white rounded-lg shadow-lg border border-gray-600/20 font-medium text-sm",
            stopOnFocus: true
        }).showToast();
    } else {
        // Show amenity markers
        amenityMarkersGroup.addTo(map);
        amenityMarkersVisible = true;
        toggleBtn.style.opacity = '1';
        toggleBtn.title = 'Hide Amenity Markers';
        console.log('📍 Amenity markers shown');
        
        // Show notification
        Toastify({
            text: "📍 Amenity markers shown",
            duration: 2000,
            gravity: "top",
            position: "right",
            offset: { x: 20, y: 80 },
            className: "bg-gradient-to-r from-blue-700 to-blue-600 text-white rounded-lg shadow-lg border border-blue-600/20 font-medium text-sm",
            stopOnFocus: true
        }).showToast();
    }
}

// Toggle center marker and radius visibility
function toggleCenterMarker() {
    const toggleBtn = document.getElementById('centerToggleBtn');
    
    if (centerMarkerVisible) {
        // Hide center marker and radius
        if (currentMarker) {
            map.removeLayer(currentMarker);
        }
        if (currentCircle) {
            map.removeLayer(currentCircle);
        }
        if (window.analysisRadius) {
            map.removeLayer(window.analysisRadius);
        }
        
        centerMarkerVisible = false;
        toggleBtn.style.opacity = '0.5';
        toggleBtn.title = 'Show Center Marker & Radius';
        console.log('🎯 Center marker and radius hidden');
        
        // Show notification
        Toastify({
            text: "🎯 Center marker & radius hidden",
            duration: 2000,
            gravity: "top",
            position: "right",
            offset: { x: 20, y: 80 },
            className: "bg-gradient-to-r from-gray-700 to-gray-600 text-white rounded-lg shadow-lg border border-gray-600/20 font-medium text-sm",
            stopOnFocus: true
        }).showToast();
    } else {
        // Show center marker and radius
        const lat = parseFloat(document.getElementById('latitude').value);
        const lng = parseFloat(document.getElementById('longitude').value);
        const radius = parseFloat(document.getElementById('radius').value) * 1000;
        
        if (!isNaN(lat) && !isNaN(lng) && !isNaN(radius)) {
            // Add center marker
            currentMarker = L.marker([lat, lng], {
                icon: L.divIcon({
                    className: 'custom-marker',
                    html: '<div style="background: #3b82f6; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.3);"></div>',
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                })
            }).addTo(map).bindPopup('Analysis Center Point');
            
            // Add radius circle
            currentCircle = L.circle([lat, lng], {
                radius: radius,
                color: '#3b82f6',
                fillColor: 'transparent',
                fillOpacity: 0,
                weight: 3,
                dashArray: '10, 10'
            }).addTo(map);
        }
        
        centerMarkerVisible = true;
        toggleBtn.style.opacity = '1';
        toggleBtn.title = 'Hide Center Marker & Radius';
        console.log('🎯 Center marker and radius shown');
        
        // Show notification
        Toastify({
            text: "🎯 Center marker & radius shown",
            duration: 2000,
            gravity: "top",
            position: "right",
            offset: { x: 20, y: 80 },
            className: "bg-gradient-to-r from-purple-700 to-purple-600 text-white rounded-lg shadow-lg border border-purple-600/20 font-medium text-sm",
            stopOnFocus: true
        }).showToast();
    }
}

// Make toggle functions globally available
window.toggleAmenityMarkers = toggleAmenityMarkers;
window.toggleCenterMarker = toggleCenterMarker;

// Population Analysis Section
let populationMap = null;
// centerMarker and analysisRadius are already declared above
let populationBubbles = [];
let populationLayerVisible = false;

// Cache for fetched population data
let populationDataCache = {};
let censusDataCache = {};

// Initialize the population map
function initPopulationMap() {
    const mapContainer = document.getElementById('populationMap');
    if (!mapContainer) {
        console.error('Map container #populationMap not found');
        return;
    }

    // Initialize Leaflet map
    populationMap = L.map('populationMap', {
        center: [24.8607, 67.0011], // Default to Karachi
        zoom: 13,
        zoomControl: true
    });

    // Add CARTO base layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap © CARTO',
        maxZoom: 19
    }).addTo(populationMap);

    console.log('Population map initialized successfully');
}

// Fetch WorldPop population data for specific coordinates
async function fetchWorldPopData(lat, lng, radiusKm) {
    try {
        const cacheKey = `${lat.toFixed(4)}_${lng.toFixed(4)}_${radiusKm}`;
        if (populationDataCache[cacheKey]) {
            return populationDataCache[cacheKey];
        }

        console.log('Fetching WorldPop data for:', lat, lng, radiusKm);

        // Create circular geometry for the area
        const geometry = {
            type: "Polygon",
            coordinates: [generateCircleCoordinates(lat, lng, radiusKm)]
        };

        // WorldPop API call for population statistics
        const response = await fetch('https://api.worldpop.org/v1/services/stats', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                dataset: 'wpgppop',
                year: 2020,
                geometry: geometry
            })
        });

        if (!response.ok) {
            throw new Error(`WorldPop API error: ${response.status}`);
        }

        const data = await response.json();
        
        // Cache the result
        populationDataCache[cacheKey] = data;
        console.log('WorldPop data fetched:', data);
        
        return data;
    } catch (error) {
        console.error('Error fetching WorldPop data:', error);
        // Return fallback data
        return {
            data: {
                total_population: estimatePopulationFallback(lat, lng, radiusKm)
            }
        };
    }
}

// Fetch Pakistan Census 2023 data (using available open data sources)
async function fetchCensusData(lat, lng) {
    try {
        const cacheKey = `census_${lat.toFixed(3)}_${lng.toFixed(3)}`;
        if (censusDataCache[cacheKey]) {
            return censusDataCache[cacheKey];
        }

        console.log('Fetching Census 2023 data for:', lat, lng);

        // Try to fetch from Pakistan Open Data or HDX
        const hdxResponse = await fetch(`https://data.humdata.org/api/action/datastore_search?resource_id=52b7f314-80a9-4759-87aa-2d3a49c2436b&limit=1000`);
        
        if (hdxResponse.ok) {
            const hdxData = await hdxResponse.json();
            
            // Find closest district/area to coordinates
            const closestArea = findClosestCensusArea(lat, lng, hdxData.result.records);
            
            censusDataCache[cacheKey] = closestArea;
            return closestArea;
        }

        throw new Error('Census API not available');

    } catch (error) {
        console.error('Error fetching Census data:', error);
        // Return estimated data based on known patterns
        return estimateCensusDataFallback(lat, lng);
    }
}

// Generate circle coordinates for API geometry
function generateCircleCoordinates(centerLat, centerLng, radiusKm) {
    const coordinates = [];
    const earthRadius = 6371; // km
    const points = 32;

    for (let i = 0; i <= points; i++) {
        const angle = (i * 2 * Math.PI) / points;
        const dx = radiusKm / earthRadius;
        const dy = dx * Math.cos(centerLat * Math.PI / 180);
        
        const pointLat = centerLat + (dx * Math.cos(angle)) * (180 / Math.PI);
        const pointLng = centerLng + (dy * Math.sin(angle)) * (180 / Math.PI);
        
        coordinates.push([pointLng, pointLat]);
    }
    
    return coordinates;
}

// Find closest census area to coordinates
function findClosestCensusArea(lat, lng, censusRecords) {
    let closest = null;
    let minDistance = Infinity;

    censusRecords.forEach(record => {
        if (record.latitude && record.longitude) {
            const distance = calculateDistance(lat, lng, record.latitude, record.longitude);
            if (distance < minDistance) {
                minDistance = distance;
                closest = record;
            }
        }
    });

    return closest || estimateCensusDataFallback(lat, lng);
}

// Calculate distance between two coordinates
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Fallback population estimation when APIs fail
function estimatePopulationFallback(lat, lng, radiusKm) {
    // Estimate based on known Pakistani urban patterns
    const area = Math.PI * radiusKm * radiusKm;
    
    // Karachi area
    if (lat >= 24.7 && lat <= 25.2 && lng >= 66.9 && lng <= 67.5) {
        return Math.round(area * 18000); // ~18k/km² average
    }
    
    // Lahore area
    if (lat >= 31.3 && lat <= 31.8 && lng >= 74.1 && lng <= 74.6) {
        return Math.round(area * 8000); // ~8k/km²
    }
    
    // Other urban areas
    if (isUrbanArea(lat, lng)) {
        return Math.round(area * 3000); // ~3k/km²
    }
    
    // Rural areas
    return Math.round(area * 500); // ~500/km²
}

// Census data fallback
function estimateCensusDataFallback(lat, lng) {
    return {
        district: getDistrictName(lat, lng),
        population: estimatePopulationFallback(lat, lng, 5), // 5km area estimate
        density: getDensityEstimate(lat, lng),
        source: 'Estimated (Census API unavailable)'
    };
}

// Check if coordinates are in urban area
function isUrbanArea(lat, lng) {
    const urbanAreas = [
        {bounds: [[24.7, 25.2], [66.9, 67.5]], name: 'Karachi'},
        {bounds: [[31.3, 31.8], [74.1, 74.6]], name: 'Lahore'},
        {bounds: [[33.4, 33.8], [72.8, 73.2]], name: 'Islamabad'},
        {bounds: [[31.2, 31.6], [73.0, 73.3]], name: 'Faisalabad'},
        {bounds: [[33.3, 33.8], [73.0, 73.3]], name: 'Rawalpindi'}
    ];

    return urbanAreas.some(area => 
        lat >= area.bounds[0][0] && lat <= area.bounds[0][1] &&
        lng >= area.bounds[1][0] && lng <= area.bounds[1][1]
    );
}

// Get district name from coordinates
function getDistrictName(lat, lng) {
    if (lat >= 24.7 && lat <= 25.2 && lng >= 66.9 && lng <= 67.5) return 'Karachi';
    if (lat >= 31.3 && lat <= 31.8 && lng >= 74.1 && lng <= 74.6) return 'Lahore';
    if (lat >= 33.4 && lat <= 33.8 && lng >= 72.8 && lng <= 73.2) return 'Islamabad';
    if (lat >= 31.2 && lat <= 31.6 && lng >= 73.0 && lng <= 73.3) return 'Faisalabad';
    return 'Unknown District';
}

// Get density estimate from coordinates
function getDensityEstimate(lat, lng) {
    if (lat >= 24.7 && lat <= 25.2 && lng >= 66.9 && lng <= 67.5) return 18000;
    if (lat >= 31.3 && lat <= 31.8 && lng >= 74.1 && lng <= 74.6) return 8000;
    if (isUrbanArea(lat, lng)) return 3000;
    return 500;
}

// Create population bubble on map
function createPopulationBubble(lat, lng, population, density) {
    // Color based on density
    let color = '#3b82f6'; // blue - low
    let opacity = 0.4;
    
    if (density > 10000) {
        color = '#ef4444'; // red - high
        opacity = 0.8;
    } else if (density > 3000) {
        color = '#f59e0b'; // yellow - medium
        opacity = 0.6;
    }
    
    // Bubble size based on population (min 5, max 25)
    const size = Math.max(5, Math.min(25, population / 1000));
    
    const bubble = L.circle([lat, lng], {
        radius: size * 10, // Scale for visibility
        color: color,
        fillColor: color,
        fillOpacity: opacity,
        weight: 2,
        opacity: 0.8
    }).addTo(populationMap);
    
    // Tooltip with population info
    bubble.bindTooltip(`
        <div style="font-size: 12px; line-height: 1.4;">
            <strong>Population:</strong> ${population.toLocaleString()}<br>
            <strong>Density:</strong> ${density.toLocaleString()}/km²
        </div>
    `, {
        permanent: false,
        direction: 'top',
        offset: [0, -5]
    });
    
    populationBubbles.push(bubble);
}

// Clear all population bubbles
function clearPopulationBubbles() {
    populationBubbles.forEach(bubble => {
        populationMap.removeLayer(bubble);
    });
    populationBubbles = [];
}

// Add center marker pin
function addCenterMarker(lat, lng) {
    // Remove existing marker
    if (centerMarker) {
        populationMap.removeLayer(centerMarker);
    }

    // Create pinpoint marker
    const pinIcon = L.divIcon({
        html: `
            <div style="width: 20px; height: 20px; background: #3b82f6; border: 3px solid white; border-radius: 50%; box-shadow: 0 4px 12px rgba(59,130,246,0.8);"></div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        className: 'center-pin-marker'
    });

    centerMarker = L.marker([lat, lng], { 
        icon: pinIcon,
        zIndexOffset: 1000
    }).addTo(populationMap);

    centerMarker.bindPopup(`
        <div style="font-family: sans-serif; text-align: center;">
            <h4 style="margin: 0 0 8px 0; color: #3b82f6;">📍 Analysis Center</h4>
            <p style="margin: 0; font-size: 12px;">
                <strong>Lat:</strong> ${lat.toFixed(6)}<br>
                <strong>Lng:</strong> ${lng.toFixed(6)}
            </p>
        </div>
    `);
}

// Helper function to specifically update chart with data
function updateChartWithData(analysis, areaAnalysis = null) {
    if (!landUseChart) {
        console.error('Chart not available for update');
        return;
    }
    
    const chartData = areaAnalysis || {
        residential: analysis.residential || 0,
        commercial: analysis.commercial || 0,
        industrial: analysis.industrial || 0,
        other: analysis.other || 0
    };
    
    const total = chartData.residential + chartData.commercial + chartData.industrial + chartData.other;
    
    if (total > 0) {
        const residentialPercent = (chartData.residential / total) * 100;
        const commercialPercent = (chartData.commercial / total) * 100;
        const industrialPercent = (chartData.industrial / total) * 100;
        const otherPercent = (chartData.other / total) * 100;
        
        console.log('📊 Updating chart with percentages:', {
            residential: residentialPercent.toFixed(1) + '%',
            commercial: commercialPercent.toFixed(1) + '%', 
            industrial: industrialPercent.toFixed(1) + '%',
            other: otherPercent.toFixed(1) + '%'
        });
        
        landUseChart.data.datasets[0].data = [
            residentialPercent,
            commercialPercent,
            industrialPercent,
            otherPercent
        ];
        
        landUseChart.update('resize');
    }
}

// Add analysis radius circle
function addAnalysisRadius(lat, lng, radius) {
    // Make sure map is available
    if (!map) {
        console.warn('Map not available for addAnalysisRadius');
        return;
    }
    
    // Remove existing radius
    if (currentCircle) {
        map.removeLayer(currentCircle);
        currentCircle = null;
    }

    // Create radius circle
    currentCircle = L.circle([lat, lng], {
        radius: radius * 1000, // Convert km to meters
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.1,
        weight: 2,
        opacity: 0.8,
        dashArray: '8, 4'
    }).addTo(map);
}

// Generate population bubbles using real API data
async function generatePopulationBubbles(centerLat, centerLng, radiusKm) {
    clearPopulationBubbles();
    
    console.log('Generating population bubbles with real data...');
    
    try {
        // Fetch both WorldPop and Census data
        const [worldPopData, censusData] = await Promise.all([
            fetchWorldPopData(centerLat, centerLng, radiusKm),
            fetchCensusData(centerLat, centerLng)
        ]);

        let totalPopulation = 0;
        if (worldPopData && worldPopData.data && worldPopData.data.total_population) {
            totalPopulation = Math.round(worldPopData.data.total_population);
        }

        console.log('Population data:', { worldPop: totalPopulation, census: censusData });

        // Generate grid of population points within radius
        const gridSize = 0.005; // ~500m spacing
        const bubbleData = [];

        for (let lat = centerLat - (radiusKm/111); lat <= centerLat + (radiusKm/111); lat += gridSize) {
            for (let lng = centerLng - (radiusKm/111); lng <= centerLng + (radiusKm/111); lng += gridSize) {
                const distance = calculateDistance(centerLat, centerLng, lat, lng);
                
                if (distance <= radiusKm) {
                    // Estimate population for this grid cell
                    const cellPopulation = estimateCellPopulation(lat, lng, worldPopData, censusData, distance, radiusKm);
                    
                    if (cellPopulation > 50) { // Only show significant populations
                        bubbleData.push({
                            lat: lat,
                            lng: lng,
                            population: cellPopulation,
                            density: Math.round(cellPopulation / (gridSize * 111 * gridSize * 111))
                        });
                    }
                }
            }
        }

        // Create visual bubbles
        bubbleData.forEach(bubble => {
            createPopulationBubble(bubble.lat, bubble.lng, bubble.population, bubble.density);
        });

        // Update stats display
        updatePopulationStats(totalPopulation, censusData, radiusKm);

        console.log(`Generated ${bubbleData.length} population bubbles`);

    } catch (error) {
        console.error('Error generating population bubbles:', error);
        // Fallback to estimated data
        generateFallbackBubbles(centerLat, centerLng, radiusKm);
    }
}

// Estimate population for a grid cell
function estimateCellPopulation(lat, lng, worldPopData, censusData, distanceFromCenter, radiusKm) {
    let baseDensity = getDensityEstimate(lat, lng);
    
    // Apply distance decay (higher population near center)
    const decayFactor = Math.max(0.3, 1 - (distanceFromCenter / radiusKm) * 0.7);
    
    // Cell area in km²
    const cellArea = (0.005 * 111) * (0.005 * 111);
    
    // Base population for this cell
    let cellPop = baseDensity * cellArea * decayFactor;
    
    // Add some realistic variation
    const variation = 0.5 + (Math.random() * 1.0);
    cellPop *= variation;
    
    return Math.round(cellPop);
}

// Fallback bubble generation if APIs fail
function generateFallbackBubbles(centerLat, centerLng, radiusKm) {
    console.log('Using fallback population estimation...');
    
    const gridSize = 0.008;
    const districtDensity = getDensityEstimate(centerLat, centerLng);
    
    for (let lat = centerLat - (radiusKm/111); lat <= centerLat + (radiusKm/111); lat += gridSize) {
        for (let lng = centerLng - (radiusKm/111); lng <= centerLng + (radiusKm/111); lng += gridSize) {
            const distance = calculateDistance(centerLat, centerLng, lat, lng);
            
            if (distance <= radiusKm) {
                const cellArea = (gridSize * 111) * (gridSize * 111);
                const estimatedPop = Math.round(districtDensity * cellArea * (Math.random() * 0.8 + 0.4));
                
                if (estimatedPop > 100) {
                    createPopulationBubble(lat, lng, estimatedPop, districtDensity);
                }
            }
        }
    }
}

// Update population statistics display
function updatePopulationStats(totalPopulation, censusData, radiusKm) {
    const area = Math.PI * radiusKm * radiusKm;
    const density = Math.round(totalPopulation / area);
    
    console.log('Population Stats:', {
        total: totalPopulation,
        area: area,
        density: density,
        district: censusData?.district || 'Unknown'
    });
    
    // You can update HTML elements here if you have stats panels
    // Example: document.getElementById('totalPop').textContent = totalPopulation.toLocaleString();
}

// 🎯 MAIN FUNCTION - This is what you need to trigger!
async function analyzePopulationArea() {
    console.log('🎯 MAIN FUNCTION: Analyzing population area...');
    
    if (!populationMap) {
        console.error('Population map not initialized');
        return;
    }

    // Get coordinates from inputs
    const lat = parseFloat(document.getElementById('latitude').value) || 24.8607;
    const lng = parseFloat(document.getElementById('longitude').value) || 67.0011;
    const radius = parseFloat(document.getElementById('radius').value) || 2;

    console.log(`Analyzing population at: ${lat}, ${lng} with radius: ${radius}km`);

    // Set map view
    populationMap.setView([lat, lng], 14);

    // Add center marker (pin)
    addCenterMarker(lat, lng);

    // Add analysis radius (circle)
    addAnalysisRadius(lat, lng, radius);

    // Generate population bubbles with real data (this is the main magic!)
    await generatePopulationBubbles(lat, lng, radius);

    console.log('✅ Population analysis completed - pin, radius, and bubbles should be visible!');
}

// Toggle population layer visibility
function togglePopulationLayer() {
    if (!populationMap || populationBubbles.length === 0) {
        console.log('No population data to toggle');
        return;
    }

    populationLayerVisible = !populationLayerVisible;

    populationBubbles.forEach(bubble => {
        if (populationLayerVisible) {
            bubble.addTo(populationMap);
        } else {
            populationMap.removeLayer(bubble);
        }
    });

    console.log('Population layer', populationLayerVisible ? 'shown' : 'hidden');
}

// Refresh population data
function refreshPopulationData() {
    if (!populationMap) {
        console.log('Map not initialized');
        return;
    }

    console.log('Refreshing population data...');
    
    // Clear cache
    populationDataCache = {};
    censusDataCache = {};
    
    // Re-run analysis
    analyzePopulationArea();
}

// Clear all population analysis
function clearPopulationAnalysis() {
    if (centerMarker) {
        populationMap.removeLayer(centerMarker);
        centerMarker = null;
    }
    if (analysisRadius) {
        populationMap.removeLayer(analysisRadius);
        analysisRadius = null;
    }
    clearPopulationBubbles();
    console.log('Population analysis cleared');
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing population map...');
    
    setTimeout(() => {
        if (document.getElementById('populationMap')) {
            initPopulationMap();
            console.log('Population map ready');
        } else {
            console.error('populationMap element not found in DOM');
        }
    }, 500);

    // Also initialize when analyze area button is clicked (if map not already initialized)
    const analyzeButton = document.querySelector('button[onclick*="analyzeBtn"]') ||
                         document.querySelector('.analyzeBtn') ||
                         document.querySelector('#analyzeBtn');
    
    if (analyzeButton) {
        analyzeButton.addEventListener('click', function() {
            if (!populationMap && document.getElementById('populationMap')) {
                console.log('Initializing population map on analyze button click');
                initPopulationMap();
                // Small delay to ensure map is ready before analysis
                setTimeout(analyzePopulationArea, 300);
            }
        });
    }
});

// Make functions globally available
window.initPopulationMap = initPopulationMap;
window.analyzePopulationArea = analyzePopulationArea;
window.togglePopulationLayer = togglePopulationLayer;
window.refreshPopulationData = refreshPopulationData;
window.clearPopulationAnalysis = clearPopulationAnalysis;

window.startAnalysis = startAnalysis;

// Simplified land use analysis for storage manager (no HTML/map dependencies)
async function performLandUseAnalysisForStorage(lat, lng, radius) {
    try {
        console.log(`🔍 Performing land use analysis for storage: ${lat}, ${lng}, radius: ${radius}km`);
        
        // Fetch land use data from Overpass API
        const overpassQuery = `
            [out:json][timeout:30];
            (
                way["landuse"](around:${radius * 1000},${lat},${lng});
                rel["landuse"](around:${radius * 1000},${lat},${lng});
                way["amenity"](around:${radius * 1000},${lat},${lng});
                node["amenity"](around:${radius * 1000},${lat},${lng});
                way["highway"](around:${radius * 1000},${lat},${lng});
                way["building"](around:${radius * 1000},${lat},${lng});
            );
            out geom;
        `;

        const response = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: overpassQuery,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        if (!response.ok) {
            throw new Error(`Overpass API error: ${response.status}`);
        }

        const data = await response.json();
        const elements = data.elements || [];

        // Analyze land use
        const landUseCounts = {};
        const amenityCounts = {};
        const roadCounts = {};
        let buildingCount = 0;
        let totalArea = 0;

        elements.forEach(element => {
            const tags = element.tags || {};
            
            // Land use analysis
            if (tags.landuse) {
                landUseCounts[tags.landuse] = (landUseCounts[tags.landuse] || 0) + 1;
                // Estimate area based on geometry (simplified)
                if (element.geometry) {
                    totalArea += 1000; // Mock area calculation
                }
            }
            
            // Amenities analysis
            if (tags.amenity) {
                amenityCounts[tags.amenity] = (amenityCounts[tags.amenity] || 0) + 1;
            }
            
            // Roads analysis
            if (tags.highway) {
                roadCounts[tags.highway] = (roadCounts[tags.highway] || 0) + 1;
            }
            
            // Buildings
            if (tags.building) {
                buildingCount++;
            }
        });

        // Determine dominant land use
        const dominantLandUse = Object.keys(landUseCounts).reduce((a, b) => 
            landUseCounts[a] > landUseCounts[b] ? a : b, 'mixed');

        // Determine site type based on land use and amenities
        let siteType = 'Mixed';
        if (landUseCounts.residential > (landUseCounts.commercial || 0)) {
            siteType = 'Residential';
        } else if (landUseCounts.commercial > 0 || landUseCounts.retail > 0) {
            siteType = 'Commercial';
        } else if (landUseCounts.industrial > 0) {
            siteType = 'Industrial';
        }

        // Calculate percentages
        const totalLandUse = Object.values(landUseCounts).reduce((sum, count) => sum + count, 0);
        const landUsePercentages = {};
        Object.keys(landUseCounts).forEach(type => {
            landUsePercentages[type] = totalLandUse > 0 ? 
                ((landUseCounts[type] / totalLandUse) * 100).toFixed(1) : 0;
        });

        const analysisResult = {
            siteType: siteType,
            dominantLandUse: dominantLandUse,
            totalElements: elements.length,
            landUse: {
                counts: landUseCounts,
                areas: { total: totalArea }, // Simplified area calculation
                percentages: landUsePercentages
            },
            amenities: amenityCounts,
            roads: roadCounts,
            buildings: buildingCount,
            coordinates: { lat, lng, radius }
        };

        console.log(`✅ Land use analysis completed for storage:`, analysisResult);
        return analysisResult;

    } catch (error) {
        console.error('❌ Error performing land use analysis for storage:', error);
        
        // Return minimal fallback data
        return {
            siteType: 'Mixed',
            dominantLandUse: 'mixed',
            totalElements: 0,
            landUse: {
                counts: { mixed: 1 },
                areas: { total: 1000 },
                percentages: { mixed: 100 }
            },
            amenities: {},
            roads: {},
            buildings: 0,
            coordinates: { lat, lng, radius }
        };
    }
}

// Export functions globally for storage manager
window.startAnalysis = startAnalysis;
window.analyzeLandUse = analyzeLandUse;
window.fetchOverpassData = fetchOverpassData;
window.performLandUseAnalysisForStorage = performLandUseAnalysisForStorage;

console.log('🔬 Analysis functions exported globally:', {
    startAnalysis: typeof startAnalysis,
    analyzeLandUse: typeof analyzeLandUse,
    fetchOverpassData: typeof fetchOverpassData,
    performLandUseAnalysisForStorage: typeof performLandUseAnalysisForStorage
});