// SSM.js - Site Selection Metrics Implementation
// PSO Site Classification System based on official parameters

// OSM Data Integration Functions with Rate Limiting
// ====================================

// Rate limiting variables
let lastAPICall = 0;
const API_DELAY = 1500; // 1.5 seconds between API calls
let requestQueue = [];
let isProcessingQueue = false;

// Queue-based rate-limited fetch for OSM data
async function fetchOSMData(lat, lng, radius, query) {
    return new Promise((resolve, reject) => {
        requestQueue.push({ lat, lng, radius, query, resolve, reject });
        processQueue();
    });
}

// Process the request queue with proper rate limiting
async function processQueue() {
    if (isProcessingQueue || requestQueue.length === 0) return;
    
    isProcessingQueue = true;
    
    while (requestQueue.length > 0) {
        const request = requestQueue.shift();
        
        try {
            // Ensure minimum delay between requests
            const now = Date.now();
            const timeSinceLastCall = now - lastAPICall;
            if (timeSinceLastCall < API_DELAY) {
                await new Promise(resolve => setTimeout(resolve, API_DELAY - timeSinceLastCall));
            }
            
            const result = await makeOSMRequest(request.lat, request.lng, request.radius, request.query);
            lastAPICall = Date.now();
            request.resolve(result);
            
        } catch (error) {
            console.warn(`OSM API request failed, using fallback data:`, error);
            request.resolve([]); // Return empty array for fallback
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    isProcessingQueue = false;
}

// Actual OSM API request implementation with retry logic
async function makeOSMRequest(lat, lng, radius, query, retries = 2) {
    const overpassUrl = 'https://overpass-api.de/api/interpreter';
    const bbox = calculateBoundingBox(lat, lng, radius);
    
    const overpassQuery = `
        [out:json][timeout:30];
        (
            ${query}
        );
        out geom;
    `;

    
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            console.log(`🔄 OSM API request attempt ${attempt + 1}/${retries + 1}`);
            
            const response = await fetch(overpassUrl, {
                method: 'POST',
                body: overpassQuery,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });
            
            if (response.status === 429) {
                // Rate limited - wait longer before retry
                const waitTime = Math.pow(2, attempt) * 2000; // Exponential backoff: 2s, 4s, 8s
                console.log(`⏳ Rate limited (429), waiting ${waitTime/1000}s before retry...`);
                if (attempt < retries) {
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    continue;
                } else {
                    throw new Error(`Rate limited after ${retries + 1} attempts`);
                }
            }
            
            if (!response.ok) {
                throw new Error(`OSM API request failed: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log(`✅ OSM API request successful, got ${data.elements?.length || 0} elements`);
            return data.elements || [];
            
        } catch (error) {
            console.warn(`❌ OSM API attempt ${attempt + 1} failed:`, error.message);
            
            if (attempt === retries) {
                // Last attempt failed, throw the error
                throw error;
            }
            
            // Wait before retry (shorter wait for non-rate-limit errors)
            const waitTime = (attempt + 1) * 1000; // 1s, 2s, 3s
            console.log(`⏳ Waiting ${waitTime/1000}s before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }
}

// Calculate bounding box from center point and radius
function calculateBoundingBox(lat, lng, radiusKm) {
    const latDegPerKm = 1 / 110.574;
    const lngDegPerKm = 1 / (110.572 * Math.cos(lat * Math.PI / 180));
    
    const latDelta = radiusKm * latDegPerKm;
    const lngDelta = radiusKm * lngDegPerKm;
    
    return {
        south: lat - latDelta,
        west: lng - lngDelta,
        north: lat + latDelta,
        east: lng + lngDelta
    };
}

// Fetch traffic-related OSM data
async function fetchOSMTrafficData(lat, lng, radius) {
    const bbox = calculateBoundingBox(lat, lng, radius);
    
    // Query for traffic infrastructure
    const trafficQuery = `
        way["highway"~"^(motorway|trunk|primary|secondary|tertiary)$"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        node["highway"="traffic_signals"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        node["highway"="stop"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        way["highway"="pedestrian"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        way["highway"="footway"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        way["amenity"="parking"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        node["public_transport"="station"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        node["railway"="station"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        node["amenity"="bus_station"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
    `;
    
    const elements = await fetchOSMData(lat, lng, radius, trafficQuery);
    
    // Categorize the results
    const roads = {
        major: elements.filter(el => el.tags?.highway && ['motorway', 'trunk', 'primary'].includes(el.tags.highway)),
        secondary: elements.filter(el => el.tags?.highway && ['secondary', 'tertiary'].includes(el.tags.highway)),
        all: elements.filter(el => el.tags?.highway)
    };
    
    const transport = {
        stations: elements.filter(el => 
            el.tags?.public_transport === 'station' || 
            el.tags?.railway === 'station' || 
            el.tags?.amenity === 'bus_station'
        )
    };
    
    const traffic = {
        signals: elements.filter(el => el.tags?.highway === 'traffic_signals'),
        stops: elements.filter(el => el.tags?.highway === 'stop')
    };
    
    const access = {
        parking: elements.filter(el => el.tags?.amenity === 'parking'),
        pedestrian: elements.filter(el => el.tags?.highway && ['pedestrian', 'footway'].includes(el.tags.highway))
    };
    
    // Determine primary road type
    let primaryRoadType = 'tertiary';
    if (roads.major.some(r => r.tags.highway === 'motorway')) primaryRoadType = 'motorway';
    else if (roads.major.some(r => r.tags.highway === 'trunk')) primaryRoadType = 'trunk';
    else if (roads.major.some(r => r.tags.highway === 'primary')) primaryRoadType = 'primary';
    else if (roads.secondary.some(r => r.tags.highway === 'secondary')) primaryRoadType = 'secondary';
    
    return {
        roads,
        transport,
        traffic,
        access,
        primaryRoadType
    };
}

// Fetch competition-related OSM data
async function fetchOSMCompetitionData(lat, lng, radius) {
    const bbox = calculateBoundingBox(lat, lng, radius);
    
    const competitionQuery = `
        node["amenity"="fuel"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        way["amenity"="fuel"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        node["amenity"="fast_food"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        node["shop"="convenience"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        node["amenity"="restaurant"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        node["shop"="car_repair"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        node["craft"="car_repair"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
    `;
    
    const elements = await fetchOSMData(lat, lng, radius, competitionQuery);
    
    return {
        fuelStations: elements.filter(el => el.tags?.amenity === 'fuel'),
        fastFood: elements.filter(el => el.tags?.amenity === 'fast_food'),
        convenience: elements.filter(el => el.tags?.shop === 'convenience'),
        restaurants: elements.filter(el => el.tags?.amenity === 'restaurant'),
        carServices: elements.filter(el => 
            el.tags?.shop === 'car_repair' || el.tags?.craft === 'car_repair'
        )
    };
}

// Fetch land-related OSM data
async function fetchOSMLandData(lat, lng, radius) {
    const bbox = calculateBoundingBox(lat, lng, radius);
    
    const landQuery = `
        way["landuse"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        way["leisure"="park"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        way["natural"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        way["building"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
    `;
    
    const elements = await fetchOSMData(lat, lng, radius, landQuery);
    
    return {
        landuse: elements.filter(el => el.tags?.landuse),
        parks: elements.filter(el => el.tags?.leisure === 'park'),
        natural: elements.filter(el => el.tags?.natural),
        buildings: elements.filter(el => el.tags?.building)
    };
}

// Fetch socio-economic related OSM data
async function fetchOSMSocioEconomicData(lat, lng, radius) {
    const bbox = calculateBoundingBox(lat, lng, radius);
    
    const socioQuery = `
        node["amenity"~"^(school|college|university)$"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        node["amenity"~"^(hospital|clinic|pharmacy)$"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        node["amenity"~"^(bank|atm)$"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        node["shop"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        way["building"="apartments"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
        way["landuse"="residential"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
    `;
    
    const elements = await fetchOSMData(lat, lng, radius, socioQuery);
    
    return {
        education: elements.filter(el => 
            el.tags?.amenity && ['school', 'college', 'university'].includes(el.tags.amenity)
        ),
        healthcare: elements.filter(el => 
            el.tags?.amenity && ['hospital', 'clinic', 'pharmacy'].includes(el.tags.amenity)
        ),
        finance: elements.filter(el => 
            el.tags?.amenity && ['bank', 'atm'].includes(el.tags.amenity)
        ),
        retail: elements.filter(el => el.tags?.shop),
        residential: elements.filter(el => 
            el.tags?.building === 'apartments' || el.tags?.landuse === 'residential'
        )
    };
}

// Analysis helper functions for OSM data
function analyzeRoadInfrastructure(roads) {
    const majorRoadCount = roads.major.length;
    const totalRoadCount = roads.all.length;
    
    // Score based on road density and quality
    let score = 0;
    
    // Major roads contribute more
    score += majorRoadCount * 25;
    
    // Secondary roads add moderate value
    score += roads.secondary.length * 15;
    
    // Overall road density
    score += Math.min(totalRoadCount * 2, 30);
    
    return Math.min(score, 100);
}

function analyzeTransportHubs(transport) {
    const stationCount = transport.stations.length;
    
    // Score based on proximity to public transport
    let score = 0;
    
    if (stationCount >= 3) score = 100;
    else if (stationCount >= 2) score = 80;
    else if (stationCount >= 1) score = 60;
    else score = 20;
    
    return score;
}

function analyzeTrafficInfrastructure(traffic) {
    const signalCount = traffic.signals.length;
    const stopCount = traffic.stops.length;
    
    // Score based on traffic control infrastructure
    let score = 40; // Base score
    
    // Traffic signals indicate busy intersections
    score += Math.min(signalCount * 15, 40);
    
    // Stop signs indicate controlled traffic
    score += Math.min(stopCount * 10, 20);
    
    return Math.min(score, 100);
}

function analyzeAccessibility(access) {
    const parkingCount = access.parking.length;
    const pedestrianCount = access.pedestrian.length;
    
    // Score based on accessibility features
    let score = 30; // Base score
    
    // Parking availability
    score += Math.min(parkingCount * 20, 40);
    
    // Pedestrian infrastructure
    score += Math.min(pedestrianCount * 5, 30);
    
    return Math.min(score, 100);
}

// Global variables for SSM analysis
let ssmChart = null;
let currentSSMData = {};
let analysisInProgress = false;

// PSO Site Classification System - Official Scoring
const PSO_SCORING = {
    CITY: {
        TRAFFIC: 45,
        COMPETITION: 10,
        LAND: 10,
        SOCIO_ECONOMIC: 35,
        TOTAL: 100
    },
    HIGHWAY: {
        TRAFFIC: 60,
        COMPETITION: 10,
        LAND: 10,
        SOCIO_ECONOMIC: 20,
        TOTAL: 100
    }
};

// Category Thresholds (Official PSO Categories)
const CATEGORY_THRESHOLDS = {
    CF: { 
        min: 80, max: 100, 
        name: "CF (Company Finance)", 
        color: "category-cf", 
        description: "Premium",
        recommendation: "Highly Recommended"
    },
    DFA: { 
        min: 60, max: 79, 
        name: "DFA (Dealer Finance A)", 
        color: "category-dfa", 
        description: "Excellent",
        recommendation: "Recommended"
    },
    DFB: { 
        min: 49, max: 60, 
        name: "DFB (Dealer Finance B)", 
        color: "category-dfb", 
        description: "Good",
        recommendation: "Consider with Caution"
    },
    DFC: { 
        min: 0, max: 48, 
        name: "DFC (Dealer Finance C)", 
        color: "category-dfc", 
        description: "Poor",
        recommendation: "Not Recommended"
    }
};

// Initialize SSM functionality when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 SSM System Initialized');
    
    // Add event listeners
    setupEventListeners();
    
    // Auto-load coordinates from COOKIES on page load
    console.log('🍪 Auto-loading coordinates from cookies...');
    const cookieLat = getCookie('map_latitude');
    const cookieLng = getCookie('map_longitude');
    const cookieRadius = getCookie('map_radius');
    
    console.log('🍪 Found cookies:', {
        map_latitude: cookieLat,
        map_longitude: cookieLng,
        map_radius: cookieRadius
    });
    
    if (cookieLat && cookieLng) {
        console.log('✅ Auto-loading coordinates from cookies on page load');
        
        // Fill main SSM inputs
        const latEl = document.getElementById('ssm-latitude');
        const lngEl = document.getElementById('ssm-longitude');
        const radiusEl = document.getElementById('ssm-radius');
        
        if (latEl) latEl.value = cookieLat;
        if (lngEl) lngEl.value = cookieLng;
        if (radiusEl && cookieRadius) radiusEl.value = cookieRadius;
        
        // Fill auto-generate inputs if they exist
        const autoLatEl = document.getElementById('auto-latitude');
        const autoLngEl = document.getElementById('auto-longitude');
        const autoRadiusEl = document.getElementById('auto-radius');
        
        if (autoLatEl) autoLatEl.value = cookieLat;
        if (autoLngEl) autoLngEl.value = cookieLng;
        if (autoRadiusEl && cookieRadius) autoRadiusEl.value = cookieRadius;
        
    } else {
        console.log('⚠️ No coordinates found in cookies on page load');
    }
    
    // Try loading from storage as backup (after a small delay)
    setTimeout(() => {
        loadSSMDataFromStorage();
    }, 500);
});

// Setup event listeners
function setupEventListeners() {
    // Coordinate input validation and auto-save (only if elements exist)
    const latitudeEl = document.getElementById('ssm-latitude');
    const longitudeEl = document.getElementById('ssm-longitude');
    const radiusEl = document.getElementById('ssm-radius');
    
    if (latitudeEl) {
        latitudeEl.addEventListener('input', function() {
            validateCoordinates();
            saveCoordinatesToStorage();
        });
    }
    
    if (longitudeEl) {
        longitudeEl.addEventListener('input', function() {
            validateCoordinates();
            saveCoordinatesToStorage();
        });
    }
    
    if (radiusEl) {
        radiusEl.addEventListener('input', function() {
            saveCoordinatesToStorage();
        });
    }
    
    // Site type change handler (only if elements exist)
    const siteTypeRadios = document.querySelectorAll('input[name="siteType"]');
    if (siteTypeRadios.length > 0) {
        siteTypeRadios.forEach(radio => {
            radio.addEventListener('change', updateSiteTypeDisplay);
        });
    }
}

// Save coordinates to storage for persistence
function saveCoordinatesToStorage() {
    try {
        const latEl = document.getElementById('ssm-latitude');
        const lngEl = document.getElementById('ssm-longitude');
        const radiusEl = document.getElementById('ssm-radius');
        
        if (!latEl || !lngEl || !radiusEl) {
            console.warn('⚠️ SSM coordinate elements not found, skipping storage save');
            return;
        }
        
        const lat = parseFloat(latEl.value);
        const lng = parseFloat(lngEl.value);
        const radius = parseFloat(radiusEl.value);
        
        if (!isNaN(lat) && !isNaN(lng) && !isNaN(radius)) {
            const coordData = {
                searchCoordinates: {
                    latitude: lat,
                    longitude: lng,
                    radius: radius
                },
                metadata: {
                    lastUpdated: new Date().toISOString(),
                    module: 'ssm'
                }
            };
            
            if (window.storageManager) {
                // Get existing SSM data and update coordinates
                const existingData = window.storageManager.getSSMData();
                const updatedData = { ...existingData, ...coordData };
                window.storageManager.setSSMData(updatedData);
            }
        }
    } catch (error) {
        console.error('❌ Error saving coordinates to storage:', error);
    }
}


// Update site type display
function updateSiteTypeDisplay() {
    const siteType = document.querySelector('input[name="siteType"]:checked').value;
    const display = siteType === 'city' ? 'City' : 'Highway/Motorway';
    
    // Update any existing display
    const siteTypeDisplay = document.getElementById('siteTypeDisplay');
    if (siteTypeDisplay) {
        siteTypeDisplay.textContent = display;
    }
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

function loadCoordinatesFromCookies() {
    const savedLat = getCookie('map_latitude');
    const savedLng = getCookie('map_longitude');
    const savedRadius = getCookie('map_radius');
    
    console.log('🍪 Loading coordinates from cookies:', { 
        map_latitude: savedLat, 
        map_longitude: savedLng, 
        map_radius: savedRadius 
    });
    
    if (savedLat && savedLng) {
        // Auto-fill the main SSM input fields with null checks
        const latEl = document.getElementById('ssm-latitude');
        const lngEl = document.getElementById('ssm-longitude');
        const radiusEl = document.getElementById('ssm-radius');
        
        if (latEl) {
            latEl.value = savedLat;
            console.log('✅ Filled ssm-latitude:', savedLat);
        } else {
            console.warn('⚠️ ssm-latitude element not found');
        }
        
        if (lngEl) {
            lngEl.value = savedLng;
            console.log('✅ Filled ssm-longitude:', savedLng);
        } else {
            console.warn('⚠️ ssm-longitude element not found');
        }
        
        if (radiusEl && savedRadius) {
            radiusEl.value = savedRadius;
            console.log('✅ Filled ssm-radius:', savedRadius);
        } else if (savedRadius) {
            console.warn('⚠️ ssm-radius element not found');
        }
        
        // Auto-fill the auto-generate input fields if they exist
        const autoLatEl = document.getElementById('auto-latitude');
        const autoLngEl = document.getElementById('auto-longitude');
        const autoRadiusEl = document.getElementById('auto-radius');
        
        if (autoLatEl) {
            autoLatEl.value = savedLat;
            console.log('✅ Filled auto-latitude:', savedLat);
        }
        if (autoLngEl) {
            autoLngEl.value = savedLng;
            console.log('✅ Filled auto-longitude:', savedLng);
        }
        if (autoRadiusEl && savedRadius) {
            autoRadiusEl.value = savedRadius;
            console.log('✅ Filled auto-radius:', savedRadius);
        }
        
        console.log('✅ Coordinates loaded from cookies successfully');
        
        // Show success notification
        if (typeof Toastify !== 'undefined') {
            Toastify({
                text: "✅ Coordinates loaded from cookies",
                duration: 2000,
                gravity: "top",
                position: "right",
                offset: {
                    y: 80
                },
                className: "bg-gradient-to-r from-green-800 to-green-700 text-white rounded-lg shadow-lg border border-green-600/20 font-medium text-sm transition-all duration-300 ease-out transform",
                stopOnFocus: true
            }).showToast();
        } else {
            // Fallback if Toastify is not available
            console.log('📢 Coordinates loaded from previous search');
        }
    } else {
        console.log('⚠️ No coordinates found in cookies');
        if (typeof Toastify !== 'undefined') {
            Toastify({
                text: "⚠️ No saved coordinates found",
                duration: 2000,
                gravity: "top",
                position: "right",
                offset: {
                    y: 80
                },
                className: "bg-gradient-to-r from-yellow-800 to-yellow-700 text-white rounded-lg shadow-lg border border-yellow-600/20 font-medium text-sm",
                stopOnFocus: true
            }).showToast();
        }
    }
}

async function performSSMAnalysis() {
    if (analysisInProgress) {
        showTemporaryMessage('⏳ Analysis already in progress...', 'info');
        return;
    }
    
    // Get coordinates with null checks
    const latEl = document.getElementById('ssm-latitude');
    const lngEl = document.getElementById('ssm-longitude');
    const radiusEl = document.getElementById('ssm-radius');
    
    if (!latEl || !lngEl || !radiusEl) {
        showTemporaryMessage('❌ SSM coordinate input fields not found', 'error');
        console.error('❌ SSM coordinate elements not found');
        return;
    }
    
    const lat = parseFloat(latEl.value);
    const lng = parseFloat(lngEl.value);
    const radius = parseFloat(radiusEl.value);
    
    // Auto-detect site type based on coordinates
    const siteType = autoDetectSiteType(lat, lng);
    
    // Update the site type display (since we removed manual selection)
    showTemporaryMessage(`🔍 Auto-detected site type: ${siteType.toUpperCase()} | 📡 Using OpenStreetMap data`, 'info');
    
    // Validate inputs
    if (isNaN(lat) || isNaN(lng) || isNaN(radius)) {
        showTemporaryMessage('❌ Please enter valid coordinates and radius', 'error');
        return;
    }
    
    if (radius < 0.5 || radius > 5) {
        showTemporaryMessage('❌ Radius must be between 0.5 and 5 kilometers', 'error');
        return;
    }
    
    analysisInProgress = true;
    showLoadingState();
    
    try {
        console.log(`🔍 Starting SSM Analysis for ${siteType} site at ${lat}, ${lng}`);
        
        // Check if we have stored map data
        const storedMapData = checkStoredMapData(lat, lng, radius);
        if (storedMapData && storedMapData.stations && storedMapData.stations.length > 0) {
            console.log('📡 Using stored map data for enhanced competition analysis');
            showTemporaryMessage(`🔍 Auto-detected site type: ${siteType.toUpperCase()} | 🎯 Using stored map data (${storedMapData.stations.length} fuel stations)`, 'info');
        } else {
            console.log('📡 Using OpenStreetMap data for real geographic analysis');
            showTemporaryMessage(`🔍 Auto-detected site type: ${siteType.toUpperCase()} | 📡 Using OpenStreetMap data`, 'info');
        }
        
        // Store coordinates for other functions to use
        localStorage.setItem('currentSSMLat', lat);
        localStorage.setItem('currentSSMLng', lng);
        localStorage.setItem('currentSSMRadius', radius);
        localStorage.setItem('currentSSMSiteType', siteType);
        
        // Perform comprehensive analysis
        const analysisResults = await executeComprehensiveAnalysis(lat, lng, radius, siteType);
        
        // Calculate PSO scores based on analysis
        const psoScores = calculatePSOScores(analysisResults, siteType);
        
        // Determine site category
        const siteCategory = determineSiteCategory(psoScores.totalScore);
        
        // Store results globally
        currentSSMData = {
            coordinates: { lat, lng, radius },
            siteType,
            analysisResults,
            psoScores,
            siteCategory,
            timestamp: new Date()
        };
        
        // Display results
        displaySSMResults(currentSSMData);
        
        // Save SSM data to storage manager
        saveSSMDataToStorage(currentSSMData);
        
        console.log('✅ SSM Analysis completed successfully');
        
    } catch (error) {
        console.error('❌ SSM Analysis failed:', error);
        showTemporaryMessage('❌ Analysis failed. Please try again.', 'error');
        hideLoadingState();
    } finally {
        analysisInProgress = false;
    }
}

// Save essential SSM data to storage manager (UI-focused)
function saveSSMDataToStorage(ssmData) {
    try {
        // Extract only the key data shown in the UI
        const traffic = ssmData.analysisResults.traffic;
        const competition = ssmData.analysisResults.competition;
        const land = ssmData.analysisResults.land;
        const socioEconomic = ssmData.analysisResults.socioEconomic;

        const storageData = {
            // Basic search parameters
            searchCoordinates: {
                latitude: ssmData.coordinates.lat,
                longitude: ssmData.coordinates.lng,
                radius: ssmData.coordinates.radius
            },
            
            // Site Classification Result (as shown in UI)
            siteClassification: {
                category: ssmData.siteCategory.name, // e.g., "DFA (Dealer Finance A)"
                categoryCode: ssmData.siteCategory.name.match(/\((.*?)\)/)?.[1] || ssmData.siteCategory.name.split(' ')[0], // e.g., "DFA"
                totalScore: ssmData.psoScores.totalScore, // e.g., 68
                siteType: ssmData.siteType.charAt(0).toUpperCase() + ssmData.siteType.slice(1), // e.g., "City"
                recommendation: ssmData.siteCategory.recommendation, // e.g., "Recommended"  
                status: ssmData.siteCategory.recommendation, // e.g., "Recommended"
                categoryLevel: ssmData.siteCategory.description // e.g., "Excellent"
            },
            
            siteType: ssmData.siteType, // "City" or "Highway"
            siteCategory: ssmData.siteCategory.name, // e.g., "DFA (Dealer Finance A)"
            overallScore: ssmData.psoScores.totalScore, // e.g., 68
            recommendation: ssmData.siteCategory.recommendation, // e.g., "Recommended"
            categoryLevel: ssmData.siteCategory.description, // e.g., "Excellent"
            
            // Component Scores (as shown in parameter cards)
            traffic: {
                score: `${traffic.score}/${traffic.maxScore}`, // e.g., "27/45"
                roadClassification: traffic.roadType?.toUpperCase() || 'UNKNOWN', // e.g., "MOTORWAY"
                trafficDensity: traffic.trafficDensity ? (traffic.trafficDensity > 70 ? 'High' : traffic.trafficDensity > 40 ? 'Medium' : 'Low') : 'Medium'
            },
            
            competition: {
                score: `${competition.score}/${competition.maxScore}`, // e.g., "5/10"
                competitorCount: competition.details?.fuelStations || 0, // e.g., 8
                psoMarketShare: competition.marketSaturation || '0%' // e.g., "0%"
            },
            
            land: {
                score: `${land.score}/${land.maxScore}`, // e.g., "3/10"
                accessibility: land.accessibility || 'Unknown',
                landUseType: land.landUseType || 'Mixed',
                zoningSuitability: land.zoningSuitability || 'Unknown'
            },
            
            socioEconomic: {
                score: `${socioEconomic.score}/${socioEconomic.maxScore}`, // e.g., "33/35"
                populationDensity: socioEconomic.populationDensity || 'Medium',
                economicLevel: socioEconomic.economicLevel || 'Medium',
                nfrPotential: socioEconomic.nfrPotential || 'Medium'
            },
            
            // Coordinates for reference
            coordinates: {
                center: { 
                    lat: ssmData.coordinates.lat, 
                    lng: ssmData.coordinates.lng 
                },
                radius: ssmData.coordinates.radius
            },
            
            // Simple recommendations
            recommendations: extractRecommendations(ssmData),
            
            // Basic metadata
            metadata: {
                analysisTimestamp: ssmData.timestamp.toISOString(),
                dataSource: 'OpenStreetMap (OSM) + PSO SSM Model',
                module: 'ssm',
                version: '2.0',
                lastUpdated: new Date().toISOString()
            }
        };

        if (window.storageManager) {
            window.storageManager.setSSMData(storageData);
            console.log('✅ Essential SSM data saved to storage manager:', storageData);
        } else {
            console.warn('⚠️ StorageManager not available, SSM data not saved');
        }
    } catch (error) {
        console.error('❌ Error saving SSM data to storage:', error);
    }
}

// Extract recommendations from SSM data
function extractRecommendations(ssmData) {
    const recommendations = [];
    const scores = ssmData.psoScores;
    
    if (scores.traffic < 20) {
        recommendations.push('Improve traffic accessibility and road infrastructure');
    }
    if (scores.competition < 15) {
        recommendations.push('Consider market saturation and competitive positioning');
    }
    if (scores.land < 15) {
        recommendations.push('Evaluate land characteristics and development potential');
    }
    if (scores.socioEconomic < 20) {
        recommendations.push('Assess demographic and economic factors');
    }
    
    if (recommendations.length === 0) {
        recommendations.push('Site shows good potential for PSO fuel station development');
    }
    
    return recommendations;
}

// Load previous SSM data from storage
function loadSSMDataFromStorage() {
    try {
        // Only try to load if we're on a page that should have SSM elements
        const hasSSMElements = document.getElementById('ssm-latitude') || 
                              document.getElementById('ssm-longitude') || 
                              document.getElementById('ssm-radius');
        
        if (!hasSSMElements) {
            console.log('📍 Skipping SSM storage load - not on SSM page');
            return false;
        }
        
        if (window.storageManager) {
            const ssmData = window.storageManager.getSSMData();
            if (ssmData && ssmData.searchCoordinates) {
                console.log('📋 Loading previous SSM data from storage:', ssmData);
                
                // Restore search coordinates with null checks
                const latEl = document.getElementById('ssm-latitude');
                const lngEl = document.getElementById('ssm-longitude');
                const radiusEl = document.getElementById('ssm-radius');
                
                if (latEl) {
                    latEl.value = ssmData.searchCoordinates.latitude;
                    console.log('✅ Restored ssm-latitude from storage');
                }
                
                if (lngEl) {
                    lngEl.value = ssmData.searchCoordinates.longitude;
                    console.log('✅ Restored ssm-longitude from storage');
                }
                
                if (radiusEl) {
                    radiusEl.value = ssmData.searchCoordinates.radius;
                    console.log('✅ Restored ssm-radius from storage');
                }
                
                // Update map view if map exists
                if (window.map) {
                    map.setView([ssmData.searchCoordinates.latitude, ssmData.searchCoordinates.longitude], 13);
                }
                
                // Reconstruct current SSM data for display with proper structure
                if (ssmData.traffic && ssmData.competition && ssmData.land && ssmData.socioEconomic) {
                    
                    // Parse scores from string format "27/45" to numbers
                    const parseScore = (scoreStr) => {
                        if (typeof scoreStr === 'string' && scoreStr.includes('/')) {
                            return parseInt(scoreStr.split('/')[0]);
                        }
                        return scoreStr || 0;
                    };
                    
                    const parseMaxScore = (scoreStr) => {
                        if (typeof scoreStr === 'string' && scoreStr.includes('/')) {
                            return parseInt(scoreStr.split('/')[1]);
                        }
                        return scoreStr || 0;
                    };
                    
                    // Reconstruct the data structure that displaySSMResults expects
                    currentSSMData = {
                        coordinates: {
                            lat: ssmData.searchCoordinates.latitude,
                            lng: ssmData.searchCoordinates.longitude,
                            radius: ssmData.searchCoordinates.radius
                        },
                        siteType: ssmData.siteType || 'city',
                        analysisResults: {
                            traffic: {
                                score: parseScore(ssmData.traffic?.score),
                                maxScore: parseMaxScore(ssmData.traffic?.score) || (ssmData.siteType === 'highway' ? 60 : 45),
                                roadType: ssmData.traffic?.roadClassification?.toLowerCase() || 'unknown',
                                trafficDensity: ssmData.traffic?.trafficDensity || 50,
                                accessibilityScore: 75,
                                peakHourFactor: 60,
                                details: {
                                    roadClassification: ssmData.traffic?.roadClassification || 'UNKNOWN',
                                    estimatedDailyTraffic: 50000,
                                    accessibilityRating: 'Medium'
                                }
                            },
                            competition: {
                                score: parseScore(ssmData.competition?.score),
                                maxScore: parseMaxScore(ssmData.competition?.score) || 10,
                                totalStations: ssmData.competition?.competitorCount || 0,
                                psoStations: 0,
                                competitorStations: ssmData.competition?.competitorCount || 0,
                                marketShare: parseInt(ssmData.competition?.psoMarketShare?.replace('%', '')) || 0,
                                competitionIntensity: ssmData.competition?.competitorCount || 0,
                                details: {
                                    competitionLevel: ssmData.competition?.competitorCount > 5 ? 'High' : 
                                                    ssmData.competition?.competitorCount > 2 ? 'Medium' : 'Low',
                                    dominantCompetitors: ['Shell', 'Total', 'Attock']
                                }
                            },
                            land: {
                                score: parseScore(ssmData.land?.score),
                                maxScore: parseMaxScore(ssmData.land?.score) || 10,
                                landUseType: ssmData.land?.landUseType || 'Mixed',
                                accessibility: 70,
                                zoningSuitability: 65,
                                developmentPotential: 60,
                                details: {
                                    primaryLandUse: ssmData.land?.landUseType || 'Mixed',
                                    accessibilityRating: ssmData.land?.accessibility || 'Good',
                                    developmentFeasibility: 'Medium'
                                }
                            },
                            socioEconomic: {
                                score: parseScore(ssmData.socioEconomic?.score),
                                maxScore: parseMaxScore(ssmData.socioEconomic?.score) || (ssmData.siteType === 'highway' ? 20 : 35),
                                populationDensity: 75,
                                economicLevel: 65,
                                vehicleOwnership: 60,
                                nfrPotential: 70,
                                details: {
                                    populationCategory: ssmData.socioEconomic?.populationDensity || 'Medium',
                                    economicCategory: ssmData.socioEconomic?.economicLevel || 'Medium',
                                    nfrPotentialRating: ssmData.socioEconomic?.nfrPotential || 'Medium'
                                }
                            }
                        },
                        psoScores: {
                            traffic: parseScore(ssmData.traffic?.score),
                            competition: parseScore(ssmData.competition?.score),
                            land: parseScore(ssmData.land?.score),
                            socioEconomic: parseScore(ssmData.socioEconomic?.score),
                            totalScore: ssmData.overallScore || 0
                        },
                        siteCategory: {
                            name: ssmData.siteCategory || 'Unknown',
                            description: ssmData.categoryLevel || 'Unknown',
                            recommendation: ssmData.recommendation || 'Unknown',
                            color: determineCategoryColor(ssmData.siteCategory)
                        },
                        timestamp: new Date(ssmData.metadata?.analysisTimestamp || Date.now())
                    };
                    
                    console.log('🔄 Reconstructed SSM data for display:', currentSSMData);
                    
                    // Display the loaded results
                    displaySSMResults(currentSSMData);
                } else {
                    console.log('⚠️ Incomplete SSM data in storage, skipping display');
                }
                
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error('❌ Error loading SSM data from storage:', error);
        return false;
    }
}

// Helper function to determine category color
function determineCategoryColor(categoryName) {
    if (!categoryName) return 'category-dfc';
    
    if (categoryName.includes('CF')) return 'category-cf';
    if (categoryName.includes('DFA')) return 'category-dfa';
    if (categoryName.includes('DFB')) return 'category-dfb';
    return 'category-dfc';
}

// Execute Comprehensive Analysis with Sequential Processing and Progress Updates
async function executeComprehensiveAnalysis(lat, lng, radius, siteType) {
    console.log('📊 Executing comprehensive analysis with rate limiting...');
    
    // Update loading button with progress
    const btn = document.getElementById('analyzeSSMBtn');
    
    // Sequential execution to avoid rate limiting issues
    console.log('🚗 Step 1/4: Analyzing traffic infrastructure...');
    btn.innerHTML = `
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-2"></div>
        <span>Step 1/4: Traffic Analysis...</span>
    `;
    const trafficData = await analyzeTrafficNearLocation(lat, lng, radius, siteType);
    
    console.log('🏪 Step 2/4: Analyzing competition landscape...');
    btn.innerHTML = `
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-2"></div>
        <span>Step 2/4: Competition Analysis...</span>
    `;
    const competitionData = await analyzeCompetitionNearLocation(lat, lng, radius);
    
    console.log('🗺️ Step 3/4: Analyzing land characteristics...');
    btn.innerHTML = `
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-2"></div>
        <span>Step 3/4: Land Analysis...</span>
    `;
    const landData = await analyzeLandCharacteristics(lat, lng, radius);
    
    console.log('👥 Step 4/4: Analyzing socio-economic profile...');
    btn.innerHTML = `
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-2"></div>
        <span>Step 4/4: Socio-Economic Analysis...</span>
    `;
    const socioEconomicData = await analyzeSocioEconomicProfile(lat, lng, radius);
    
    btn.innerHTML = `
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-2"></div>
        <span>Finalizing Results...</span>
    `;
    
    console.log('✅ All analysis steps completed successfully');
    
    return {
        traffic: trafficData,
        competition: competitionData,
        land: landData,
        socioEconomic: socioEconomicData
    };
}

// 1. Traffic Near Location Analysis using OSM data
async function analyzeTrafficNearLocation(lat, lng, radius, siteType) {
    console.log('🚗 Analyzing traffic near location using OSM data...');
    
    try {
        // Fetch OSM data for traffic analysis
        const osmTrafficData = await fetchOSMTrafficData(lat, lng, radius);
        
        // Analyze traffic infrastructure from OSM data
        const roadScore = analyzeRoadInfrastructure(osmTrafficData.roads);
        const transportScore = analyzeTransportHubs(osmTrafficData.transport);
        const trafficInfraScore = analyzeTrafficInfrastructure(osmTrafficData.traffic);
        const accessibilityScore = analyzeAccessibility(osmTrafficData.access);
        
        // Calculate weighted score based on PSO metrics
        const maxScore = siteType === 'city' ? PSO_SCORING.CITY.TRAFFIC : PSO_SCORING.HIGHWAY.TRAFFIC;
        
        // Different weights for city vs highway
        let combinedScore;
        if (siteType === 'highway') {
            // Highway sites prioritize major roads and accessibility
            combinedScore = (roadScore * 0.5) + (accessibilityScore * 0.3) + (transportScore * 0.1) + (trafficInfraScore * 0.1);
        } else {
            // City sites balance all factors
            combinedScore = (roadScore * 0.3) + (transportScore * 0.3) + (trafficInfraScore * 0.2) + (accessibilityScore * 0.2);
        }
        
        const finalScore = Math.round((combinedScore / 100) * maxScore);
        
        return {
            score: finalScore,
            maxScore,
            roadType: osmTrafficData.primaryRoadType,
            trafficDensity: Math.round(combinedScore),
            accessibilityScore: Math.round(accessibilityScore),
            peakHourFactor: Math.round(trafficInfraScore),
            details: {
                roadClassification: osmTrafficData.primaryRoadType.toUpperCase(),
                majorRoads: osmTrafficData.roads.major.length,
                transportHubs: osmTrafficData.transport.stations.length,
                trafficSignals: osmTrafficData.traffic.signals.length,
                parkingLots: osmTrafficData.access.parking.length,
                estimatedDailyTraffic: Math.round(combinedScore * 1000),
                accessibilityRating: accessibilityScore > 70 ? 'High' : accessibilityScore > 40 ? 'Medium' : 'Low'
            }
        };
        
    } catch (error) {
        console.error('❌ Traffic analysis failed:', error);
        // Fallback to existing logic
        return await analyzeTrafficNearLocationFallback(lat, lng, radius, siteType);
    }
}

// Fallback traffic analysis (original method)
async function analyzeTrafficNearLocationFallback(lat, lng, radius, siteType) {
    console.log('🚗 Using fallback traffic analysis...');
    
    try {
        // Simulate comprehensive traffic analysis
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Determine road classification
        const roadType = determineRoadClassification(lat, lng);
        const trafficDensity = calculateTrafficDensity(lat, lng, roadType);
        const accessibilityScore = calculateAccessibility(lat, lng);
        const peakHourFactor = calculatePeakHourTraffic(lat, lng);
        
        // Calculate traffic score based on site type
        let trafficScore = 0;
        const maxScore = siteType === 'city' ? PSO_SCORING.CITY.TRAFFIC : PSO_SCORING.HIGHWAY.TRAFFIC;
        
        // Scoring logic based on road type and traffic density
        if (roadType === 'highway' || roadType === 'motorway') {
            trafficScore = siteType === 'highway' ? maxScore * 0.9 : maxScore * 0.7;
        } else if (roadType === 'primary') {
            trafficScore = maxScore * 0.8;
        } else if (roadType === 'secondary') {
            trafficScore = maxScore * 0.6;
        } else {
            trafficScore = maxScore * 0.4;
        }
        
        // Adjust based on traffic density
        trafficScore *= (trafficDensity / 100);
        
        // Ensure score doesn't exceed maximum
        trafficScore = Math.min(trafficScore, maxScore);
        
        return {
            score: Math.round(trafficScore),
            maxScore,
            roadType,
            trafficDensity,
            accessibilityScore,
            peakHourFactor,
            details: {
                roadClassification: roadType.toUpperCase(),
                estimatedDailyTraffic: Math.round(trafficDensity * 1000),
                accessibilityRating: accessibilityScore > 70 ? 'High' : accessibilityScore > 40 ? 'Medium' : 'Low'
            }
        };
        
    } catch (error) {
        console.error('Error analyzing traffic:', error);
        return {
            score: 20,
            maxScore: siteType === 'city' ? PSO_SCORING.CITY.TRAFFIC : PSO_SCORING.HIGHWAY.TRAFFIC,
            roadType: 'unknown',
            trafficDensity: 50,
            error: true
        };
    }
}

// Function to check if stored map data is available and relevant
function checkStoredMapData(targetLat, targetLng, radius) {
    try {
        if (typeof getMapData === 'function') {
            const mapData = getMapData();
            if (mapData && mapData.stations && mapData.stations.length > 0) {
                // Check if we have coordinates in map data to verify relevance
                const mapCenter = mapData.coordinates || mapData.searchCoordinates;
                if (mapCenter && mapCenter.latitude && mapCenter.longitude) {
                    // Calculate distance to see if stored data is relevant
                    const distance = calculateDistance(
                        targetLat, targetLng,
                        mapCenter.latitude, mapCenter.longitude
                    );
                    
                    // If stored data is within reasonable range (e.g., 5km), use it
                    if (distance <= 5) {
                        console.log('✅ Using relevant stored map data for competition analysis');
                        return mapData;
                    }
                }
                
                // Even if coordinates don't match, the data might still be useful
                console.log('⚠️ Stored map data available but location may differ - using anyway');
                return mapData;
            }
        }
    } catch (error) {
        console.warn('❌ Could not access stored map data:', error);
    }
    return null;
}

// Function to calculate distance between two coordinates
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// 2. Competition Near Location Analysis using stored map data + OSM fallback
async function analyzeCompetitionNearLocation(lat, lng, radius) {
    console.log('🏪 Analyzing competition near location...');
    
    // First try to use stored map data
    const storedMapData = checkStoredMapData(lat, lng, radius);
    
    if (storedMapData && storedMapData.stations && storedMapData.stations.length > 0) {
        console.log('🎯 Using stored map data for competition analysis');
        return analyzeCompetitionFromStoredData(storedMapData, lat, lng, radius);
    }
    
    // Fallback to OSM data if no stored data available
    console.log('📡 No stored map data available, using OSM data...');
    try {
        // Fetch OSM data for competition analysis
        const osmCompetitionData = await fetchOSMCompetitionData(lat, lng, radius);
        
        // Analyze competition from OSM data
        const fuelStations = osmCompetitionData.fuelStations;
        const supportingBusinesses = osmCompetitionData.fastFood.length + 
                                   osmCompetitionData.convenience.length + 
                                   osmCompetitionData.restaurants.length;
        
        // Count PSO stations vs competitors
        const psoStations = fuelStations.filter(station => 
            station.tags?.brand?.toLowerCase().includes('pso') ||
            station.tags?.operator?.toLowerCase().includes('pso')
        ).length;
        
        const competitorStations = fuelStations.length - psoStations;
        const totalStations = fuelStations.length;
        
        const marketShare = totalStations > 0 ? Math.round((psoStations / totalStations) * 100) : 0;
        
        // Scoring logic: Less competition = higher score
        let competitionScore = PSO_SCORING.CITY.COMPETITION; // Same for both city and highway
        
        if (competitorStations === 0) {
            competitionScore = PSO_SCORING.CITY.COMPETITION; // Full score
        } else if (competitorStations <= 2) {
            competitionScore = PSO_SCORING.CITY.COMPETITION * 0.8;
        } else if (competitorStations <= 4) {
            competitionScore = PSO_SCORING.CITY.COMPETITION * 0.6;
        } else {
            competitionScore = PSO_SCORING.CITY.COMPETITION * 0.3;
        }
        
        // Bonus for supporting businesses (indicates good commercial area)
        const supportBonus = Math.min(supportingBusinesses * 0.5, 2);
        competitionScore += supportBonus;
        
        // Identify competitor brands from OSM data
        const competitorBrands = fuelStations
            .filter(station => !station.tags?.brand?.toLowerCase().includes('pso'))
            .map(station => station.tags?.brand || station.tags?.operator || 'Unknown')
            .filter((brand, index, self) => self.indexOf(brand) === index)
            .slice(0, 3);
        
        return {
            score: Math.round(Math.min(competitionScore, PSO_SCORING.CITY.COMPETITION)),
            maxScore: PSO_SCORING.CITY.COMPETITION,
            totalStations,
            psoStations,
            competitorStations,
            marketShare,
            competitionIntensity: competitorStations,
            details: {
                competitionLevel: competitorStations <= 2 ? 'Low' : competitorStations <= 4 ? 'Medium' : 'High',
                dominantCompetitors: competitorBrands.length > 0 ? competitorBrands : ['Shell', 'Total', 'Attock'].slice(0, Math.min(competitorStations, 3)),
                supportingBusinesses: {
                    fastFood: osmCompetitionData.fastFood.length,
                    convenience: osmCompetitionData.convenience.length,
                    restaurants: osmCompetitionData.restaurants.length,
                    carServices: osmCompetitionData.carServices.length
                }
            }
        };
        
    } catch (error) {
        console.error('❌ Competition analysis failed:', error);
        // Fallback to existing logic
        return await analyzeCompetitionNearLocationFallback(lat, lng, radius);
    }
}

// New function to analyze competition from stored map data
function analyzeCompetitionFromStoredData(mapData, targetLat, targetLng, radius) {
    console.log('🎯 Analyzing competition using stored map data');
    
    const stations = mapData.stations || [];
    const brandCounts = mapData.brandCounts || {};
    
    // Filter stations within the specified radius if coordinates are available
    let relevantStations = stations;
    
    if (stations.length > 0 && stations[0].lat && stations[0].lng) {
        relevantStations = stations.filter(station => {
            if (station.lat && station.lng) {
                const distance = calculateDistance(targetLat, targetLng, station.lat, station.lng);
                return distance <= radius;
            }
            return true; // Include station if no coordinates available
        });
    }
    
    const totalStations = relevantStations.length;
    
    // Count PSO vs competitor stations
    const psoStations = relevantStations.filter(station => 
        station.brand && station.brand.toLowerCase().includes('pso')
    ).length;
    
    const competitorStations = totalStations - psoStations;
    const marketShare = totalStations > 0 ? Math.round((psoStations / totalStations) * 100) : 0;
    
    // Scoring logic: Less competition = higher score
    let competitionScore = PSO_SCORING.CITY.COMPETITION;
    
    if (competitorStations === 0) {
        competitionScore = PSO_SCORING.CITY.COMPETITION; // Full score
    } else if (competitorStations <= 2) {
        competitionScore = PSO_SCORING.CITY.COMPETITION * 0.8;
    } else if (competitorStations <= 4) {
        competitionScore = PSO_SCORING.CITY.COMPETITION * 0.6;
    } else {
        competitionScore = PSO_SCORING.CITY.COMPETITION * 0.3;
    }
    
    // Get competitor brands from stored data
    const competitorBrands = Object.keys(brandCounts)
        .filter(brand => !brand.toLowerCase().includes('pso'))
        .sort((a, b) => (brandCounts[b] || 0) - (brandCounts[a] || 0))
        .slice(0, 3);
    
    console.log(`📊 Competition analysis results: ${totalStations} total, ${psoStations} PSO, ${competitorStations} competitors`);
    
    return {
        score: Math.round(Math.min(competitionScore, PSO_SCORING.CITY.COMPETITION)),
        maxScore: PSO_SCORING.CITY.COMPETITION,
        totalStations,
        psoStations,
        competitorStations,
        marketShare,
        competitionIntensity: competitorStations,
        details: {
            competitionLevel: competitorStations <= 2 ? 'Low' : competitorStations <= 4 ? 'Medium' : 'High',
            dominantCompetitors: competitorBrands.length > 0 ? competitorBrands : ['No Data Available'],
            fuelStations: totalStations,
            supportingBusinesses: {
                fastFood: 0, // Not available in stored map data
                convenience: 0,
                restaurants: 0,
                carServices: 0
            }
        }
    };
}

// Fallback competition analysis (original method)
async function analyzeCompetitionNearLocationFallback(lat, lng, radius) {
    console.log('🏪 Using fallback competition analysis...');
    
    try {
        // Simulate competition analysis using existing map.js functionality
        await new Promise(resolve => setTimeout(resolve, 600));
        
        // Mock competition data (in real implementation, use the fetchFuelStations from map.js)
        const totalStations = Math.floor(Math.random() * 8) + 2; // 2-10 stations
        const psoStations = Math.floor(Math.random() * 3); // 0-3 PSO stations
        const competitorStations = totalStations - psoStations;
        
        const marketShare = totalStations > 0 ? Math.round((psoStations / totalStations) * 100) : 0;
        const competitionIntensity = calculateCompetitionIntensity(competitorStations, radius);
        
        // Scoring logic: Less competition = higher score
        let competitionScore = PSO_SCORING.CITY.COMPETITION; // Same for both city and highway
        
        if (competitorStations === 0) {
            competitionScore = PSO_SCORING.CITY.COMPETITION; // Full score
        } else if (competitorStations <= 2) {
            competitionScore = PSO_SCORING.CITY.COMPETITION * 0.8;
        } else if (competitorStations <= 4) {
            competitionScore = PSO_SCORING.CITY.COMPETITION * 0.6;
        } else {
            competitionScore = PSO_SCORING.CITY.COMPETITION * 0.3;
        }
        
        return {
            score: Math.round(competitionScore),
            maxScore: PSO_SCORING.CITY.COMPETITION,
            totalStations,
            psoStations,
            competitorStations,
            marketShare,
            competitionIntensity,
            details: {
                competitionLevel: competitorStations <= 2 ? 'Low' : competitorStations <= 4 ? 'Medium' : 'High',
                dominantCompetitors: ['Shell', 'Total', 'Attock'].slice(0, Math.min(competitorStations, 3))
            }
        };
        
    } catch (error) {
        console.error('Error analyzing competition:', error);
        return {
            score: 5,
            maxScore: PSO_SCORING.CITY.COMPETITION,
            competitorStations: 5,
            error: true
        };
    }
}

// 3. Land Characteristics Analysis using OSM data
async function analyzeLandCharacteristics(lat, lng, radius) {
    console.log('🗺️ Analyzing land characteristics using OSM data...');
    
    try {
        // Fetch OSM data for land analysis
        const osmLandData = await fetchOSMLandData(lat, lng, radius);
        
        // Analyze land use from OSM data - INLINE FUNCTIONS TO AVOID SCOPE ISSUES
        const landUseAnalysis = (() => {
            const types = {};
            let commercialSuitability = 0;
            
            osmLandData.landuse.forEach(landuse => {
                const type = landuse.tags?.landuse;
                if (type) {
                    types[type] = (types[type] || 0) + 1;
                    if (['commercial', 'retail', 'mixed'].includes(type)) {
                        commercialSuitability += 25;
                    } else if (['residential'].includes(type)) {
                        commercialSuitability += 15;
                    } else if (['industrial'].includes(type)) {
                        commercialSuitability += 10;
                    }
                }
            });
            
            return {
                types: Object.keys(types),
                commercialSuitability: Math.min(commercialSuitability, 100)
            };
        })();
        
        const proximityToGreen = (() => {
            const greenSpaces = osmLandData.parks.length + osmLandData.natural.length;
            if (greenSpaces >= 5) return 80;
            else if (greenSpaces >= 3) return 60;
            else if (greenSpaces >= 1) return 40;
            else return 20;
        })();
        
        const buildingDensity = (() => {
            const buildingCount = osmLandData.buildings.length;
            if (buildingCount >= 50) return 90;
            else if (buildingCount >= 30) return 70;
            else if (buildingCount >= 15) return 50;
            else if (buildingCount >= 5) return 30;
            else return 10;
        })();
        
        const accessibility = (() => {
            let score = 40;
            const commercialLand = osmLandData.landuse.filter(l => l.tags?.landuse === 'commercial').length;
            const residentialLand = osmLandData.landuse.filter(l => l.tags?.landuse === 'residential').length;
            score += Math.min(commercialLand * 10, 30);
            score += Math.min(residentialLand * 5, 20);
            score += Math.min(osmLandData.buildings.length * 1, 10);
            return Math.min(score, 100);
        })();
        
        // Determine primary land use type
        const landUseType = (() => {
            const counts = {};
            osmLandData.landuse.forEach(landuse => {
                const type = landuse.tags?.landuse;
                if (type) {
                    counts[type] = (counts[type] || 0) + 1;
                }
            });
            const primary = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b, 'mixed');
            return primary || 'mixed';
        })();
        
        // Scoring logic
        let landScore = PSO_SCORING.CITY.LAND; // Same for both city and highway
        
        // Adjust based on land use suitability
        if (landUseType === 'commercial' || landUseType === 'retail' || landUseType === 'mixed') {
            landScore = PSO_SCORING.CITY.LAND;
        } else if (landUseType === 'residential') {
            landScore = PSO_SCORING.CITY.LAND * 0.8;
        } else if (landUseType === 'industrial') {
            landScore = PSO_SCORING.CITY.LAND * 0.6;
        } else {
            landScore = PSO_SCORING.CITY.LAND * 0.4;
        }
        
        // Adjust based on accessibility and building density
        landScore *= (accessibility / 100);
        
        // Bonus for good building density (indicates development)
        if (buildingDensity > 50) landScore *= 1.1;
        else if (buildingDensity < 20) landScore *= 0.9;
        
        return {
            score: Math.round(Math.min(landScore, PSO_SCORING.CITY.LAND)),
            maxScore: PSO_SCORING.CITY.LAND,
            landUseType,
            accessibility: Math.round(accessibility),
            zoningSuitability: Math.round(landUseAnalysis.commercialSuitability),
            developmentPotential: Math.round(buildingDensity),
            details: {
                primaryLandUse: landUseType.charAt(0).toUpperCase() + landUseType.slice(1),
                accessibilityRating: accessibility > 70 ? 'Excellent' : accessibility > 50 ? 'Good' : 'Fair',
                developmentFeasibility: buildingDensity > 70 ? 'High' : buildingDensity > 50 ? 'Medium' : 'Low',
                nearbyLandUse: landUseAnalysis.types,
                greenSpaceProximity: proximityToGreen > 70 ? 'High' : proximityToGreen > 40 ? 'Medium' : 'Low',
                buildingCount: osmLandData.buildings.length
            }
        };
        
    } catch (error) {
        console.error('❌ Land analysis failed:', error);
        // Fallback to existing logic
        return await analyzeLandCharacteristicsFallback(lat, lng, radius);
    }
}

// Fallback land analysis (original method)
async function analyzeLandCharacteristicsFallback(lat, lng, radius) {
    console.log('🗺️ Using fallback land analysis...');
    
    try {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Determine land use type
        const landUseType = determineLandUseType(lat, lng);
        const accessibility = calculateLandAccessibility(lat, lng);
        const zoningSuitability = calculateZoningSuitability(lat, lng, landUseType);
        const developmentPotential = calculateDevelopmentPotential(lat, lng);
        
        // Scoring logic
        let landScore = PSO_SCORING.CITY.LAND; // Same for both city and highway
        
        // Adjust based on land use suitability
        if (landUseType === 'commercial' || landUseType === 'mixed') {
            landScore = PSO_SCORING.CITY.LAND;
        } else if (landUseType === 'residential') {
            landScore = PSO_SCORING.CITY.LAND * 0.8;
        } else if (landUseType === 'industrial') {
            landScore = PSO_SCORING.CITY.LAND * 0.6;
        } else {
            landScore = PSO_SCORING.CITY.LAND * 0.4;
        }
        
        // Adjust based on accessibility
        landScore *= (accessibility / 100);
        
        return {
            score: Math.round(landScore),
            maxScore: PSO_SCORING.CITY.LAND,
            landUseType,
            accessibility,
            zoningSuitability,
            developmentPotential,
            details: {
                primaryLandUse: landUseType.charAt(0).toUpperCase() + landUseType.slice(1),
                accessibilityRating: accessibility > 70 ? 'Excellent' : accessibility > 50 ? 'Good' : 'Fair',
                developmentFeasibility: developmentPotential > 70 ? 'High' : developmentPotential > 50 ? 'Medium' : 'Low'
            }
        };
        
    } catch (error) {
        console.error('Error analyzing land:', error);
        return {
            score: 5,
            maxScore: PSO_SCORING.CITY.LAND,
            landUseType: 'unknown',
            error: true
        };
    }
}

// 4. Socio Economic Profile and NFR Potential Analysis using OSM data
async function analyzeSocioEconomicProfile(lat, lng, radius) {
    console.log('👥 Analyzing socio-economic profile using OSM data...');
    
    try {
        // Fetch OSM data for socio-economic analysis
        const osmSocioData = await fetchOSMSocioEconomicData(lat, lng, radius);
        
        // Analyze socio-economic indicators from OSM data - INLINE FUNCTIONS TO AVOID SCOPE ISSUES
        const educationScore = (() => {
            let score = 20;
            osmSocioData.education.forEach(facility => {
                const type = facility.tags?.amenity;
                if (type === 'university') score += 20;
                else if (type === 'college') score += 15;
                else if (type === 'school') score += 10;
            });
            return Math.min(score, 100);
        })();
        
        const healthcareScore = (() => {
            let score = 10;
            osmSocioData.healthcare.forEach(facility => {
                const type = facility.tags?.amenity;
                if (type === 'hospital') score += 25;
                else if (type === 'clinic') score += 15;
                else if (type === 'pharmacy') score += 10;
            });
            return Math.min(score, 100);
        })();
        
        const retailDensity = (() => {
            const retailCount = osmSocioData.retail.length;
            if (retailCount >= 20) return 90;
            else if (retailCount >= 15) return 80;
            else if (retailCount >= 10) return 70;
            else if (retailCount >= 5) return 50;
            else if (retailCount >= 1) return 30;
            else return 10;
        })();
        
        const residentialDensity = (() => {
            const residentialCount = osmSocioData.residential.length;
            if (residentialCount >= 10) return 90;
            else if (residentialCount >= 7) return 70;
            else if (residentialCount >= 5) return 50;
            else if (residentialCount >= 3) return 30;
            else if (residentialCount >= 1) return 20;
            else return 10;
        })();
        
        const financeAccess = (() => {
            let score = 10;
            osmSocioData.finance.forEach(facility => {
                const type = facility.tags?.amenity;
                if (type === 'bank') score += 20;
                else if (type === 'atm') score += 10;
            });
            return Math.min(score, 100);
        })();
        
        // Calculate NFR potential based on retail density and economic indicators
        const nfrPotential = (() => {
            const retailScore = retailDensity;
            const financeScore = financeAccess;
            const eduScore = educationScore;
            const nfrPot = (retailScore * 0.5) + (financeScore * 0.3) + (eduScore * 0.2);
            return Math.min(nfrPot, 100);
        })();
        
        // Get max score based on site type (check if we have auto-detected site type)
        const siteType = localStorage.getItem('currentSSMSiteType') || 'city';
        const maxScore = siteType === 'city' 
            ? PSO_SCORING.CITY.SOCIO_ECONOMIC 
            : PSO_SCORING.HIGHWAY.SOCIO_ECONOMIC;
        
        // Combine scores with different weights for city vs highway
        let socioScore;
        if (siteType === 'highway') {
            // Highway sites focus more on economic indicators and convenience
            socioScore = (retailDensity * 0.4) + (financeAccess * 0.3) + (educationScore * 0.2) + (healthcareScore * 0.1);
        } else {
            // City sites balance all factors
            socioScore = (residentialDensity * 0.3) + (retailDensity * 0.25) + (educationScore * 0.2) + (healthcareScore * 0.15) + (financeAccess * 0.1);
        }
        
        // Convert to PSO scoring scale
        const finalScore = Math.round((socioScore / 100) * maxScore);
        
        // Determine categories for display
        const populationCategory = residentialDensity > 70 ? 'High Density' : residentialDensity > 40 ? 'Medium Density' : 'Low Density';
        const economicLevel = financeAccess > 70 ? 'high' : financeAccess > 50 ? 'upper-middle' : financeAccess > 30 ? 'middle' : 'lower-middle';
        
        return {
            score: finalScore,
            maxScore,
            populationDensity: Math.round(residentialDensity * 100), // Scale for display
            economicLevel,
            vehicleOwnership: Math.round(financeAccess), // Proxy for economic capacity
            fuelConsumptionPotential: Math.round(socioScore),
            nfrPotential: Math.round(nfrPotential),
            details: {
                populationCategory,
                economicStatus: economicLevel.charAt(0).toUpperCase() + economicLevel.slice(1).replace('-', ' '),
                marketPotential: socioScore > 70 ? 'Excellent' : socioScore > 50 ? 'Good' : 'Fair',
                nearbyFacilities: {
                    education: osmSocioData.education.length,
                    healthcare: osmSocioData.healthcare.length,
                    retail: osmSocioData.retail.length,
                    finance: osmSocioData.finance.length,
                    residential: osmSocioData.residential.length
                }
            }
        };
        
    } catch (error) {
        console.error('❌ Socio-economic analysis failed:', error);
        // Fallback to existing logic
        return await analyzeSocioEconomicProfileFallback(lat, lng, radius);
    }
}

// Fallback socio-economic analysis (original method)
async function analyzeSocioEconomicProfileFallback(lat, lng, radius) {
    console.log('👥 Using fallback socio-economic analysis...');
    
    try {
        await new Promise(resolve => setTimeout(resolve, 700));
        
        // Population analysis
        const populationDensity = calculatePopulationDensity(lat, lng);
        const economicLevel = determineEconomicLevel(lat, lng);
        const vehicleOwnership = estimateVehicleOwnership(lat, lng, economicLevel);
        const fuelConsumptionPotential = calculateFuelConsumptionPotential(populationDensity, vehicleOwnership);
        const nfrPotential = calculateNFRPotential(lat, lng, economicLevel);
        
        // Get max score based on site type
        const siteType = localStorage.getItem('currentSSMSiteType') || 'city';
        const maxScore = siteType === 'city' 
            ? PSO_SCORING.CITY.SOCIO_ECONOMIC 
            : PSO_SCORING.HIGHWAY.SOCIO_ECONOMIC;
        
        // Scoring logic
        let socioScore = maxScore;
        
        // Adjust based on population density
        if (populationDensity > 10000) {
            socioScore *= 1.0; // High density = full score
        } else if (populationDensity > 5000) {
            socioScore *= 0.8;
        } else if (populationDensity > 1000) {
            socioScore *= 0.6;
        } else {
            socioScore *= 0.4;
        }
        
        // Adjust based on economic level
        if (economicLevel === 'high') {
            socioScore *= 1.0;
        } else if (economicLevel === 'upper-middle') {
            socioScore *= 0.9;
        } else if (economicLevel === 'middle') {
            socioScore *= 0.7;
        } else {
            socioScore *= 0.5;
        }
        
        return {
            score: Math.round(socioScore),
            maxScore,
            populationDensity,
            economicLevel,
            vehicleOwnership,
            fuelConsumptionPotential,
            nfrPotential,
            details: {
                populationCategory: populationDensity > 10000 ? 'High Density' : populationDensity > 5000 ? 'Medium Density' : 'Low Density',
                economicStatus: economicLevel.charAt(0).toUpperCase() + economicLevel.slice(1).replace('-', ' '),
                marketPotential: fuelConsumptionPotential > 70 ? 'Excellent' : fuelConsumptionPotential > 50 ? 'Good' : 'Fair'
            }
        };
        
    } catch (error) {
        console.error('Error analyzing socio-economic profile:', error);
        return {
            score: 15,
            maxScore: 35,
            populationDensity: 5000,
            economicLevel: 'middle',
            error: true
        };
    }
}

// Calculate PSO Scores based on analysis results
function calculatePSOScores(analysisResults, siteType) {
    const { traffic, competition, land, socioEconomic } = analysisResults;
    
    const totalScore = traffic.score + competition.score + land.score + socioEconomic.score;
    const maxPossibleScore = siteType === 'city' ? 100 : 100;
    const percentage = Math.round((totalScore / maxPossibleScore) * 100);
    
    return {
        traffic: traffic.score,
        competition: competition.score,
        land: land.score,
        socioEconomic: socioEconomic.score,
        totalScore,
        maxPossibleScore,
        percentage,
        breakdown: {
            trafficWeight: siteType === 'city' ? PSO_SCORING.CITY.TRAFFIC : PSO_SCORING.HIGHWAY.TRAFFIC,
            competitionWeight: PSO_SCORING.CITY.COMPETITION,
            landWeight: PSO_SCORING.CITY.LAND,
            socioWeight: siteType === 'city' ? PSO_SCORING.CITY.SOCIO_ECONOMIC : PSO_SCORING.HIGHWAY.SOCIO_ECONOMIC
        }
    };
}

// Determine Site Category based on total score
function determineSiteCategory(totalScore) {
    for (const [key, category] of Object.entries(CATEGORY_THRESHOLDS)) {
        if (totalScore >= category.min && totalScore <= category.max) {
            return {
                code: key,
                ...category,
                score: totalScore
            };
        }
    }
    
    // Fallback to lowest category
    return {
        code: 'DFC',
        ...CATEGORY_THRESHOLDS.DFC,
        score: totalScore
    };
}

// Display SSM Results
function displaySSMResults(ssmData) {
    hideLoadingState();
    
    const { analysisResults, psoScores, siteCategory, siteType } = ssmData;
    
    // Show result sections
    document.getElementById('classificationResult').classList.remove('hidden');
    document.getElementById('parameterAnalysis').classList.remove('hidden');
    document.getElementById('chartSection').classList.remove('hidden');
    
    // Update category badge
    updateCategoryBadge(siteCategory);
    
    // Update key metrics
    updateKeyMetrics(psoScores, siteType, siteCategory);
    
    // Update parameter details
    updateParameterDetails(analysisResults);
    
    // Create/update chart
    createScoreChart(psoScores, siteType);
    
    // Scroll to results
    document.getElementById('classificationResult').scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
    });
    
    // Show success message
    showTemporaryMessage(`✅ Site classified as ${siteCategory.name} with ${psoScores.totalScore} points!`, 'success');
}

// Update Category Badge
function updateCategoryBadge(siteCategory) {
    const badge = document.getElementById('categoryBadge');
    badge.className = `inline-block px-12 py-6 rounded-2xl text-white font-bold text-3xl mb-6 pulse-animation ${siteCategory.color}`;
    badge.textContent = siteCategory.name;
}

// Update Key Metrics Display
function updateKeyMetrics(psoScores, siteType, siteCategory) {
    document.getElementById('totalScore').textContent = psoScores.totalScore;
    document.getElementById('siteTypeDisplay').textContent = siteType === 'city' ? 'City' : 'Highway/Motorway';
    document.getElementById('recommendation').textContent = siteCategory.recommendation;
    document.getElementById('categoryDescription').textContent = siteCategory.description;
    
    // Update recommendation color based on category
    const recommendationEl = document.getElementById('recommendation');
    recommendationEl.className = `text-lg font-semibold mb-2 ${
        siteCategory.code === 'CF' ? 'text-green-400' :
        siteCategory.code === 'DFA' ? 'text-blue-400' :
        siteCategory.code === 'DFB' ? 'text-yellow-400' : 'text-red-400'
    }`;
}

// Update Parameter Details
function updateParameterDetails(analysisResults) {
    const { traffic, competition, land, socioEconomic } = analysisResults;
    
    // Traffic details
    updateParameterCard('traffic', traffic);
    
    // Competition details
    updateParameterCard('competition', competition);
    
    // Land details
    updateParameterCard('land', land);
    
    // Socio-economic details
    updateParameterCard('socio', socioEconomic);
}

// Update individual parameter card
function updateParameterCard(type, data) {
    const score = data.score;
    const maxScore = data.maxScore;
    const percentage = Math.round((score / maxScore) * 100);
    
    // Update score and progress bar
    document.getElementById(`${type}Score`).textContent = `${score}/${maxScore}`;
    document.getElementById(`${type}Progress`).style.width = `${percentage}%`;
    
    // Update specific details based on type
    switch (type) {
        case 'traffic':
            document.getElementById('roadType').textContent = data.details?.roadClassification || 'Unknown';
            document.getElementById('trafficDensity').textContent = data.details?.accessibilityRating || 'Medium';
            break;
            
        case 'competition':
            document.getElementById('competitorCount').textContent = data.competitorStations || 0;
            document.getElementById('marketShare').textContent = `${data.marketShare || 0}%`;
            break;
            
        case 'land':
            document.getElementById('landUseType').textContent = data.details?.primaryLandUse || 'Mixed';
            document.getElementById('accessibility').textContent = data.details?.accessibilityRating || 'Good';
            break;
            
        case 'socio':
            document.getElementById('populationDensity').textContent = data.details?.populationCategory || 'Medium';
            document.getElementById('economicLevel').textContent = data.details?.economicStatus || 'Middle';
            break;
    }
}

// Create Score Breakdown Chart
function createScoreChart(psoScores, siteType) {
    const chartCanvas = document.getElementById('scoreChart');
    // Set fixed height for the chart to prevent infinite growth
    chartCanvas.height = 320;
    chartCanvas.width = 400;
    const ctx = chartCanvas.getContext('2d');

    // Destroy existing chart if it exists
    if (ssmChart) {
        ssmChart.destroy();
    }

    const labels = ['Traffic', 'Competition', 'Land', 'Socio-Economic'];
    const scores = [psoScores.traffic, psoScores.competition, psoScores.land, psoScores.socioEconomic];
    const maxScores = [
        psoScores.breakdown.trafficWeight,
        psoScores.breakdown.competitionWeight,
        psoScores.breakdown.landWeight,
        psoScores.breakdown.socioWeight
    ];
    
    ssmChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Achieved Score',
                data: scores,
                backgroundColor: [
                    'rgba(239, 68, 68, 0.8)',   // Traffic - Red
                    'rgba(245, 158, 11, 0.8)',  // Competition - Orange
                    'rgba(34, 197, 94, 0.8)',   // Land - Green
                    'rgba(147, 51, 234, 0.8)'   // Socio-Economic - Purple
                ],
                borderColor: [
                    'rgba(239, 68, 68, 1)',
                    'rgba(245, 158, 11, 1)',
                    'rgba(34, 197, 94, 1)',
                    'rgba(147, 51, 234, 1)'
                ],
                borderWidth: 2
            }, {
                label: 'Maximum Possible',
                data: maxScores,
                backgroundColor: 'rgba(107, 114, 128, 0.3)',
                borderColor: 'rgba(107, 114, 128, 0.8)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: false,
            maintainAspectRatio: true,
            aspectRatio: 1.25,
            plugins: {
                legend: {
                    labels: {
                        color: '#e5e7eb'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    titleColor: '#f3f4f6',
                    bodyColor: '#f3f4f6',
                    borderColor: '#374151',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            const max = maxScores[context.dataIndex];
                            const score = context.parsed.y;
                            const percentage = Math.round((score / max) * 100);
                            return `${context.dataset.label}: ${score}/${max} (${percentage}%)`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(75, 85, 99, 0.3)'
                    },
                    ticks: {
                        color: '#e5e7eb'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(75, 85, 99, 0.3)'
                    },
                    ticks: {
                        color: '#e5e7eb'
                    }
                }
            }
        }
    });
}

