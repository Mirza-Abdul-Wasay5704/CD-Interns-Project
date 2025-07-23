/* =============================================================================
   PSO Fuel Station Finder - Refactored & Clean JavaScript
   ============================================================================= */

// =============================================================================
// DEPENDENCY CHECKS & VALIDATION
// =============================================================================

class DependencyChecker {
    static checkRequiredLibraries() {
        const missing = [];
        
        if (typeof L === 'undefined') {
            missing.push('Leaflet (L)');
        }

// =============================================================================
// CONSTANTS & CONFIGURATION
// =============================================================================
        
        if (typeof XLSX === 'undefined') {
            missing.push('SheetJS (XLSX)');
        }
        
        if (typeof domtoimage === 'undefined') {
            missing.push('dom-to-image (domtoimage)');
        }
        
        return missing;
    }
    
    static showDependencyError(missing) {
        const errorHTML = `
            <div class="min-h-screen flex items-center justify-center bg-red-50">
                <div class="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
                    <i class="fas fa-exclamation-triangle text-red-500 text-4xl mb-4"></i>
                    <h1 class="text-xl font-bold text-gray-800 mb-2">Library Loading Error</h1>
                    <p class="text-gray-600 mb-4">Required libraries failed to load:</p>
                    <ul class="text-left text-sm text-gray-700 mb-4">
                        ${missing.map(lib => `<li>• ${lib}</li>`).join('')}
                    </ul>
                    <p class="text-sm text-gray-500 mb-4">Please check your internet connection and try again.</p>
                    <button onclick="location.reload()" class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors">
                        Reload Page
                    </button>
                </div>
            </div>
        `;
        document.body.innerHTML = errorHTML;
    }
    
    static async waitForLibraries(maxAttempts = 10, interval = 500) {
        for (let i = 0; i < maxAttempts; i++) {
            const missing = this.checkRequiredLibraries();
            if (missing.length === 0) {
                return true;
            }
            
            if (i < maxAttempts - 1) {
                await new Promise(resolve => setTimeout(resolve, interval));
            }
        }
        return false;
    }
}

