// ========================================
// MAP ANALYZER V2 - HTML Independent
// ========================================
// This module analyzes fuel stations using EXACT same logic as map.js but without HTML dependencies

class MapAnalyzerV2 {
    constructor() {
        // Copy exact same config from map.js
        this.APP_CONFIG = {
            OVERPASS_API: 'https://overpass-api.de/api/interpreter',
            OVERPASS_TIMEOUT: 30,
            ALLOWED_BRANDS: ['pso', 'shell', 'total', 'attock', 'hascol', 'caltex', 'byco'],
            FUEL_PRICES: {
                'PSO': 272.5,
                'Shell': 275.0,
                'Total': 274.0,
                'Attock': 273.5,
                'Hascol': 273.0,
                'Caltex': 274.5,
                'Byco': 271.0
            },
            MARKER_SIZE: 40,
            BRAND_LOGOS: {
                'PSO': 'assets/logos/pso.png',
                'Shell': 'assets/logos/shell.png',
                'Total': 'assets/logos/total.png',
                'Attock': 'assets/logos/attock.png',
                'Hascol': 'assets/logos/hascol.png',
                'Caltex': 'assets/logos/caltex.png',
                'Byco': 'assets/logos/byco.png'
            }
        };

        this.storageManager = new StorageManager();
        
        // Copy exact same Utils from map.js
        this.Utils = {
            calculateDistance(lat1, lng1, lat2, lng2) {
                const R = 6371; // Earth's radius in kilometers
                const dLat = (lat2 - lat1) * Math.PI / 180;
                const dLng = (lng2 - lng1) * Math.PI / 180;
                const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                    Math.sin(dLng / 2) * Math.sin(dLng / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                return R * c;
            },

            formatAddress(tags) {
                const parts = [];
                if (tags['addr:street']) parts.push(tags['addr:street']);
                if (tags['addr:city']) parts.push(tags['addr:city']);
                if (tags['addr:state']) parts.push(tags['addr:state']);
                return parts.length > 0 ? parts.join(', ') : 'Address not available';
            }
        };

        // Initialize StationFetcher with exact same logic from map.js
        this.stationFetcher = new this.StationFetcher(this);
    }

    // Main analysis function - Uses EXACT same logic as map.js
    async analyzeLocation(lat, lng, radius) {
        try {
            console.log('⛽ MapAnalyzerV2: Starting analysis with exact map.js logic for', lat, lng, radius);
            
            // Use the exact same StationFetcher as map.js
            const stations = await this.stationFetcher.fetchFuelStations(lat, lng, radius);
            console.log('📊 MapAnalyzerV2: Fetched', stations.length, 'stations using map.js logic');
            
            // Create filtered stations array exactly like map.js does
            const filteredStations = stations; // In map.js: filteredStations = stations
            
            // Calculate statistics the same way as map.js using filtered stations
            const statistics = this.calculateStatisticsLikeMapJS(filteredStations);
            
            // Save data to storage exactly like map.js does
            const mapData = {
                // Same structure as map.js expects
                stations: stations,
                filteredStations: filteredStations, // Add filtered stations like map.js
                coordinates: { latitude: lat, longitude: lng, radius: radius },
                searchRadius: radius,
                searchCoordinates: { lat, lng },
                statistics: statistics,
                totalStations: filteredStations.length, // Use filtered count
                analysis: statistics,
                timestamp: new Date().toISOString(),
                generatedBy: 'MapAnalyzerV2_ExactMapJS'
            };
            
            // Store using StorageManager (same as map.js saveMapDataToStorage)
            await this.storageManager.setMapData(mapData);
            console.log('✅ MapAnalyzerV2: Used exact map.js logic successfully');
            return mapData;
            
        } catch (error) {
            console.error('❌ MapAnalyzerV2: Error in analysis:', error);
            throw error;
        }
    }
    
    // Copy exact same StationFetcher class from map.js
    StationFetcher = class {
        constructor(parent) {
            this.cache = new Map();
            this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
            this.parent = parent;
        }

        async fetchFuelStations(lat, lng, radius) {
            const cacheKey = `${lat.toFixed(4)}_${lng.toFixed(4)}_${radius}`;

            // Check cache first
            if (this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheExpiry) {
                    console.log('Using cached data');
                    return cached.data;
                }
            }

            const query = this.buildOverpassQuery(lat, lng, radius);

            try {
                console.log('Fetching data from Overpass API...');
                const response = await fetch(this.parent.APP_CONFIG.OVERPASS_API, {
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
                console.log('Raw API response:', data);

                const stations = this.processStationData(data.elements, lat, lng, radius);
                console.log('Processed stations:', stations);

                // Cache the results
                this.cache.set(cacheKey, {
                    data: stations,
                    timestamp: Date.now()
                });

                return stations;

            } catch (error) {
                console.error('Error fetching fuel stations:', error);

                // Fallback to mock data if API fails
                console.log('Falling back to mock data...');
                return this.getMockData(lat, lng);
            }
        }

        buildOverpassQuery(lat, lng, radius) {
            return `
                [out:json][timeout:${this.parent.APP_CONFIG.OVERPASS_TIMEOUT}];
                (
                  node["amenity"="fuel"](around:${radius * 1000},${lat},${lng});
                  way["amenity"="fuel"](around:${radius * 1000},${lat},${lng});
                );
                out geom;
            `;
        }

        processStationData(elements, searchLat, searchLng, radius) {
            console.log('Processing elements:', elements?.length || 0);

            if (!elements || elements.length === 0) {
                console.log('No elements found from OSM, using mock data');
                return this.getMockData(searchLat, searchLng);
            }

            const processedStations = [];

            elements.forEach(element => {
                let stationLat, stationLng;

                // Extract coordinates based on element type
                if (element.type === 'node') {
                    stationLat = element.lat;
                    stationLng = element.lon;
                } else if (element.type === 'way' && element.geometry && element.geometry.length > 0) {
                    // For ways, use the first point or calculate centroid
                    if (element.geometry[0].lat && element.geometry[0].lon) {
                        stationLat = element.geometry[0].lat;
                        stationLng = element.geometry[0].lon;
                    } else {
                        // Calculate centroid for ways
                        let latSum = 0, lngSum = 0;
                        element.geometry.forEach(point => {
                            if (point.lat && point.lon) {
                                latSum += point.lat;
                                lngSum += point.lon;
                            }
                        });
                        stationLat = latSum / element.geometry.length;
                        stationLng = lngSum / element.geometry.length;
                    }
                } else {
                    console.log('Skipping element without coordinates:', element.type);
                    return;
                }

                // Validate coordinates
                if (!stationLat || !stationLng || isNaN(stationLat) || isNaN(stationLng)) {
                    console.log('Invalid coordinates for element:', element.id);
                    return;
                }

                const distance = this.parent.Utils.calculateDistance(searchLat, searchLng, stationLat, stationLng);

                // Filter by radius
                if (distance > radius) {
                    console.log(`Station ${element.id} too far: ${distance.toFixed(2)}km > ${radius}km`);
                    return;
                }

                const tags = element.tags || {};

                // STRICT FILTERING - Remove CNG and unknown stations (exact same as map.js)
                const stationName = (tags.name || '').toLowerCase();
                const stationBrand = (tags.brand || '').toLowerCase();
                const stationOperator = (tags.operator || '').toLowerCase();

                // Filter out CNG stations completely
                if (stationName.includes('cng') ||
                    stationBrand.includes('cng') ||
                    stationOperator.includes('cng')) {
                    return; // Skip CNG stations
                }

                const brand = this.determineBrand(tags);

                // Only allow these exact brands - reject everything else (exact same as map.js)
                const allowedBrands = ['PSO', 'Shell', 'Total', 'Attock', 'Hascol', 'Caltex', 'Byco'];
                if (!brand || !allowedBrands.includes(brand)) {
                    return; // Skip unknown/unwanted brands
                }

                const services = this.determineServices(tags);

                const station = {
                    id: element.id,
                    name: tags.name || tags.brand || `${brand} Station`,
                    brand: brand,
                    lat: stationLat,
                    lng: stationLng,
                    distance: distance,
                    address: this.parent.Utils.formatAddress(tags),
                    phone: tags.phone || 'N/A',
                    services: services,
                    rating: 3.5 + Math.random() * 1.5, // Mock rating between 3.5-5
                    price: this.parent.APP_CONFIG.FUEL_PRICES[brand] || 270.00,
                    opening_hours: tags.opening_hours || '24/7',
                    operator: tags.operator || tags.brand || brand,
                    fuels: services
                };

                console.log('Processed station:', station.name, station.brand, `${distance.toFixed(2)}km`);
                processedStations.push(station);
            });

            console.log('Total processed stations:', processedStations.length);

            // If no real stations found, add some mock data
            if (processedStations.length === 0) {
                console.log('No valid stations processed, adding mock data');
                return this.getMockData(searchLat, searchLng);
            }

            // Sort by distance
            processedStations.sort((a, b) => a.distance - b.distance);

            return processedStations;
        }

        // Exact same determineBrand logic from map.js
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

            return 'Unknown'; // Default fallback
        }

        // Exact same determineServices logic from map.js
        determineServices(tags) {
            const services = [];

            // Only include petrol/diesel services, exclude CNG
            if (tags['fuel:octane_91'] === 'yes' || tags['fuel:octane_95'] === 'yes') {
                services.push('Petrol');
            }
            if (tags['fuel:diesel'] === 'yes') {
                services.push('Diesel');
            }

            // Other services (non-fuel)
            if (tags.compressed_air === 'yes') services.push('Air Pump');
            if (tags.car_wash === 'yes') services.push('Car Wash');
            if (tags.shop === 'convenience') services.push('Convenience Store');
            if (tags.atm === 'yes') services.push('ATM');
            if (tags.repair === 'yes') services.push('Service Center');

            // Default to Petrol if no specific fuel types found
            if (services.length === 0) {
                services.push('Petrol');
            }

            return services;
        }

        // Exact same mock data from map.js
        getMockData(lat, lng) {
            return [
                {
                    id: 'mock_1',
                    name: 'پاکستان اسٹیٹ آئل',
                    brand: 'PSO',
                    lat: lat + 0.01,
                    lng: lng + 0.01,
                    distance: 1.2,
                    rating: 4.2,
                    price: 272.5,
                    fuels: ['Petrol', 'Diesel'],
                    address: 'Main Road, Karachi',
                    phone: '+92-21-1234567',
                    services: ['Petrol', 'Diesel', 'ATM']
                },
                {
                    id: 'mock_2',
                    name: 'Total Parco Station',
                    brand: 'Total',
                    lat: lat - 0.01,
                    lng: lng + 0.015,
                    distance: 1.8,
                    rating: 4.0,
                    price: 274.0,
                    fuels: ['Petrol', 'Diesel'],
                    address: 'Commercial Area, Karachi',
                    phone: '+92-21-2345678',
                    services: ['Petrol', 'Diesel', 'Car Wash']
                },
                {
                    id: 'mock_3',
                    name: 'Shell Pakistan',
                    brand: 'Shell',
                    lat: lat + 0.005,
                    lng: lng - 0.012,
                    distance: 0.9,
                    rating: 4.5,
                    price: 275.0,
                    fuels: ['Petrol', 'Diesel', 'LPG'],
                    address: 'Highway, Karachi',
                    phone: '+92-21-3456789',
                    services: ['Petrol', 'Diesel', 'LPG', 'Convenience Store']
                }
            ];
        }
    }

    // Calculate statistics exactly like map.js updateStatistics function
    calculateStatisticsLikeMapJS(stations) {
        const psoCount = stations.filter(s => s.brand === 'PSO').length;
        const competitorCount = stations.length - psoCount;
        const coverage = stations.length > 0 ? Math.round((psoCount / stations.length) * 100) : 0;

        return {
            totalStations: stations.length,
            psoStations: psoCount,
            competitors: competitorCount,
            coverage: coverage + '%',
            marketShare: coverage,
            competitionIntensity: this.calculateCompetitionIntensity(stations.length, psoCount)
        };
    }

    // Helper method for competition intensity
    calculateCompetitionIntensity(total, psoCount) {
        if (total === 0) return 'No Data';
        const competitorRatio = (total - psoCount) / total;
        
        if (competitorRatio < 0.3) return 'Low';
        if (competitorRatio < 0.6) return 'Medium';
        return 'High';
    }
}

// Make the class globally available
window.MapAnalyzerV2 = MapAnalyzerV2;