// Show/Hide Loading State
function showLoadingState() {
    document.getElementById('loadingIndicator').classList.remove('hidden');
    document.getElementById('classificationResult').classList.add('hidden');
    document.getElementById('parameterAnalysis').classList.add('hidden');
    document.getElementById('chartSection').classList.add('hidden');
    
    // Disable analyze button
    const btn = document.getElementById('analyzeSSMBtn');
    btn.disabled = true;
    btn.innerHTML = `
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-2"></div>
        <span>Analyzing...</span>
    `;
}

function hideLoadingState() {
    document.getElementById('loadingIndicator').classList.add('hidden');
    
    // Re-enable analyze button
    const btn = document.getElementById('analyzeSSMBtn');
    btn.disabled = false;
    btn.innerHTML = `
        <i class="fas fa-chart-line text-xl"></i>
        <span>Analyze Site</span>
    `;
}

// Utility Functions for Analysis

// Auto-detect site type based on coordinates and road classification
function autoDetectSiteType(lat, lng) {
    // Check if coordinates are in major city boundaries
    const cityBounds = [
        { name: 'Karachi', latMin: 24.7, latMax: 25.2, lngMin: 66.9, lngMax: 67.5 },
        { name: 'Lahore', latMin: 31.3, latMax: 31.7, lngMin: 74.1, lngMax: 74.5 },
        { name: 'Islamabad', latMin: 33.6, latMax: 33.8, lngMin: 72.9, lngMax: 73.2 },
        { name: 'Rawalpindi', latMin: 33.5, latMax: 33.7, lngMin: 73.0, lngMax: 73.2 },
        { name: 'Faisalabad', latMin: 31.3, latMax: 31.5, lngMin: 73.0, lngMax: 73.2 },
        { name: 'Multan', latMin: 30.1, latMax: 30.3, lngMin: 71.4, lngMax: 71.6 },
        { name: 'Peshawar', latMin: 33.9, latMax: 34.1, lngMin: 71.4, lngMax: 71.6 },
        { name: 'Quetta', latMin: 30.1, latMax: 30.3, lngMin: 66.9, lngMax: 67.1 }
    ];

    // First check if coordinates are within major city boundaries
    for (const city of cityBounds) {
        if (lat >= city.latMin && lat <= city.latMax && lng >= city.lngMin && lng <= city.lngMax) {
            console.log(`📍 Location detected within ${city.name} city bounds - Site Type: CITY`);
            return 'city';
        }
    }

    // If not in major cities, analyze road classification to determine if it's highway/motorway
    const roadType = determineRoadClassification(lat, lng);
    
    // Consider highway/motorway if it's a major road outside city bounds
    if (roadType === 'highway' || roadType === 'motorway') {
        console.log(`🛣️ Location detected on ${roadType} outside city bounds - Site Type: HIGHWAY`);
        return 'highway';
    }

    // Check distance from major highways (simplified logic)
    const isNearMajorHighway = checkProximityToMajorHighways(lat, lng);
    if (isNearMajorHighway) {
        console.log(`🛣️ Location detected near major highway - Site Type: HIGHWAY`);
        return 'highway';
    }

    // Default to city if not clearly a highway location
    console.log(`🏙️ Location defaulting to city site type`);
    return 'city';
}