const APP_CONFIG = {
    // Map Configuration
    DEFAULT_CENTER: [25.3730, 68.3512],
    DEFAULT_ZOOM: 12,
    MAP_HEIGHT: 600,
    
    // Search Configuration
    SEARCH_RADIUS_DEFAULT: 10,
    MARKER_SIZE: 32,
    
    // API Configuration
    OVERPASS_API: 'https://overpass-api.de/api/interpreter',
    OVERPASS_TIMEOUT: 30,
    
    // Allowed Fuel Station Brands
    ALLOWED_BRANDS: ['pso', 'caltex', 'shell', 'total', 'hascol', 'byco', 'attock'],
    
    // Brand Colors for Visualization
    BRAND_COLORS: {
        'PSO': '#10b981',
        'Shell': '#f59e0b', 
        'Total': '#3b82f6',
        'Attock': '#f97316',
        'Hascol': '#dc2626',
        'Caltex': '#e11d48',
        'Byco': '#8b5cf6'
    },
    
    // Brand Logo Mappings
    BRAND_LOGOS: {
        'pso': 'assets/logos/pso.png',
        'shell': 'assets/logos/shell.png',
        'total': 'assets/logos/total.png',
        'attock': 'assets/logos/attock.png',
        'hascol': 'assets/logos/hascol.png',
        'caltex': 'assets/logos/caltex.png',
        'byco': 'assets/logos/byco.png'
    },
    
    // Estimated Fuel Prices (PKR per liter)
    FUEL_PRICES: {
        'PSO': 272.50,
        'Shell': 275.00,
        'Total': 274.00,
        'Attock': 273.50,
        'Hascol': 273.00,
        'Caltex': 275.50,
        'Byco': 273.00
    }
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

class Utils {
    static calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    static calculateBearing(lat1, lng1, lat2, lng2) {
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const lat1Rad = lat1 * Math.PI / 180;
        const lat2Rad = lat2 * Math.PI / 180;
        
        const y = Math.sin(dLng) * Math.cos(lat2Rad);
        const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
                  Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
        
        const bearing = Math.atan2(y, x) * 180 / Math.PI;
        return (bearing + 360) % 360;
    }

    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static formatAddress(tags) {
        const parts = [];
        if (tags['addr:street']) parts.push(tags['addr:street']);
        if (tags['addr:city']) parts.push(tags['addr:city']);
        if (tags['addr:state']) parts.push(tags['addr:state']);
        return parts.length > 0 ? parts.join(', ') : 'Address not available';
    }

    static showNotification(message, type = 'info') {
        // Simple notification system - can be enhanced with a toast library
        console.log(`${type.toUpperCase()}: ${message}`);
        // TODO: Implement proper toast notifications
    }
}

// =============================================================================
// DOM MANAGER - Centralized DOM Element Management
// =============================================================================

class DOMManager {
    constructor() {
        this.elements = {};
        this.cacheElements();
    }

    cacheElements() {
        // Search elements
        this.elements.searchBtn = document.getElementById('searchBtn');
        this.elements.latInput = document.getElementById('latitude');
        this.elements.lngInput = document.getElementById('longitude');
        this.elements.radiusInput = document.getElementById('radius');

        // Control buttons
        this.elements.focusModeBtn = document.getElementById('focusModeBtn');
        this.elements.tradingAreaBtn = document.getElementById('tradingAreaBtn');
        this.elements.editMapBtn = document.getElementById('editMapBtn');
        this.elements.exportExcelBtn = document.getElementById('exportExcelBtn');
        this.elements.exportMapBtn = document.getElementById('exportMapBtn');

        // Edit toolbox
        this.elements.editToolbox = document.getElementById('edit-toolbox');
        this.elements.addTextBtn = document.getElementById('addTextBtn');
        this.elements.addImageBtn = document.getElementById('addImageBtn');
        this.elements.exitEditBtn = document.getElementById('exitEditBtn');

        // Statistics elements
        this.elements.psoCount = document.getElementById('pso-count');
        this.elements.competitorCount = document.getElementById('competitor-count');
        this.elements.totalCount = document.getElementById('total-count');
        this.elements.coveragePercent = document.getElementById('coverage-percent');

        // Results and filters
        this.elements.resultsList = document.getElementById('results-list');
        this.elements.filterButtons = document.querySelectorAll('.filter-btn');

        // Analysis sections
        this.elements.siteStatusBelow = document.getElementById('site-status-below');
        this.elements.siteAnalysisContainer = document.getElementById('site-analysis-container');
        this.elements.locationAnalysisSection = document.getElementById('location-analysis-section');

        // Analysis count elements
        this.elements.countHospitals = document.getElementById('count-hospitals');
        this.elements.countRestaurants = document.getElementById('count-restaurants');
        this.elements.countEducational = document.getElementById('count-educational');
        this.elements.countMalls = document.getElementById('count-malls');
        this.elements.countClinics = document.getElementById('count-clinics');
        this.elements.countBanks = document.getElementById('count-banks');

        // Map container
        this.elements.mapContainer = document.getElementById('map');
    }

    getElement(key) {
        return this.elements[key];
    }

    updateStatistics(stats) {
        this.elements.psoCount.textContent = stats.psoCount;
        this.elements.competitorCount.textContent = stats.competitorCount;
        this.elements.totalCount.textContent = stats.totalCount;
        this.elements.coveragePercent.textContent = stats.coverage + '%';
    }

    setLoadingState(isLoading) {
        const btn = this.elements.searchBtn;
        if (isLoading) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner loading"></i> Searching...';
        } else {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-search"></i> <span>Search</span>';
        }
    }

    showError(message) {
        this.elements.resultsList.innerHTML = `
            <div class="error text-center py-6 text-red-600">
                <i class="fas fa-exclamation-triangle text-2xl mb-2"></i>
                <p class="font-semibold text-sm">${message}</p>
                <small class="text-xs text-gray-500">Please try again or check your internet connection</small>
            </div>
        `;
    }

    showNoResults(radius) {
        this.elements.resultsList.innerHTML = `
            <div class="error text-center py-6 text-red-600">
                <i class="fas fa-exclamation-circle text-2xl mb-2"></i>
                <p class="font-semibold text-sm">No fuel stations found within ${radius}km radius</p>
                <small class="text-xs text-gray-500">Try searching in a different location</small>
            </div>
        `;
    }

    showLoadingResults() {
        this.elements.resultsList.innerHTML = `
            <div class="loading text-center py-6 text-pso-primary">
                <i class="fas fa-spinner loading text-xl mb-2"></i>
                <p class="font-medium text-sm">Searching for fuel stations from OpenStreetMap...</p>
            </div>
        `;
    }

    updateFilterButtons(activeFilter) {
        this.elements.filterButtons.forEach(btn => {
            btn.classList.remove('filter-btn-active');
            if (btn.textContent.toLowerCase() === activeFilter || 
                (activeFilter === 'competitor' && btn.textContent.toLowerCase() === 'competitors')) {
                btn.classList.add('filter-btn-active');
            }
        });
    }
}

// =============================================================================
// MAP MANAGER - Leaflet Map Operations
// =============================================================================

class MapManager {
    constructor(domManager) {
        this.domManager = domManager;
        this.map = null;
        this.markers = [];
        this.radiusCircle = null;
        this.editLayerGroup = null;
        this.focusMode = false;
    }

    async initMap() {
        try {
            // Check if Leaflet is available
            if (typeof L === 'undefined') {
                throw new Error('Leaflet library is not available. Please check your internet connection.');
            }

            const mapContainer = this.domManager.getElement('mapContainer');
            if (!mapContainer) {
                throw new Error('Map container element not found');
            }

            this.map = L.map(mapContainer).setView(APP_CONFIG.DEFAULT_CENTER, APP_CONFIG.DEFAULT_ZOOM);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(this.map);

            this.setupMapEventListeners();
            this.editLayerGroup = L.layerGroup().addTo(this.map);
            
            Utils.showNotification('Map initialized successfully', 'success');
        } catch (error) {
            console.error('Error initializing map:', error);
            Utils.showNotification('Error initializing map: ' + error.message, 'error');
            throw error; // Re-throw to be handled by the main app
        }
    }

    setupMapEventListeners() {
        this.map.on('click', (e) => {
            this.domManager.getElement('latInput').value = e.latlng.lat.toFixed(6);
            this.domManager.getElement('lngInput').value = e.latlng.lng.toFixed(6);
        });
    }

    clearMap() {
        // Remove existing markers
        this.markers.forEach(marker => this.map.removeLayer(marker));
        this.markers = [];

        // Remove radius circle
        if (this.radiusCircle) {
            this.map.removeLayer(this.radiusCircle);
            this.radiusCircle = null;
        }

        // Remove other layers (except tiles and edit layer)
        this.map.eachLayer((layer) => {
            if (!layer._url && layer !== this.editLayerGroup) {
                this.map.removeLayer(layer);
            }
        });
    }

    addSearchMarker(lat, lng) {
        const searchMarker = L.marker([lat, lng], {
            icon: L.divIcon({
                html: '<i class="fas fa-crosshairs text-red-600 text-xl"></i>',
                className: 'custom-marker',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            })
        }).addTo(this.map);

        this.markers.push(searchMarker);
        return searchMarker;
    }

    addRadiusCircle(lat, lng, radius) {
        this.radiusCircle = L.circle([lat, lng], {
            color: '#10b981',
            fillColor: '#4ade80',
            fillOpacity: 0.2,
            radius: radius * 1000
        }).addTo(this.map);
    }

    addStationMarker(station, searchLat, searchLng) {
        const brandKey = station.brand.toLowerCase();
        const iconUrl = APP_CONFIG.BRAND_LOGOS[brandKey] || APP_CONFIG.BRAND_LOGOS.pso;
        const isPSO = brandKey === 'pso';

        const marker = L.marker([station.lat, station.lng], {
            icon: L.icon({
                iconUrl: iconUrl,
                iconSize: [APP_CONFIG.MARKER_SIZE, APP_CONFIG.MARKER_SIZE],
                iconAnchor: [APP_CONFIG.MARKER_SIZE / 2, APP_CONFIG.MARKER_SIZE],
                popupAnchor: [0, -APP_CONFIG.MARKER_SIZE + 4]
            })
        }).addTo(this.map);

        marker.bindPopup(this.createStationPopup(station, iconUrl));
        this.markers.push(marker);

        // Add connection line
        this.addConnectionLine(searchLat, searchLng, station, isPSO);

        return marker;
    }

    createStationPopup(station, iconUrl) {
        return `
            <div class="min-w-64 p-2">
                <h4 class="text-lg font-bold text-pso-primary mb-2">${station.name}</h4>
                <p class="text-gray-600 text-sm mb-2">${station.address}</p>
                <div class="space-y-1 text-sm">
                    <p class="font-semibold">Distance: ${station.distance.toFixed(2)} km</p>
                    <p class="font-semibold">Price: Rs. ${station.price}/L</p>
                    ${station.phone !== 'N/A' ? `<p>Phone: ${station.phone}</p>` : ''}
                    ${station.opening_hours !== 'N/A' ? `<p>Hours: ${station.opening_hours}</p>` : ''}
                </div>
                <div class="flex items-center mt-3 pt-2 border-t border-gray-200">
                    <img src="${iconUrl}" alt="${station.brand} logo" class="h-6 w-6 mr-2">
                    <span class="bg-pso-primary text-pso-secondary px-2 py-1 rounded text-xs font-semibold">
                        ${station.brand}
                    </span>
                </div>
            </div>
        `;
    }

    addConnectionLine(searchLat, searchLng, station, isPSO) {
        const latlngs = [[searchLat, searchLng], [station.lat, station.lng]];
        
        const polyline = L.polyline(latlngs, {
            color: isPSO ? '#166534' : '#dc2626',
            weight: isPSO ? 3 : 2,
            opacity: 0.8,
            dashArray: isPSO ? null : '5, 5'
        }).addTo(this.map);

        this.markers.push(polyline);
        this.addDistanceLabel(searchLat, searchLng, station);
    }

    addDistanceLabel(searchLat, searchLng, station) {
        const midLat = (searchLat + station.lat) / 2;
        const midLng = (searchLng + station.lng) / 2;
        
        const angleRad = Math.atan2(station.lat - searchLat, station.lng - searchLng);
        let angleDeg = angleRad * 180 / Math.PI;
        if (angleDeg > 90) angleDeg -= 180;
        if (angleDeg < -90) angleDeg += 180;

        const distanceLabel = L.marker([midLat, midLng], {
            icon: L.divIcon({
                className: 'distance-label',
                html: `<span class="inline-block whitespace-nowrap text-sm font-bold text-pso-primary bg-white px-2 py-1 rounded shadow-md border transform" style="transform: rotate(${angleDeg}deg)">${station.distance.toFixed(2)} km</span>`
            }),
            interactive: false
        }).addTo(this.map);

        this.markers.push(distanceLabel);
    }

    setMapView(lat, lng, zoom = 14) {
        this.map.setView([lat, lng], zoom);
    }

    toggleFocusMode() {
        const mapContainer = this.domManager.getElement('mapContainer');
        const focusBtn = this.domManager.getElement('focusModeBtn');

        this.focusMode = !this.focusMode;

        if (this.focusMode) {
            mapContainer.classList.add('focus-mode-active');
            focusBtn.innerHTML = '<i class="fas fa-eye"></i> <span class="hidden sm:inline">Exit Focus Mode</span>';
            focusBtn.classList.remove('bg-emerald-700', 'hover:bg-emerald-800');
            focusBtn.classList.add('bg-red-600', 'hover:bg-red-700');
        } else {
            mapContainer.classList.remove('focus-mode-active');
            focusBtn.innerHTML = '<i class="fas fa-crosshairs"></i> <span class="hidden sm:inline">Focus Mode</span>';
            focusBtn.classList.remove('bg-red-600', 'hover:bg-red-700');
            focusBtn.classList.add('bg-emerald-700', 'hover:bg-emerald-800');
        }

        Utils.showNotification(`Focus mode ${this.focusMode ? 'enabled' : 'disabled'}`, 'info');
    }