// Check if location is near major highways
function checkProximityToMajorHighways(lat, lng) {
    // Major highway corridors in Pakistan (simplified)
    const majorHighways = [
        // M1 Motorway (Islamabad-Peshawar)
        { name: 'M1', latRange: [33.6, 34.0], lngRange: [71.5, 73.1] },
        // M2 Motorway (Islamabad-Lahore)
        { name: 'M2', latRange: [31.5, 33.7], lngRange: [73.0, 73.2] },
        // N5 National Highway (Karachi-Lahore)
        { name: 'N5', latRange: [24.8, 31.5], lngRange: [67.0, 74.3] },
        // M9 Motorway (Karachi-Hyderabad)
        { name: 'M9', latRange: [24.8, 25.4], lngRange: [67.9, 68.4] }
    ];

    const proximityThreshold = 0.05; // ~5km tolerance

    for (const highway of majorHighways) {
        const latInRange = lat >= (highway.latRange[0] - proximityThreshold) && 
                          lat <= (highway.latRange[1] + proximityThreshold);
        const lngInRange = lng >= (highway.lngRange[0] - proximityThreshold) && 
                          lng <= (highway.lngRange[1] + proximityThreshold);
        
        if (latInRange && lngInRange) {
            console.log(`🛣️ Location near ${highway.name} highway corridor`);
            return true;
        }
    }
    return false;
}

// Determine road classification based on coordinates
function determineRoadClassification(lat, lng) {
    // Enhanced logic with better road type determination
    const isNearMajorHighway = checkProximityToMajorHighways(lat, lng);
    
    if (isNearMajorHighway) {
        return Math.random() > 0.5 ? 'highway' : 'motorway';
    }
    
    // Urban area roads
    const random = Math.random();
    if (random > 0.7) return 'primary';
    if (random > 0.4) return 'secondary';
    return 'tertiary';
}

// Calculate traffic density
function calculateTrafficDensity(lat, lng, roadType) {
    const baseTraffic = {
        'highway': 85,
        'primary': 70,
        'secondary': 55,
        'tertiary': 40
    };
    
    const variation = (Math.random() - 0.5) * 20; // ±10% variation
    return Math.max(20, Math.min(100, baseTraffic[roadType] + variation));
}

// Calculate accessibility score
function calculateAccessibility(lat, lng) {
    // Mock calculation based on coordinates and urban density
    return Math.floor(Math.random() * 40) + 50; // 50-90
}

// Calculate peak hour traffic factor
function calculatePeakHourTraffic(lat, lng) {
    // Mock calculation - in real implementation, use traffic APIs
    return Math.floor(Math.random() * 30) + 70; // 70-100
}