    // Edit mode functionality
    toggleEditMode() {
        const editToolbox = this.domManager.getElement('editToolbox');
        const editBtn = this.domManager.getElement('editMapBtn');
        
        const isHidden = editToolbox.classList.contains('hidden');
        
        if (isHidden) {
            editToolbox.classList.remove('hidden');
            editToolbox.setAttribute('aria-hidden', 'false');
            editBtn.innerHTML = '<i class="fas fa-times"></i> <span>Exit Edit</span>';
            editBtn.classList.remove('bg-pso-primary', 'hover:bg-blue-800');
            editBtn.classList.add('bg-red-600', 'hover:bg-red-700');
            this.map.getContainer().style.cursor = 'crosshair';
        } else {
            editToolbox.classList.add('hidden');
            editToolbox.setAttribute('aria-hidden', 'true');
            editBtn.innerHTML = '<i class="fas fa-edit"></i> <span>Edit Map</span>';
            editBtn.classList.remove('bg-red-600', 'hover:bg-red-700');
            editBtn.classList.add('bg-pso-primary', 'hover:bg-blue-800');
            this.map.getContainer().style.cursor = '';
        }
    }
}

// =============================================================================
// STATION FETCHER - API Integration & Data Processing
// =============================================================================

class StationFetcher {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    }

    async fetchFuelStations(lat, lng, radius) {
        const cacheKey = `${lat.toFixed(4)}_${lng.toFixed(4)}_${radius}`;
        
        // Check cache first
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheExpiry) {
                return cached.data;
            }
        }

        const query = this.buildOverpassQuery(lat, lng, radius);

        try {
            const response = await fetch(APP_CONFIG.OVERPASS_API, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: 'data=' + encodeURIComponent(query)
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            const stations = this.processStationData(data.elements, lat, lng, radius);

            // Cache the results
            this.cache.set(cacheKey, {
                data: stations,
                timestamp: Date.now()
            });

            return stations;

        } catch (error) {
            console.error('Error fetching fuel stations:', error);
            throw new Error('Failed to fetch fuel station data. Please check your internet connection and try again.');
        }
    }

    buildOverpassQuery(lat, lng, radius) {
        return `
            [out:json][timeout:${APP_CONFIG.OVERPASS_TIMEOUT}];
            (
              node["amenity"="fuel"](around:${radius * 1000},${lat},${lng});
              way["amenity"="fuel"](around:${radius * 1000},${lat},${lng});
              relation["amenity"="fuel"](around:${radius * 1000},${lat},${lng});
            );
            out geom;
        `;
    }

    processStationData(elements, searchLat, searchLng, radius) {
        return elements.map(element => {
            let stationLat, stationLng;

            // Extract coordinates based on element type
            if (element.type === 'node') {
                stationLat = element.lat;
                stationLng = element.lon;
            } else if (element.type === 'way' && element.geometry) {
                stationLat = element.geometry[0].lat;
                stationLng = element.geometry[0].lon;
            } else {
                return null;
            }

            const distance = Utils.calculateDistance(searchLat, searchLng, stationLat, stationLng);
            if (distance > radius) return null;

            const tags = element.tags || {};
            const brand = this.determineBrand(tags);
            
            if (!APP_CONFIG.ALLOWED_BRANDS.includes(brand.toLowerCase())) {
                return null;
            }

            return {
                id: element.id,
                name: tags.name || tags.brand || `${brand} Station`,
                brand: brand,
                lat: stationLat,
                lng: stationLng,
                distance: distance,
                address: Utils.formatAddress(tags),
                phone: tags.phone || 'N/A',
                services: this.determineServices(tags),
                rating: 4.0 + Math.random() * 1.0, // Mock rating
                price: APP_CONFIG.FUEL_PRICES[brand] || 270.00,
                opening_hours: tags.opening_hours || 'N/A',
                operator: tags.operator || tags.brand || brand
            };
        }).filter(station => station !== null);
    }

    determineBrand(tags) {
        let brand = tags.brand || tags.operator || tags.name || '';
        
        // Handle Urdu brand names
        if (/پاکستان اسٹیٹ آئل|پی ایس او|پی،ایس،او/i.test(brand)) return 'PSO';
        if (/شیل/i.test(brand)) return 'Shell';
        if (/طوطال|ٹوٹل|ٹوٹل پارکو/i.test(brand)) return 'Total';
        if (/اٹک|اٹک پیٹرولیم/i.test(brand)) return 'Attock';
        if (/ہیسکول/i.test(brand)) return 'Hascol';
        if (/کیلٹیکس/i.test(brand)) return 'Caltex';

        // Handle English brand names
        const lower = brand.toLowerCase();
        if (lower.includes('pso') || lower.includes('pakistan state oil')) return 'PSO';
        if (lower.includes('shell')) return 'Shell';
        if (lower.includes('total')) return 'Total';
        if (lower.includes('attock')) return 'Attock';
        if (lower.includes('hascol')) return 'Hascol';
        if (lower.includes('caltex')) return 'Caltex';
        if (lower.includes('byco')) return 'Byco';

        return 'PSO'; // Default fallback
    }

    determineServices(tags) {
        const services = ['Petrol'];
        
        if (tags.fuel === 'yes' || tags['fuel:diesel'] === 'yes') services.push('Diesel');
        if (tags['fuel:lpg'] === 'yes') services.push('LPG');
        if (tags.compressed_air === 'yes') services.push('Air Pump');
        if (tags.car_wash === 'yes') services.push('Car Wash');
        if (tags.shop === 'convenience') services.push('Convenience Store');
        if (tags.atm === 'yes') services.push('ATM');
        if (tags.repair === 'yes') services.push('Service Center');

        return services;
    }

    async fetchLocationAnalysis(lat, lng) {
        // This would typically call additional APIs for location analysis
        // For now, returning mock data
        return {
            nearestRoad: 'Main Highway',
            nearestUturn: '0.5km away',
            nearestMall: 'City Center Mall (2.1km)',
            nearestOffice: 'Business Tower (1.8km)',
            nearestSchool: 'Public School (1.2km)',
            nearestHospital: 'General Hospital (3.5km)',
            nearestBank: 'National Bank (0.8km)'
        };
    }
}

// =============================================================================
// UI MANAGER - User Interface Updates
// =============================================================================

class UIManager {
    constructor(domManager) {
        this.domManager = domManager;
        this.currentStations = [];
        this.currentFilter = 'all';
    }

    updateStationResults(stations) {
        this.currentStations = stations;
        this.updateStatistics();
        this.updateResultsList();
        this.updateSiteAnalysis();
    }

    updateStatistics() {
        const psoStations = this.currentStations.filter(s => s.brand.toLowerCase() === 'pso');
        const competitorStations = this.currentStations.filter(s => s.brand.toLowerCase() !== 'pso');
        const total = this.currentStations.length;
        const coverage = total > 0 ? Math.round((psoStations.length / total) * 100) : 0;

        const stats = {
            psoCount: psoStations.length,
            competitorCount: competitorStations.length,
            totalCount: total,
            coverage: coverage
        };

        this.domManager.updateStatistics(stats);
        
        // Update card states
        this.updateCardStates(total === 0);
    }

    updateCardStates(noData) {
        const statCards = document.querySelectorAll('.stat-card');
        statCards.forEach(card => {
            if (noData) {
                card.classList.add('no-data');
            } else {
                card.classList.remove('no-data');
            }
        });
    }

    updateResultsList() {
        const resultsList = this.domManager.getElement('resultsList');
        
        if (this.currentStations.length === 0) {
            resultsList.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-search text-3xl mb-3 opacity-50"></i>
                    <p class="text-base font-medium">No stations found</p>
                    <p class="text-sm">Try adjusting your search parameters</p>
                </div>
            `;
            return;
        }

        let filteredStations = this.filterStations();
        filteredStations.sort((a, b) => a.distance - b.distance);

        if (filteredStations.length === 0) {
            const filterName = this.currentFilter === 'competitor' ? 'competitor' : this.currentFilter;
            resultsList.innerHTML = `
                <div class="text-center py-6 text-gray-500">
                    <i class="fas fa-filter text-2xl mb-2 opacity-50"></i>
                    <p class="text-sm font-medium">No ${filterName} stations found</p>
                    <p class="text-xs">Try a different filter</p>
                </div>
            `;
            return;
        }

        const html = filteredStations.map(station => this.createStationCard(station)).join('');
        resultsList.innerHTML = html;
    }

    filterStations() {
        switch (this.currentFilter) {
            case 'pso':
                return this.currentStations.filter(s => s.brand.toLowerCase() === 'pso');
            case 'competitor':
                return this.currentStations.filter(s => s.brand.toLowerCase() !== 'pso');
            default:
                return this.currentStations;
        }
    }

    createStationCard(station) {
        const isPSO = station.brand.toLowerCase() === 'pso';
        const brandClass = isPSO ? 'border-l-green-600 bg-gradient-to-r from-green-50' : 'border-l-red-600 bg-gradient-to-r from-red-50';
        
        return `
            <div class="station-card ${brandClass} to-white bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-100 border-l-4 transition-all duration-200 cursor-pointer hover:shadow-md hover:-translate-y-0.5" 
                 onclick="window.fuelStationFinder.focusStation(${station.lat}, ${station.lng})">
                
                <!-- Header: Station Name & Brand -->
                <div class="flex justify-between items-center mb-3">
                    <h4 class="text-base font-bold text-pso-primary leading-tight flex-1 pr-2">${station.name}</h4>
                    <span class="px-2 py-1 rounded-md text-xs font-bold whitespace-nowrap ${isPSO ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                        ${station.brand}
                    </span>
                </div>
                
                <!-- Main Info Grid -->
                <div class="grid grid-cols-2 gap-x-4 gap-y-2 mb-3 text-sm">
                    <div class="flex items-center gap-2">
                        <i class="fas fa-map-marker-alt text-pso-primary text-xs"></i>
                        <span class="font-semibold">${station.distance.toFixed(1)} km</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <i class="fas fa-money-bill-wave text-green-600 text-xs"></i>
                        <span class="font-semibold">Rs. ${station.price}/L</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <i class="fas fa-star text-yellow-500 text-xs"></i>
                        <span>${station.rating.toFixed(1)}/5</span>
                    </div>
                    ${station.phone !== 'N/A' ? `
                    <div class="flex items-center gap-2">
                        <i class="fas fa-phone text-blue-600 text-xs"></i>
                        <span class="text-xs truncate">${station.phone}</span>
                    </div>
                    ` : `
                    <div></div>
                    `}
                </div>
                
                <!-- Services Tags -->
                <div class="flex flex-wrap gap-1">
                    ${station.services.slice(0, 4).map(service => 
                        `<span class="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium">${service}</span>`
                    ).join('')}
                    ${station.services.length > 4 ? 
                        `<span class="bg-gray-200 text-gray-600 px-2 py-1 rounded text-xs">+${station.services.length - 4} more</span>`
                    : ''}
                </div>
                
            </div>
        `;
    }

    updateSiteAnalysis() {
        // Mock site analysis data
        const analysisData = {
            hospitals: Math.floor(Math.random() * 5),
            restaurants: Math.floor(Math.random() * 15),
            educational: Math.floor(Math.random() * 8),
            malls: Math.floor(Math.random() * 3),
            clinics: Math.floor(Math.random() * 10),
            banks: Math.floor(Math.random() * 6)
        };

        this.domManager.getElement('countHospitals').textContent = analysisData.hospitals;
        this.domManager.getElement('countRestaurants').textContent = analysisData.restaurants;
        this.domManager.getElement('countEducational').textContent = analysisData.educational;
        this.domManager.getElement('countMalls').textContent = analysisData.malls;
        this.domManager.getElement('countClinics').textContent = analysisData.clinics;
        this.domManager.getElement('countBanks').textContent = analysisData.banks;

        this.domManager.getElement('siteAnalysisContainer').classList.remove('hidden');
    }

    setFilter(filter) {
        this.currentFilter = filter;
        this.domManager.updateFilterButtons(filter);
        this.updateResultsList();
    }

    async updateLocationAnalysis(lat, lng) {
        const locationSection = this.domManager.getElement('locationAnalysisSection');
        locationSection.classList.remove('hidden');
        locationSection.innerHTML = `
            <div class="animate-pulse">
                <div class="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div class="space-y-2">
                    <div class="h-3 bg-gray-200 rounded w-full"></div>
                    <div class="h-3 bg-gray-200 rounded w-5/6"></div>
                    <div class="h-3 bg-gray-200 rounded w-4/6"></div>
                </div>
            </div>
        `;

        try {
            // In a real implementation, this would call the location analysis API
            setTimeout(() => {
                locationSection.innerHTML = `
                    <h3 class="text-xl font-bold text-pso-primary mb-4 flex items-center gap-2">
                        <i class="fas fa-map-signs"></i>
                        Location Analysis
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div><strong>Nearest Road:</strong> Main Highway (0.2km)</div>
                        <div><strong>Nearest U-turn:</strong> 0.5km away</div>
                        <div><strong>Nearest Mall:</strong> City Center (2.1km)</div>
                        <div><strong>Nearest Hospital:</strong> General Hospital (3.5km)</div>
                        <div><strong>Nearest School:</strong> Public School (1.2km)</div>
                        <div><strong>Nearest Bank:</strong> National Bank (0.8km)</div>
                    </div>
                `;
            }, 1500);
        } catch (error) {
            locationSection.innerHTML = `
                <div class="error text-red-600 text-center py-4">
                    <i class="fas fa-exclamation-triangle mb-2"></i>
                    <p>Error loading location analysis</p>
                </div>
            `;
        }
    }
}

// =============================================================================
// EXPORT MANAGER - Handle Excel & Image Exports
// =============================================================================

class ExportManager {
    constructor(domManager, mapManager) {
        this.domManager = domManager;
        this.mapManager = mapManager;
    }

    async exportToExcel(stations) {
        if (!stations || stations.length === 0) {
            Utils.showNotification('No station data to export!', 'warning');
            return;
        }

        // Check if XLSX library is available
        if (typeof XLSX === 'undefined') {
            Utils.showNotification('Excel export library not available. Please refresh the page.', 'error');
            return;
        }

        try {
            const data = stations.map(station => ({
                Name: station.name,
                Brand: station.brand,
                Latitude: station.lat,
                Longitude: station.lng,
                Distance_km: station.distance.toFixed(2),
                Address: station.address,
                Phone: station.phone,
                Services: station.services.join(', '),
                Price_PKR: station.price,
                Opening_Hours: station.opening_hours,
                Operator: station.operator,
                Rating: station.rating.toFixed(1)
            }));

            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Fuel Stations');
            
            const filename = `fuel_stations_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, filename);
            
            Utils.showNotification('Excel export completed successfully!', 'success');
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            Utils.showNotification('Error exporting to Excel', 'error');
        }
    }

    async exportMapAsImage() {
        const mapContainer = this.domManager.getElement('mapContainer');
        
        if (!mapContainer) {
            Utils.showNotification('Map not found for export', 'error');
            return;
        }

        // Check if dom-to-image library is available
        if (typeof domtoimage === 'undefined') {
            Utils.showNotification('Image export library not available. Please refresh the page.', 'error');
            return;
        }

        try {
            // Temporarily resize for better export quality
            const originalWidth = mapContainer.style.width;
            const originalHeight = mapContainer.style.height;
            
            mapContainer.style.width = '1200px';
            mapContainer.style.height = '800px';
            
            // Check if map exists before calling invalidateSize
            if (this.mapManager.map) {
                this.mapManager.map.invalidateSize();
            }

            // Wait for map to adjust
            setTimeout(async () => {
                try {
                    const blob = await domtoimage.toBlob(mapContainer, {
                        quality: 0.95,
                        filter: (node) => {
                            // Exclude controls and popups
                            return !(node.classList && (
                                node.classList.contains('leaflet-control') ||
                                node.classList.contains('leaflet-popup')
                            ));
                        }
                    });

                    // Restore original size
                    mapContainer.style.width = originalWidth;
                    mapContainer.style.height = originalHeight;
                    if (this.mapManager.map) {
                        this.mapManager.map.invalidateSize();
                    }

                    // Download the image
                    const link = document.createElement('a');
                    link.download = `fuel_stations_map_${new Date().toISOString().split('T')[0]}.png`;
                    link.href = URL.createObjectURL(blob);
                    link.click();
                    
                    Utils.showNotification('Map export completed successfully!', 'success');
                } catch (error) {
                    console.error('Error exporting map:', error);
                    Utils.showNotification('Error exporting map image', 'error');
                    
                    // Restore size on error
                    mapContainer.style.width = originalWidth;
                    mapContainer.style.height = originalHeight;
                    if (this.mapManager.map) {
                        this.mapManager.map.invalidateSize();
                    }
                }
            }, 500);

        } catch (error) {
            console.error('Error preparing map export:', error);
            Utils.showNotification('Error preparing map for export', 'error');
        }
    }
}