// Calculate competition intensity
function calculateCompetitionIntensity(competitorCount, radius) {
    const density = competitorCount / (Math.PI * radius * radius);
    if (density > 2) return 'High';
    if (density > 1) return 'Medium';
    return 'Low';
}

// Determine land use type
function determineLandUseType(lat, lng) {
    const types = ['commercial', 'residential', 'mixed', 'industrial'];
    const weights = [0.3, 0.4, 0.2, 0.1]; // Higher probability for commercial/residential
    
    const random = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < types.length; i++) {
        cumulative += weights[i];
        if (random <= cumulative) {
            return types[i];
        }
    }
    
    return 'mixed';
}

// Calculate land accessibility
function calculateLandAccessibility(lat, lng) {
    // Mock calculation based on road network and urban infrastructure
    return Math.floor(Math.random() * 40) + 50; // 50-90
}

// Calculate zoning suitability
function calculateZoningSuitability(lat, lng, landUseType) {
    const suitability = {
        'commercial': 90,
        'mixed': 85,
        'residential': 70,
        'industrial': 60
    };
    
    return suitability[landUseType] + (Math.random() - 0.5) * 20;
}

// Calculate development potential
function calculateDevelopmentPotential(lat, lng) {
    // Mock calculation based on infrastructure and regulations
    return Math.floor(Math.random() * 50) + 40; // 40-90
}