// =============================================================================
// MAIN APPLICATION CLASS
// =============================================================================

class FuelStationFinder {
    constructor() {
        this.domManager = new DOMManager();
        this.mapManager = new MapManager(this.domManager);
        this.stationFetcher = new StationFetcher();
        this.uiManager = new UIManager(this.domManager);
        this.exportManager = new ExportManager(this.domManager, this.mapManager);
        
        this.currentStations = [];
        this.isInitialized = false;
    }

    async init() {
        try {
            await this.mapManager.initMap();
            this.setupEventListeners();
            this.isInitialized = true;
            Utils.showNotification('Application initialized successfully!', 'success');
        } catch (error) {
            console.error('Error initializing application:', error);
            Utils.showNotification('Error initializing application', 'error');
        }
    }

    setupEventListeners() {
        // Search functionality
        this.domManager.getElement('searchBtn').addEventListener('click', () => {
            this.searchStations();
        });

        // Focus mode toggle
        this.domManager.getElement('focusModeBtn').addEventListener('click', () => {
            this.mapManager.toggleFocusMode();
        });

        // Trading area generation
        this.domManager.getElement('tradingAreaBtn').addEventListener('click', () => {
            this.generateTradingArea();
        });

        // Edit mode toggle
        this.domManager.getElement('editMapBtn').addEventListener('click', () => {
            this.mapManager.toggleEditMode();
        });

        // Export functionality
        this.domManager.getElement('exportExcelBtn').addEventListener('click', () => {
            this.exportManager.exportToExcel(this.currentStations);
        });

        this.domManager.getElement('exportMapBtn').addEventListener('click', () => {
            this.exportManager.exportMapAsImage();
        });

        // Filter buttons
        this.domManager.getElement('filterButtons').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.target.textContent.toLowerCase();
                const filterValue = filter === 'competitors' ? 'competitor' : filter;
                this.uiManager.setFilter(filterValue);
            });
        });

        // Input validation
        this.setupInputValidation();
    }

    setupInputValidation() {
        const inputs = ['latInput', 'lngInput', 'radiusInput'];
        inputs.forEach(inputKey => {
            const input = this.domManager.getElement(inputKey);
            if (input) {
                input.addEventListener('input', Utils.debounce(() => {
                    this.validateInput(input);
                }, 300));
            }
        });
    }

    validateInput(input) {
        const value = parseFloat(input.value);
        const isValid = !isNaN(value) && isFinite(value);
        
        if (isValid) {
            input.classList.remove('border-red-500');
            input.classList.add('border-gray-200');
        } else {
            input.classList.add('border-red-500');
            input.classList.remove('border-gray-200');
        }
    }

    async searchStations() {
        if (!this.isInitialized) {
            Utils.showNotification('Application is still initializing...', 'warning');
            return;
        }

        const searchParams = this.validateSearchInputs();
        if (!searchParams) return;

        this.domManager.setLoadingState(true);
        this.domManager.showLoadingResults();
        this.clearPreviousResults();

        try {
            const stations = await this.stationFetcher.fetchFuelStations(
                searchParams.lat, 
                searchParams.lng, 
                searchParams.radius
            );

            if (stations.length === 0) {
                this.domManager.showNoResults(searchParams.radius);
                this.uiManager.updateStationResults([]);
                return;
            }

            // Update map and UI
            this.mapManager.clearMap();
            this.mapManager.addSearchMarker(searchParams.lat, searchParams.lng);
            this.mapManager.addRadiusCircle(searchParams.lat, searchParams.lng, searchParams.radius);

            stations.forEach(station => {
                this.mapManager.addStationMarker(station, searchParams.lat, searchParams.lng);
            });

            this.mapManager.setMapView(searchParams.lat, searchParams.lng, 14);
            
            this.currentStations = stations;
            this.uiManager.updateStationResults(stations);
            
            // Update location analysis
            this.updateLocationStatus(searchParams.lat, searchParams.lng);
            this.uiManager.updateLocationAnalysis(searchParams.lat, searchParams.lng);

            Utils.showNotification(`Found ${stations.length} fuel stations!`, 'success');

        } catch (error) {
            console.error('Error in search:', error);
            this.domManager.showError(error.message || 'Error loading fuel stations');
        } finally {
            this.domManager.setLoadingState(false);
        }
    }

    validateSearchInputs() {
        const lat = parseFloat(this.domManager.getElement('latInput').value);
        const lng = parseFloat(this.domManager.getElement('lngInput').value);
        const radius = parseFloat(this.domManager.getElement('radiusInput').value);

        if (isNaN(lat) || isNaN(lng) || isNaN(radius)) {
            Utils.showNotification('Please enter valid coordinates and radius', 'warning');
            return null;
        }

        if (radius <= 0 || radius > 50) {
            Utils.showNotification('Radius must be between 1 and 50 km', 'warning');
            return null;
        }

        if (lat < -90 || lat > 90) {
            Utils.showNotification('Latitude must be between -90 and 90 degrees', 'warning');
            return null;
        }

        if (lng < -180 || lng > 180) {
            Utils.showNotification('Longitude must be between -180 and 180 degrees', 'warning');
            return null;
        }

        return { lat, lng, radius };
    }

    clearPreviousResults() {
        this.domManager.getElement('siteAnalysisContainer').classList.add('hidden');
        this.domManager.getElement('locationAnalysisSection').classList.add('hidden');
    }

    updateLocationStatus(lat, lng) {
        const statusElement = this.domManager.getElement('siteStatusBelow').querySelector('div');
        statusElement.innerHTML = `
            <i class="fas fa-map-marked-alt mr-2"></i>
            Location: <strong>${lat.toFixed(4)}, ${lng.toFixed(4)}</strong> 
            &nbsp;|&nbsp; 
            Area Type: <strong>Urban Commercial</strong>
        `;
    }

    focusStation(lat, lng) {
        this.mapManager.setMapView(lat, lng, 16);
    }

    generateTradingArea() {
        if (!this.currentStations || this.currentStations.length === 0) {
            Utils.showNotification('Please search for fuel stations first!', 'warning');
            return;
        }

        Utils.showNotification('Trading area analysis feature is in development', 'info');
        // TODO: Implement trading area visualization
    }
}