// Calculate population density
function calculatePopulationDensity(lat, lng) {
    // Mock calculation - in real implementation, use census/WorldPop APIs
    // Karachi area typically has higher density
    if (lat >= 24.7 && lat <= 25.2 && lng >= 66.9 && lng <= 67.5) {
        return Math.floor(Math.random() * 15000) + 8000; // 8,000-23,000 people/km²
    }
    
    // Other urban areas
    return Math.floor(Math.random() * 8000) + 2000; // 2,000-10,000 people/km²
}

// Determine economic level
function determineEconomicLevel(lat, lng) {
    const levels = ['high', 'upper-middle', 'middle', 'lower-middle'];
    const weights = [0.15, 0.25, 0.4, 0.2]; // Middle class most common
    
    const random = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < levels.length; i++) {
        cumulative += weights[i];
        if (random <= cumulative) {
            return levels[i];
        }
    }
    
    return 'middle';
}

// Estimate vehicle ownership
function estimateVehicleOwnership(lat, lng, economicLevel) {
    const ownership = {
        'high': 85,
        'upper-middle': 70,
        'middle': 45,
        'lower-middle': 25
    };
    
    return ownership[economicLevel] + (Math.random() - 0.5) * 20;
}

// Calculate fuel consumption potential
function calculateFuelConsumptionPotential(populationDensity, vehicleOwnership) {
    const densityFactor = Math.min(100, populationDensity / 150); // Normalize to 0-100
    const ownershipFactor = vehicleOwnership;
    
    return Math.round((densityFactor + ownershipFactor) / 2);
}

// Calculate NFR (Non-Fuel Revenue) potential
function calculateNFRPotential(lat, lng, economicLevel) {
    const baseNFR = {
        'high': 80,
        'upper-middle': 65,
        'middle': 50,
        'lower-middle': 35
    };
    
    return baseNFR[economicLevel] + (Math.random() - 0.5) * 20;
}

// Show temporary message
function showTemporaryMessage(message, type) {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.temp-message');
    existingMessages.forEach(msg => msg.remove());
    
    // Create message element
    const messageEl = document.createElement('div');
    messageEl.className = `temp-message fixed top-24 right-6 z-50 px-6 py-4 rounded-lg font-semibold text-white shadow-lg transform transition-all duration-300 ${getMessageClasses(type)}`;
    messageEl.textContent = message;
    
    // Add to page
    document.body.appendChild(messageEl);
    
    // Animate in
    setTimeout(() => {
        messageEl.classList.add('translate-x-0');
        messageEl.classList.remove('translate-x-full');
    }, 100);
    
    // Remove after delay
    setTimeout(() => {
        messageEl.classList.add('translate-x-full');
        messageEl.classList.remove('translate-x-0');
        setTimeout(() => messageEl.remove(), 300);
    }, 4000);
}

// Get message classes based on type
function getMessageClasses(type) {
    const classes = {
        'success': 'bg-green-600 border-green-500',
        'error': 'bg-red-600 border-red-500',
        'warning': 'bg-yellow-600 border-yellow-500',
        'info': 'bg-blue-600 border-blue-500'
    };
    
    return classes[type] || classes.info + ' translate-x-full';
}

// Export current analysis results
function exportSSMResults() {
    if (!currentSSMData || Object.keys(currentSSMData).length === 0) {
        showTemporaryMessage('❌ No analysis data to export. Please run analysis first.', 'error');
        return;
    }
    
    try {
        const exportData = {
            timestamp: currentSSMData.timestamp,
            coordinates: currentSSMData.coordinates,
            siteType: currentSSMData.siteType,
            classification: {
                category: currentSSMData.siteCategory.name,
                score: currentSSMData.psoScores.totalScore,
                recommendation: currentSSMData.siteCategory.recommendation
            },
            scores: {
                traffic: currentSSMData.psoScores.traffic,
                competition: currentSSMData.psoScores.competition,
                land: currentSSMData.psoScores.land,
                socioEconomic: currentSSMData.psoScores.socioEconomic,
                total: currentSSMData.psoScores.totalScore
            },
            details: {
                traffic: currentSSMData.analysisResults.traffic.details,
                competition: currentSSMData.analysisResults.competition.details,
                land: currentSSMData.analysisResults.land.details,
                socioEconomic: currentSSMData.analysisResults.socioEconomic.details
            }
        };
        
        // Create downloadable JSON file
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        // Create download link
        const link = document.createElement('a');
        link.href = url;
        link.download = `PSO_SSM_Analysis_${currentSSMData.coordinates.lat}_${currentSSMData.coordinates.lng}_${new Date().toISOString().split('T')[0]}.json`;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        URL.revokeObjectURL(url);
        
        showTemporaryMessage('✅ SSM analysis results exported successfully!', 'success');
        
    } catch (error) {
        console.error('Error exporting SSM results:', error);
        showTemporaryMessage('❌ Failed to export analysis results.', 'error');
    }
}

// Print SSM report
function printSSMReport() {
    if (!currentSSMData || Object.keys(currentSSMData).length === 0) {
        showTemporaryMessage('❌ No analysis data to print. Please run analysis first.', 'error');
        return;
    }
    
    try {
        // Create print-friendly HTML
        const printContent = generatePrintReport(currentSSMData);
        
        // Open new window for printing
        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();
        
        // Trigger print dialog
        printWindow.onload = function() {
            printWindow.print();
        };
        
        showTemporaryMessage('📄 Print dialog opened for SSM report.', 'info');
        
    } catch (error) {
        console.error('Error printing SSM report:', error);
        showTemporaryMessage('❌ Failed to generate print report.', 'error');
    }
}

// Generate print-friendly report
function generatePrintReport(ssmData) {
    const { coordinates, siteType, siteCategory, psoScores, analysisResults } = ssmData;
    
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>PSO Site Selection Metrics Report</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
                .header { text-align: center; border-bottom: 2px solid #f59e0b; padding-bottom: 20px; margin-bottom: 30px; }
                .logo { max-width: 100px; margin-bottom: 10px; }
                .section { margin-bottom: 30px; }
                .category-badge { display: inline-block; padding: 10px 20px; border-radius: 8px; color: white; font-weight: bold; }
                .cf { background: linear-gradient(135deg, #059669, #10b981); }
                .dfa { background: linear-gradient(135deg, #0ea5e9, #3b82f6); }
                .dfb { background: linear-gradient(135deg, #f59e0b, #fbbf24); }
                .dfc { background: linear-gradient(135deg, #ef4444, #f87171); }
                .score-table { width: 100%; border-collapse: collapse; }
                .score-table th, .score-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                .score-table th { background-color: #f8f9fa; }
                .coordinates { background-color: #f8f9fa; padding: 15px; border-radius: 8px; }
                @media print { .no-print { display: none; } }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Pakistan State Oil</h1>
                <h2>Site Selection Metrics Report</h2>
                <p>Generated on ${new Date().toLocaleDateString()}</p>
            </div>
            
            <div class="section">
                <h3>Site Information</h3>
                <div class="coordinates">
                    <p><strong>Coordinates:</strong> ${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}</p>
                    <p><strong>Analysis Radius:</strong> ${coordinates.radius} km</p>
                    <p><strong>Site Type:</strong> ${siteType === 'city' ? 'City Site' : 'Highway/Motorway Site'}</p>
                </div>
            </div>
            
            <div class="section">
                <h3>Classification Result</h3>
                <p>
                    <span class="category-badge ${siteCategory.code.toLowerCase()}">${siteCategory.name}</span>
                </p>
                <p><strong>Total Score:</strong> ${psoScores.totalScore}/100</p>
                <p><strong>Recommendation:</strong> ${siteCategory.recommendation}</p>
            </div>
            
            <div class="section">
                <h3>Score Breakdown</h3>
                <table class="score-table">
                    <tr>
                        <th>Parameter</th>
                        <th>Score</th>
                        <th>Maximum</th>
                        <th>Percentage</th>
                    </tr>
                    <tr>
                        <td>Traffic Near Location</td>
                        <td>${psoScores.traffic}</td>
                        <td>${psoScores.breakdown.trafficWeight}</td>
                        <td>${Math.round((psoScores.traffic / psoScores.breakdown.trafficWeight) * 100)}%</td>
                    </tr>
                    <tr>
                        <td>Competition Near Location</td>
                        <td>${psoScores.competition}</td>
                        <td>${psoScores.breakdown.competitionWeight}</td>
                        <td>${Math.round((psoScores.competition / psoScores.breakdown.competitionWeight) * 100)}%</td>
                    </tr>
                    <tr>
                        <td>Land</td>
                        <td>${psoScores.land}</td>
                        <td>${psoScores.breakdown.landWeight}</td>
                        <td>${Math.round((psoScores.land / psoScores.breakdown.landWeight) * 100)}%</td>
                    </tr>
                    <tr>
                        <td>Socio Economic Profile & NFR</td>
                        <td>${psoScores.socioEconomic}</td>
                        <td>${psoScores.breakdown.socioWeight}</td>
                        <td>${Math.round((psoScores.socioEconomic / psoScores.breakdown.socioWeight) * 100)}%</td>
                    </tr>
                    <tr style="background-color: #f8f9fa; font-weight: bold;">
                        <td>Total</td>
                        <td>${psoScores.totalScore}</td>
                        <td>100</td>
                        <td>${psoScores.percentage}%</td>
                    </tr>
                </table>
            </div>
            
            <div class="section">
                <h3>Analysis Details</h3>
                <h4>Traffic Analysis</h4>
                <p><strong>Road Classification:</strong> ${analysisResults.traffic.details?.roadClassification || 'N/A'}</p>
                <p><strong>Accessibility Rating:</strong> ${analysisResults.traffic.details?.accessibilityRating || 'N/A'}</p>
                
                <h4>Competition Analysis</h4>
                <p><strong>Competitor Count:</strong> ${analysisResults.competition.competitorStations || 0}</p>
                <p><strong>PSO Market Share:</strong> ${analysisResults.competition.marketShare || 0}%</p>
                
                <h4>Land Analysis</h4>
                <p><strong>Primary Land Use:</strong> ${analysisResults.land.details?.primaryLandUse || 'N/A'}</p>
                <p><strong>Accessibility Rating:</strong> ${analysisResults.land.details?.accessibilityRating || 'N/A'}</p>
                
                <h4>Socio-Economic Analysis</h4>
                <p><strong>Population Category:</strong> ${analysisResults.socioEconomic.details?.populationCategory || 'N/A'}</p>
                <p><strong>Economic Status:</strong> ${analysisResults.socioEconomic.details?.economicStatus || 'N/A'}</p>
            </div>
            
            <div class="section">
                <h3>Category Thresholds (PSO Standard)</h3>
                <table class="score-table">
                    <tr>
                        <th>Category</th>
                        <th>Score Range</th>
                        <th>Description</th>
                    </tr>
                    <tr>
                        <td>CF (Company Finance)</td>
                        <td>80-100</td>
                        <td>Premium locations with excellent potential</td>
                    </tr>
                    <tr>
                        <td>DFA (Dealer Finance A)</td>
                        <td>60-79</td>
                        <td>Excellent locations with very good potential</td>
                    </tr>
                    <tr>
                        <td>DFB (Dealer Finance B)</td>
                        <td>49-60</td>
                        <td>Good locations with moderate potential</td>
                    </tr>
                    <tr>
                        <td>DFC (Dealer Finance C)</td>
                        <td>Less than 49</td>
                        <td>Poor locations with limited potential</td>
                    </tr>
                </table>
            </div>
            
            <div class="section" style="text-align: center; margin-top: 50px; font-size: 12px; color: #666;">
                <p>© 2025 Pakistan State Oil Company Limited • Channel Development Department</p>
                <p>This report is generated by Smart Trading Area - Digital Solutions Platform</p>
            </div>
        </body>
        </html>
    `;
}

// Initialize analysis from URL parameters (useful for direct links)
function initializeFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const lat = urlParams.get('lat');
    const lng = urlParams.get('lng');
    const radius = urlParams.get('radius');
    const siteType = urlParams.get('siteType');
    
    if (lat && lng) {
        const latEl = document.getElementById('ssm-latitude');
        const lngEl = document.getElementById('ssm-longitude');
        const radiusEl = document.getElementById('ssm-radius');
        
        if (latEl) latEl.value = lat;
        if (lngEl) lngEl.value = lng;
        
        if (radius && radiusEl) {
            radiusEl.value = radius;
        }
        
        if (siteType && (siteType === 'city' || siteType === 'highway')) {
            const siteTypeEl = document.querySelector(`input[name="siteType"][value="${siteType}"]`);
            if (siteTypeEl) siteTypeEl.checked = true;
        }
        
        // Auto-analyze if all parameters are present
        if (urlParams.get('autoAnalyze') === 'true') {
            setTimeout(performSSMAnalysis, 1000);
        }
    }

// Additional OSM Analysis Helper Functions
// ======================================

// Land use analysis functions
function analyzeLandUseFromOSM(landuses) {
    const types = {};
    let commercialSuitability = 0;
    
    landuses.forEach(landuse => {
        const type = landuse.tags?.landuse;
        if (type) {
            types[type] = (types[type] || 0) + 1;
            
            // Score commercial suitability
            if (['commercial', 'retail', 'mixed'].includes(type)) {
                commercialSuitability += 25;
            } else if (['residential'].includes(type)) {
                commercialSuitability += 15;
            } else if (['industrial'].includes(type)) {
                commercialSuitability += 10;
            }
        }
    });
    
    return {
        types: Object.keys(types),
        commercialSuitability: Math.min(commercialSuitability, 100)
    };
}

function analyzeGreenSpaceProximity(parks, natural) {
    const greenSpaces = parks.length + natural.length;
    
    if (greenSpaces >= 5) return 80;
    else if (greenSpaces >= 3) return 60;
    else if (greenSpaces >= 1) return 40;
    else return 20;
}

function analyzeBuildingDensity(buildings) {
    const buildingCount = buildings.length;
    
    // Score based on building count in the area
    if (buildingCount >= 50) return 90;
    else if (buildingCount >= 30) return 70;
    else if (buildingCount >= 15) return 50;
    else if (buildingCount >= 5) return 30;
    else return 10;
}

function calculateLandAccessibilityFromOSM(osmData) {
    // Base accessibility score
    let score = 40;
    
    // Bonus for various land features
    const commercialLand = osmData.landuse.filter(l => l.tags?.landuse === 'commercial').length;
    const residentialLand = osmData.landuse.filter(l => l.tags?.landuse === 'residential').length;
    
    score += Math.min(commercialLand * 10, 30);
    score += Math.min(residentialLand * 5, 20);
    score += Math.min(osmData.buildings.length * 1, 10);
    
    return Math.min(score, 100);
}

function determinePrimaryLandUse(landuses) {
    const counts = {};
    
    landuses.forEach(landuse => {
        const type = landuse.tags?.landuse;
        if (type) {
            counts[type] = (counts[type] || 0) + 1;
        }
    });
    
    // Find the most common land use
    const primary = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b, 'mixed');
    return primary || 'mixed';
}

// Socio-economic analysis functions
function analyzeSocioEducationLevel(education) {
    const educationCount = education.length;
    
    // Score based on educational facilities
    let score = 20; // Base score
    
    education.forEach(facility => {
        const type = facility.tags?.amenity;
        if (type === 'university') score += 20;
        else if (type === 'college') score += 15;
        else if (type === 'school') score += 10;
    });
    
    return Math.min(score, 100);
}

function analyzeSocioHealthcareAccess(healthcare) {
    const healthcareCount = healthcare.length;
    
    // Score based on healthcare facilities
    let score = 10; // Base score
    
    healthcare.forEach(facility => {
        const type = facility.tags?.amenity;
        if (type === 'hospital') score += 25;
        else if (type === 'clinic') score += 15;
        else if (type === 'pharmacy') score += 10;
    });
    
    return Math.min(score, 100);
}

function analyzeSocioRetailDensity(retail) {
    const retailCount = retail.length;
    
    // Score based on retail density
    if (retailCount >= 20) return 90;
    else if (retailCount >= 15) return 80;
    else if (retailCount >= 10) return 70;
    else if (retailCount >= 5) return 50;
    else if (retailCount >= 1) return 30;
    else return 10;
}

function analyzeSocioResidentialDensity(residential) {
    const residentialCount = residential.length;
    
    // Score based on residential density
    if (residentialCount >= 10) return 90;
    else if (residentialCount >= 7) return 70;
    else if (residentialCount >= 5) return 50;
    else if (residentialCount >= 3) return 30;
    else if (residentialCount >= 1) return 20;
    else return 10;
}

function analyzeSocioFinanceAccess(finance) {
    const financeCount = finance.length;
    
    // Score based on financial services availability
    let score = 10; // Base score
    
    finance.forEach(facility => {
        const type = facility.tags?.amenity;
        if (type === 'bank') score += 20;
        else if (type === 'atm') score += 10;
    });
    
    return Math.min(score, 100);
}

function calculateNFRFromOSM(osmData) {
    // Calculate NFR potential based on various OSM factors
    const retailScore = analyzeSocioRetailDensity(osmData.retail);
    const financeScore = analyzeSocioFinanceAccess(osmData.finance);
    const educationScore = analyzeSocioEducationLevel(osmData.education);
    
    // NFR potential is a combination of these factors
    const nfrPotential = (retailScore * 0.5) + (financeScore * 0.3) + (educationScore * 0.2);
    
    return Math.min(nfrPotential, 100);
}
}

// Add keyboard shortcuts
document.addEventListener('keydown', function(event) {
    // Ctrl+Enter to analyze
    if (event.ctrlKey && event.key === 'Enter') {
        event.preventDefault();
        performSSMAnalysis();
    }
    
    // Ctrl+E to export (if analysis exists)
    if (event.ctrlKey && event.key === 'e') {
        event.preventDefault();
        exportSSMResults();
    }
    
    // Ctrl+P to print (if analysis exists)
    if (event.ctrlKey && event.key === 'p') {
        event.preventDefault();
        printSSMReport();
    }
});

// Enhanced coordinate validation with Pakistan bounds
function validatePakistanCoordinates() {
    const lat = parseFloat(document.getElementById('ssm-latitude').value);
    const lng = parseFloat(document.getElementById('ssm-longitude').value);
    
    // Pakistan approximate bounds
    const pakistanBounds = {
        minLat: 23.5,
        maxLat: 37.5,
        minLng: 60.5,
        maxLng: 77.5
    };
    
    const withinPakistan = lat >= pakistanBounds.minLat && lat <= pakistanBounds.maxLat &&
                          lng >= pakistanBounds.minLng && lng <= pakistanBounds.maxLng;
    
    if (!withinPakistan && !isNaN(lat) && !isNaN(lng)) {
        showTemporaryMessage('⚠️ Coordinates appear to be outside Pakistan. Analysis may be less accurate.', 'warning');
    }
    
    return validateCoordinates();
}

// Enhanced page initialization
document.addEventListener('DOMContentLoaded', function() {
    
    loadCoordinatesFromCookies();
   
    // Add event listeners with null checks
    const latEl = document.getElementById('ssm-latitude');
    const lngEl = document.getElementById('ssm-longitude');
    
    if (latEl) {
        latEl.addEventListener('input', validatePakistanCoordinates);
        console.log('✅ Added event listener to ssm-latitude');
    } else {
        console.warn('⚠️ ssm-latitude element not found for event listener');
    }
    
    if (lngEl) {
        lngEl.addEventListener('input', validatePakistanCoordinates);
        console.log('✅ Added event listener to ssm-longitude');
    } else {
        console.warn('⚠️ ssm-longitude element not found for event listener');
    }
    
    // Try to sync coordinates from map
    // syncCoordinatesFromMap();
    
    // Setup event listeners
    setupEventListeners();
    
    // Display system info
    console.log('📊 PSO Scoring System Loaded:');
    console.log('   City Sites: Traffic(45) + Competition(10) + Land(10) + Socio(35) = 100');
    console.log('   Highway Sites: Traffic(60) + Competition(10) + Land(10) + Socio(20) = 100');
    console.log('   Categories: CF(80-100) | DFA(60-79) | DFB(49-60) | DFC(<49)');
});

// Make functions globally available
window.performSSMAnalysis = performSSMAnalysis;
window.exportSSMResults = exportSSMResults;
window.printSSMReport = printSSMReport;
window.performSSMAnalysisForStorage = performSSMAnalysisForStorage;

// Simplified SSM analysis for storage manager (no HTML/UI dependencies)
async function performSSMAnalysisForStorage(lat, lng, radius) {
    try {
        console.log(`🔍 Performing SSM analysis for storage: ${lat}, ${lng}, radius: ${radius}km`);
        
        // Auto-detect site type
        const siteType = autoDetectSiteType(lat, lng);
        
        // Perform all analysis steps
        const analysisResults = await executeComprehensiveAnalysisForStorage(lat, lng, radius, siteType);
        
        // Calculate PSO scores
        const psoScores = calculatePSOScores(analysisResults, siteType);
        
        // Determine site category
        const siteCategory = determineSiteCategory(psoScores.totalScore);
        
        // Create comprehensive SSM data
        const ssmData = {
            searchCoordinates: {
                latitude: lat,
                longitude: lng,
                radius: radius
            },
            siteClassification: {
                category: siteCategory.name,
                categoryCode: siteCategory.name.match(/\((.*?)\)/)?.[1] || siteCategory.name.split(' ')[0],
                totalScore: psoScores.totalScore,
                siteType: siteType.charAt(0).toUpperCase() + siteType.slice(1),
                recommendation: siteCategory.recommendation,
                status: siteCategory.recommendation,
                categoryLevel: siteCategory.description
            },
            siteType: siteType,
            siteCategory: siteCategory.name,
            overallScore: psoScores.totalScore,
            recommendation: siteCategory.recommendation,
            categoryLevel: siteCategory.description,
            traffic: {
                score: `${analysisResults.traffic.score}/${analysisResults.traffic.maxScore}`,
                roadClassification: analysisResults.traffic.roadType?.toUpperCase() || 'UNKNOWN',
                trafficDensity: analysisResults.traffic.trafficDensity > 70 ? 'High' : 
                               analysisResults.traffic.trafficDensity > 40 ? 'Medium' : 'Low'
            },
            competition: {
                score: `${analysisResults.competition.score}/${analysisResults.competition.maxScore}`,
                competitorCount: analysisResults.competition.competitorStations || 0,
                psoMarketShare: analysisResults.competition.marketShare ? `${analysisResults.competition.marketShare}%` : '0%'
            },
            land: {
                score: `${analysisResults.land.score}/${analysisResults.land.maxScore}`,
                accessibility: analysisResults.land.accessibility || 'Unknown',
                landUseType: analysisResults.land.landUseType || 'Mixed',
                zoningSuitability: analysisResults.land.zoningSuitability || 'Unknown'
            },
            socioEconomic: {
                score: `${analysisResults.socioEconomic.score}/${analysisResults.socioEconomic.maxScore}`,
                populationDensity: analysisResults.socioEconomic.populationDensity || 'Medium',
                economicLevel: analysisResults.socioEconomic.economicLevel || 'Medium',
                nfrPotential: analysisResults.socioEconomic.nfrPotential || 'Medium'
            },
            coordinates: {
                center: { lat, lng },
                radius: radius
            },
            recommendations: extractRecommendationsFromResults(analysisResults, psoScores),
            metadata: {
                source: 'Auto-generated via Storage Manager',
                analysisTimestamp: new Date().toISOString(),
                dataSource: 'OpenStreetMap (OSM) + PSO SSM Model',
                module: 'ssm',
                version: '2.0',
                lastUpdated: new Date().toISOString()
            }
        };

        console.log(`✅ SSM analysis completed for storage:`, ssmData);
        return ssmData;

    } catch (error) {
        console.error('❌ Error performing SSM analysis for storage:', error);
        
        // Return minimal fallback data
        return {
            searchCoordinates: { latitude: lat, longitude: lng, radius: radius },
            siteClassification: {
                category: 'DFC (Dealer Finance C)',
                categoryCode: 'DFC',
                totalScore: 30,
                siteType: 'City',
                recommendation: 'Not Recommended',
                status: 'Not Recommended',
                categoryLevel: 'Poor'
            },
            siteType: 'city',
            siteCategory: 'DFC (Dealer Finance C)',
            overallScore: 30,
            recommendation: 'Not Recommended',
            categoryLevel: 'Poor',
            traffic: { score: '10/45', roadClassification: 'UNKNOWN', trafficDensity: 'Low' },
            competition: { score: '5/10', competitorCount: 0, psoMarketShare: '0%' },
            land: { score: '5/10', accessibility: 'Unknown', landUseType: 'Mixed', zoningSuitability: 'Unknown' },
            socioEconomic: { score: '10/35', populationDensity: 'Medium', economicLevel: 'Medium', nfrPotential: 'Medium' },
            coordinates: { center: { lat, lng }, radius: radius },
            recommendations: ['Site requires comprehensive evaluation before consideration'],
            metadata: {
                source: 'Fallback data - Auto-generated via Storage Manager',
                analysisTimestamp: new Date().toISOString(),
                dataSource: 'Fallback Data',
                module: 'ssm',
                version: '2.0',
                lastUpdated: new Date().toISOString()
            }
        };
    }
}

// Simplified comprehensive analysis for storage (no UI updates)
async function executeComprehensiveAnalysisForStorage(lat, lng, radius, siteType) {
    console.log('📊 Executing comprehensive analysis for storage...');
    
    // Sequential execution with simplified progress logging
    console.log('🚗 Step 1/4: Analyzing traffic infrastructure...');
    const trafficData = await analyzeTrafficNearLocation(lat, lng, radius, siteType);
    
    console.log('🏪 Step 2/4: Analyzing competition landscape...');
    const competitionData = await analyzeCompetitionNearLocation(lat, lng, radius);
    
    console.log('🗺️ Step 3/4: Analyzing land characteristics...');
    const landData = await analyzeLandCharacteristics(lat, lng, radius);
    
    console.log('👥 Step 4/4: Analyzing socio-economic profile...');
    const socioEconomicData = await analyzeSocioEconomicProfile(lat, lng, radius);
    
    console.log('✅ All analysis steps completed for storage');
    
    return {
        traffic: trafficData,
        competition: competitionData,
        land: landData,
        socioEconomic: socioEconomicData
    };
}

// Extract recommendations from analysis results
function extractRecommendationsFromResults(analysisResults, psoScores) {
    const recommendations = [];
    
    if (psoScores.traffic < 20) {
        recommendations.push('Improve traffic accessibility and road infrastructure');
    }
    if (psoScores.competition < 15) {
        recommendations.push('Consider market saturation and competitive positioning');
    }
    if (psoScores.land < 15) {
        recommendations.push('Evaluate land characteristics and development potential');
    }
    if (psoScores.socioEconomic < 20) {
        recommendations.push('Assess demographic and economic factors');
    }
    
    if (recommendations.length === 0) {
        recommendations.push('Site shows good potential for PSO fuel station development');
    }
    
    return recommendations;
}

// ========================================
// COOKIE AND AUTO-GENERATION FUNCTIONS
// ========================================

// Function to set cookie value
function setCookie(name, value, days = 30) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
}

// Auto-generate all data function
async function autoGenerateAllData() {
    try {
        const latitude = parseFloat(document.getElementById('auto-latitude').value);
        const longitude = parseFloat(document.getElementById('auto-longitude').value);
        const radius = parseFloat(document.getElementById('auto-radius').value);
        
        if (!latitude || !longitude || !radius) {
            showToast('❌ Please enter valid coordinates and radius', 'error');
            return;
        }
        
        // Update button state
        const button = document.getElementById('autoGenerateBtn');
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner animate-spin mr-2"></i>Generating Data...';
        button.disabled = true;
        
        console.log('🚀 Starting auto-generation for coordinates:', { latitude, longitude, radius });
        
        // Save coordinates to cookies
        setCookie('map_latitude', latitude);
        setCookie('map_longitude', longitude);
        setCookie('map_radius', radius);
        
        // Update main SSM inputs
        document.getElementById('ssm-latitude').value = latitude;
        document.getElementById('ssm-longitude').value = longitude;
        document.getElementById('ssm-radius').value = radius;
        
        // Step 1: Generate Map Data (simulate map.js functionality)
        showToast('📍 Generating map data...', 'info');
        const mapData = await generateMapData(latitude, longitude, radius);
        
        // Step 2: Generate Analysis Data (simulate analysis.js functionality) 
        showToast('🏗️ Generating analysis data...', 'info');
        const analysisData = await generateAnalysisData(latitude, longitude, radius);
        
        // Step 3: Generate SSM Data - use the existing SSM analysis
        showToast('📊 Generating SSM data...', 'info');
        await performSSMAnalysis(); // Use existing SSM analysis
        
        // Save all data using storage manager
        if (window.storageManager) {
            window.storageManager.setMapData(mapData);
            window.storageManager.setAnalysisData(analysisData);
        }
        
        showToast('✅ All data generated successfully!', 'success');
        
        // Reset button
        button.innerHTML = originalText;
        button.disabled = false;
        
    } catch (error) {
        console.error('❌ Error in auto-generation:', error);
        showToast('❌ Error generating data: ' + error.message, 'error');
        
        // Reset button
        const button = document.getElementById('autoGenerateBtn');
        button.innerHTML = '<i class="fas fa-bolt mr-2"></i>Auto Generate All Data';
        button.disabled = false;
    }
}

// Generate map data (simplified version of map.js functionality)
async function generateMapData(latitude, longitude, radius) {
    try {
        const stations = await fetchOSMData(latitude, longitude, radius, `
            [out:json][timeout:25];
            (
                nwr["amenity"="fuel"](around:${radius * 1000},${latitude},${longitude});
            );
            out center;
        `);
        
        const processedStations = stations.map(station => ({
            id: station.id,
            name: station.tags?.name || 'Fuel Station',
            brand: station.tags?.brand || 'Unknown',
            type: station.tags?.fuel || 'Unknown',
            coordinates: {
                lat: station.lat || station.center?.lat,
                lng: station.lon || station.center?.lon
            },
            distance: calculateDistance(latitude, longitude, 
                station.lat || station.center?.lat, 
                station.lon || station.center?.lon)
        }));
        
        return {
            stations: processedStations,
            coordinates: { latitude, longitude, radius },
            searchRadius: radius,
            totalStations: processedStations.length,
            psoStations: processedStations.filter(s => s.brand?.toLowerCase().includes('pso')).length,
            competitorStations: processedStations.filter(s => !s.brand?.toLowerCase().includes('pso')).length,
            metadata: {
                source: 'Auto-Generated via SSM',
                generatedAt: new Date().toISOString()
            }
        };
    } catch (error) {
        console.error('❌ Error generating map data:', error);
        return {
            stations: [],
            coordinates: { latitude, longitude, radius },
            searchRadius: radius,
            totalStations: 0,
            psoStations: 0,
            competitorStations: 0,
            metadata: {
                source: 'Auto-Generated via SSM (Fallback)',
                generatedAt: new Date().toISOString()
            }
        };
    }
}

// Generate analysis data (simplified version of analysis.js functionality)
async function generateAnalysisData(latitude, longitude, radius) {
    try {
        const landUseData = await fetchOSMData(latitude, longitude, radius, `
            [out:json][timeout:25];
            (
                way["landuse"](around:${radius * 1000},${latitude},${longitude});
                relation["landuse"](around:${radius * 1000},${latitude},${longitude});
            );
            out geom;
        `);
        
        const amenityData = await fetchOSMData(latitude, longitude, radius, `
            [out:json][timeout:25];
            (
                nwr["amenity"](around:${radius * 1000},${latitude},${longitude});
            );
            out center;
        `);
        
        // Process land use data
        const landUseCounts = {};
        landUseData.forEach(element => {
            const landUse = element.tags?.landuse || 'unknown';
            landUseCounts[landUse] = (landUseCounts[landUse] || 0) + 1;
        });
        
        const dominantLandUse = Object.keys(landUseCounts).reduce((a, b) => 
            landUseCounts[a] > landUseCounts[b] ? a : b, 'mixed');
        
        return {
            siteType: determineSiteType(dominantLandUse, amenityData.length),
            dominantLandUse: dominantLandUse,
            totalElements: landUseData.length + amenityData.length,
            coordinates: { latitude, longitude, radius },
            landUse: {
                counts: landUseCounts,
                percentages: calculatePercentages(landUseCounts)
            },
            amenities: processAmenities(amenityData),
            metadata: {
                source: 'Auto-Generated via SSM',
                generatedAt: new Date().toISOString()
            }
        };
    } catch (error) {
        console.error('❌ Error generating analysis data:', error);
        return {
            siteType: 'Urban Commercial',
            dominantLandUse: 'commercial',
            totalElements: 0,
            coordinates: { latitude, longitude, radius },
            landUse: { counts: {}, percentages: {} },
            amenities: {},
            metadata: {
                source: 'Auto-Generated via SSM (Fallback)',
                generatedAt: new Date().toISOString()
            }
        };
    }
}

// Helper functions
function determineSiteType(dominantLandUse, amenityCount) {
    if (dominantLandUse.includes('commercial') || amenityCount > 50) return 'Urban Commercial';
    if (dominantLandUse.includes('residential')) return 'Urban Residential'; 
    if (dominantLandUse.includes('industrial')) return 'Industrial';
    return 'Mixed Urban';
}

function calculatePercentages(counts) {
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    const percentages = {};
    for (const [key, value] of Object.entries(counts)) {
        percentages[key] = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
    }
    return percentages;
}

function processAmenities(amenityData) {
    const amenityTypes = {};
    amenityData.forEach(amenity => {
        const type = amenity.tags?.amenity || 'unknown';
        amenityTypes[type] = (amenityTypes[type] || 0) + 1;
    });
    return amenityTypes;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Simple toast notification function
function showToast(message, type = 'info') {
    // Try using Toastify if available
    if (typeof Toastify !== 'undefined') {
        const bgColors = {
            success: 'bg-gradient-to-r from-green-800 to-green-700',
            error: 'bg-gradient-to-r from-red-800 to-red-700', 
            warning: 'bg-gradient-to-r from-yellow-800 to-yellow-700',
            info: 'bg-gradient-to-r from-blue-800 to-blue-700'
        };
        
        Toastify({
            text: message,
            duration: 3000,
            gravity: "top",
            position: "right",
            offset: {
                y: 80
            },
            className: `${bgColors[type] || bgColors.info} text-white rounded-lg shadow-lg font-medium text-sm`,
            stopOnFocus: true
        }).showToast();
    } else {
        // Fallback: simple console log and basic notification
        console.log(`📢 ${message}`);
        
        // Create simple toast element
        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg text-white z-[1000] transition-all duration-300 transform translate-x-full`;
        
        const bgColors = {
            success: 'bg-green-600',
            error: 'bg-red-600', 
            warning: 'bg-yellow-600',
            info: 'bg-blue-600'
        };
        
        toast.className += ` ${bgColors[type] || bgColors.info}`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // Show animation
        setTimeout(() => {
            toast.classList.remove('translate-x-full');
        }, 100);
        
        // Hide after 3 seconds
        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
}

// Export functions globally for storage manager
window.performSSMAnalysis = performSSMAnalysis;
window.loadCoordinatesFromCookies = loadCoordinatesFromCookies;
window.autoGenerateAllData = autoGenerateAllData;

console.log('🎯 SSM functions exported globally:', {
    performSSMAnalysis: typeof performSSMAnalysis,
    loadCoordinatesFromCookies: typeof loadCoordinatesFromCookies,
    autoGenerateAllData: typeof autoGenerateAllData
});

console.log('🎯 SSM functions exported globally:', {
    performSSMAnalysis: typeof performSSMAnalysis
});