// =============================================================================
// APPLICATION INITIALIZATION
// =============================================================================

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    const loadingScreen = document.getElementById('app-loading');
    const appContent = document.getElementById('app-content');
    
    try {
        // Wait for required libraries to load
        console.log('Checking for required libraries...');
        const librariesLoaded = await DependencyChecker.waitForLibraries(15, 500);
        
        if (!librariesLoaded) {
            const missing = DependencyChecker.checkRequiredLibraries();
            console.error('Required libraries failed to load:', missing);
            
            // Hide loading screen and show error
            if (loadingScreen) loadingScreen.style.display = 'none';
            DependencyChecker.showDependencyError(missing);
            return;
        }
        
        console.log('All required libraries loaded successfully');
        
        // Initialize the main application
        window.fuelStationFinder = new FuelStationFinder();
        await window.fuelStationFinder.init();
        
        // Hide loading screen and show app content
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
        if (appContent) {
            appContent.classList.remove('hidden');
        }
        
    } catch (error) {
        console.error('Failed to initialize Fuel Station Finder:', error);
        
        // Hide loading screen
        if (loadingScreen) loadingScreen.style.display = 'none';
        
        // Show user-friendly error message
        const errorHTML = `
            <div class="min-h-screen flex items-center justify-center bg-red-50">
                <div class="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
                    <i class="fas fa-exclamation-triangle text-red-500 text-4xl mb-4"></i>
                    <h1 class="text-xl font-bold text-gray-800 mb-2">Application Error</h1>
                    <p class="text-gray-600 mb-4">Failed to initialize the application: ${error.message}</p>
                    <button onclick="location.reload()" class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors">
                        Reload Page
                    </button>
                </div>
            </div>
        `;
        document.body.innerHTML = errorHTML;
    }
});

// Global functions for backward compatibility and HTML onclick handlers
window.searchStations = () => {
    if (window.fuelStationFinder) {
        window.fuelStationFinder.searchStations();
    } else {
        console.warn('Application not initialized yet');
    }
};

window.toggleFocusMode = () => {
    if (window.fuelStationFinder?.mapManager) {
        window.fuelStationFinder.mapManager.toggleFocusMode();
    } else {
        console.warn('Map manager not available');
    }
};

window.generateTradingArea = () => {
    if (window.fuelStationFinder) {
        window.fuelStationFinder.generateTradingArea();
    } else {
        console.warn('Application not initialized yet');
    }
};

window.toggleEditMode = () => {
    if (window.fuelStationFinder?.mapManager) {
        window.fuelStationFinder.mapManager.toggleEditMode();
    } else {
        console.warn('Map manager not available');
    }
};

window.exportStationsToExcel = () => {
    if (window.fuelStationFinder?.exportManager) {
        window.fuelStationFinder.exportManager.exportToExcel(window.fuelStationFinder.currentStations);
    } else {
        console.warn('Export manager not available');
    }
};

window.exportMapAsImage = () => {
    if (window.fuelStationFinder?.exportManager) {
        window.fuelStationFinder.exportManager.exportMapAsImage();
    } else {
        console.warn('Export manager not available');
    }
};

window.filterResults = (filter) => {
    if (window.fuelStationFinder?.uiManager) {
        window.fuelStationFinder.uiManager.setFilter(filter);
    } else {
        console.warn('UI manager not available');
    }
};

// Edit mode helper functions (simplified)
window.setAddType = (type) => {
    console.log(`Add ${type} mode activated`);
    // TODO: Implement add functionality
};

window.disableEditMode = () => {
    if (window.fuelStationFinder?.mapManager) {
        window.fuelStationFinder.mapManager.toggleEditMode();
    } else {
        console.warn('Map manager not available');
    }
};