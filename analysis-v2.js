// ========================================
// LAND USE ANALYZER V2 - HTML Independent
// ========================================
// This module analyzes land use patterns using EXACT same logic as analysis.js but without HTML dependencies

class LandUseAnalyzerV2 {
    constructor() {
        this.storageManager = new StorageManager();
        this.overpassAPI = 'https://overpass-api.de/api/interpreter';
    }

    // Main analysis function - Uses EXACT same logic as analysis.js
    async analyzeLocation(lat, lng, radius) {
        try {
            console.log('🏗️ LandUseAnalyzerV2: Starting analysis using EXACT analysis.js logic for', lat, lng, radius);
            
            // Use EXACT same query building as analysis.js
            const query = this.buildOverpassQuery(lat, lng, radius);
            console.log('📡 LandUseAnalyzerV2: Built Overpass query');
            
            // Use EXACT same data fetching as analysis.js
            const rawData = await this.fetchOverpassData(query);
            console.log('📊 LandUseAnalyzerV2: Fetched', rawData?.elements?.length || 0, 'elements from Overpass');
            
            // Use EXACT same analysis as analysis.js
            const analysis = this.analyzeLandUse(rawData);
            console.log('📈 LandUseAnalyzerV2: Land use analysis complete');
            
            // Use EXACT same area analysis as analysis.js  
            const areaAnalysis = this.calculateAreaAnalysis(rawData.elements, lat, lng, radius);
            console.log('📐 LandUseAnalyzerV2: Area analysis complete');
            
            // Use EXACT same storage format as analysis.js saveAnalysisDataToStorage
            const analysisData = this.saveAnalysisDataToStorage(lat, lng, radius, analysis, areaAnalysis, rawData);
            
            // Store using StorageManager
            await this.storageManager.setAnalysisData(analysisData);
            console.log('✅ LandUseAnalyzerV2: Used EXACT analysis.js logic successfully');
            return analysisData;
            
        } catch (error) {
            console.error('❌ LandUseAnalyzerV2: Error during analysis:', error);
            throw error;
        }
    }
    
    // Copy EXACT buildOverpassQuery from analysis.js
    buildOverpassQuery(lat, lng, radius) {
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

    // Copy EXACT fetchOverpassData from analysis.js
    async fetchOverpassData(query) {
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

    // Copy EXACT analyzeLandUse from analysis.js
    analyzeLandUse(data) {
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

    // Copy EXACT area analysis logic from analysis.js addLandUseToMap function
    calculateAreaAnalysis(elements, lat, lng, radius) {
        // Use same area calculation logic as analysis.js
        const areaAnalysis = {
            residential: 0,
            commercial: 0,
            industrial: 0,
            other: 0
        };
        
        // Process polygons exactly the same way as analysis.js
        elements.forEach(element => {
            // Handle both ways and relations like the Overpass query fetches them
            if ((element.type === 'way' || element.type === 'relation') && element.geometry && element.geometry.length > 2) {
                const tags = element.tags || {};
                let landUseType = 'other'; // Default to 'other' like analysis.js
                
                // Determine land use type exactly same as analysis.js addLandUseToMap
                if (tags.landuse) {
                    switch (tags.landuse) {
                        case 'residential':
                            landUseType = 'residential';
                            break;
                        case 'commercial':
                        case 'retail':
                            landUseType = 'commercial';
                            break;
                        case 'industrial':
                            landUseType = 'industrial';
                            break;
                        // Note: analysis.js doesn't have a default case for landuse - stays 'other'
                    }
                }
                
                // Override with building type if more specific (exactly same as analysis.js)
                if (tags.building) {
                    switch (tags.building) {
                        case 'residential':
                        case 'apartments':
                        case 'house':
                            landUseType = 'residential';
                            break;
                        case 'commercial':
                        case 'retail':
                        case 'office':
                            landUseType = 'commercial';
                            break;
                        case 'industrial':
                        case 'warehouse':
                            landUseType = 'industrial';
                            break;
                        // Note: analysis.js doesn't have a default case for building - stays whatever was set before
                    }
                }
                
                // Use EXACT same area calculation as analysis.js fallback method
                // (calculateSimplePolygonArea * 1000000)
                const area = this.calculateSimplePolygonArea(element.geometry) * 1000000; // Convert to square meters
                areaAnalysis[landUseType] += area;
            }
        });
        
        console.log('🔍 LandUseAnalyzerV2: Area analysis results:', areaAnalysis);
        return areaAnalysis;
    }

    // Copy EXACT calculateSimplePolygonArea from analysis.js 
    calculateSimplePolygonArea(geometry) {
        if (!geometry || geometry.length < 3) return 0.001; // Default small area
        
        let area = 0;
        for (let i = 0; i < geometry.length - 1; i++) {
            area += (geometry[i].lon * geometry[i + 1].lat) - (geometry[i + 1].lon * geometry[i].lat);
        }
        // Close the polygon if not closed
        const lastPoint = geometry[geometry.length - 1];
        const firstPoint = geometry[0];
        if (lastPoint.lat !== firstPoint.lat || lastPoint.lon !== firstPoint.lon) {
            area += (lastPoint.lon * firstPoint.lat) - (firstPoint.lon * lastPoint.lat);
        }
        
        return Math.abs(area) / 2; // Return area in square degrees (will be converted to square meters)
    }

    // Copy EXACT determineSiteType from analysis.js
    determineSiteType(analysis) {
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

    // Copy EXACT determineDominantLandUse from analysis.js
    determineDominantLandUse(analysis) {
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

    // Copy EXACT saveAnalysisDataToStorage from analysis.js
    saveAnalysisDataToStorage(lat, lng, radius, analysis, areaAnalysis, rawData) {
        try {
            console.log('🔍 LandUseAnalyzerV2: Processing area analysis for percentages:', areaAnalysis);
            
            // Calculate land use percentages from area analysis (same as analysis.js)
            const totalArea = Object.values(areaAnalysis || {}).reduce((sum, area) => sum + area, 0);
            const landUsePercentages = {};
            const landUseCounts = {
                residential: analysis.residential || 0,
                commercial: analysis.commercial || 0,
                industrial: analysis.industrial || 0,
                other: analysis.other || 0
            };
            const landUseAreas = areaAnalysis || {};
            
            console.log('🔍 LandUseAnalyzerV2: Total area:', totalArea);
            console.log('🔍 LandUseAnalyzerV2: Land use areas:', landUseAreas);
            
            if (totalArea > 0) {
                Object.keys(landUseAreas).forEach(landUse => {
                    const percentage = ((landUseAreas[landUse] / totalArea) * 100).toFixed(1); // Use .toFixed(1) like the reports show
                    landUsePercentages[landUse] = percentage;
                    console.log(`🔍 LandUseAnalyzerV2: ${landUse}: ${landUseAreas[landUse]} / ${totalArea} = ${percentage}%`);
                });
            }
            
            console.log('🔍 LandUseAnalyzerV2: Final percentages:', landUsePercentages);

            // Calculate total amenity counts (same as analysis.js)
            const totalAmenities = Object.values(analysis.amenities || {}).reduce((sum, count) => sum + count, 0);
            
            // Calculate total road infrastructure (same as analysis.js)
            const totalRoads = Object.values(analysis.roads || {}).reduce((sum, count) => sum + count, 0);

            const analysisData = {
                // Basic search parameters (same as analysis.js)
                searchCoordinates: {
                    latitude: lat,
                    longitude: lng,
                    radius: radius
                },
                
                // Derived classifications (same as analysis.js)
                siteType: this.determineSiteType(analysis),
                dominantLandUse: this.determineDominantLandUse(analysis),
                
                // Complete element count (same as analysis.js)
                totalElements: rawData?.elements?.length || 0,
                
                // Coordinates for reference (same as analysis.js)
                coordinates: {
                    center: { lat, lng },
                    radius: radius,
                    analysisArea: Math.PI * Math.pow(radius * 1000, 2) // in square meters
                },
                
                // Comprehensive land use data (same as analysis.js)
                landUse: {
                    counts: landUseCounts,
                    areas: landUseAreas,
                    percentages: landUsePercentages,
                    totalArea: totalArea,
                    dominantType: this.determineDominantLandUse(analysis)
                },
                
                // Complete amenities data with details (same as analysis.js)
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
                
                // Road infrastructure data (same as analysis.js)
                roads: {
                    counts: analysis.roads || {},
                    totalCount: totalRoads,
                    classification: this.determineSiteType(analysis),
                    // Road density per km²
                    density: totalRoads / (Math.PI * Math.pow(radius, 2))
                },
                
                // Raw OSM data summary (same as analysis.js)
                rawOSMData: {
                    elementCount: rawData?.elements?.length || 0,
                    lastQueried: new Date().toISOString(),
                    dataTypes: {
                        nodes: rawData?.elements?.filter(el => el.type === 'node').length || 0,
                        ways: rawData?.elements?.filter(el => el.type === 'way').length || 0,
                        relations: rawData?.elements?.filter(el => el.type === 'relation').length || 0
                    }
                },
                
                // Analysis summary and scores (same as analysis.js)
                summary: {
                    landUseScore: this.calculateLandUseScore(analysis),
                    amenityScore: this.calculateAmenityScore(analysis),
                    accessibilityScore: this.calculateAccessibilityScore(analysis),
                    overallDiversity: this.calculateDiversityIndex(analysis),
                    analysisRadius: radius,
                    centerPoint: { lat, lng },
                    hasAreaAnalysis: !!areaAnalysis && totalArea > 0,
                    dataQuality: rawData?.elements?.length > 0 ? 'Good' : 'Limited'
                },
                
                // Store polygon data for visual recreation (same as analysis.js)
                landUsePolygons: {},
                
                // Complete metadata (same as analysis.js)
                metadata: {
                    analysisTimestamp: new Date().toISOString(),
                    dataSource: 'Overpass API (OpenStreetMap)',
                    module: 'analysis',
                    version: '2.0',
                    queryType: 'Land Use Analysis with Amenities',
                    processingTime: new Date().toISOString(),
                    lastUpdated: new Date().toISOString()
                },
                
                // Generation info
                timestamp: new Date().toISOString(),
                generatedBy: 'LandUseAnalyzerV2_ExactAnalysisJS'
            };

            console.log('✅ Complete analysis data prepared using analysis.js format:', analysisData);
            return analysisData;
            
        } catch (error) {
            console.error('❌ Error preparing analysis data:', error);
            throw error;
        }
    }

    // Copy EXACT scoring functions from analysis.js
    calculateLandUseScore(analysis) {
        const total = (analysis.residential || 0) + (analysis.commercial || 0) + (analysis.industrial || 0) + (analysis.other || 0);
        if (total === 0) return 0;
        
        // Score based on land use diversity (higher diversity = higher score)
        const types = [analysis.residential, analysis.commercial, analysis.industrial, analysis.other].filter(count => count > 0).length;
        return Math.min((types / 4) * 100, 100);
    }

    calculateAmenityScore(analysis) {
        const amenities = analysis.amenities || {};
        const totalAmenities = Object.values(amenities).reduce((sum, count) => sum + count, 0);
        
        if (totalAmenities === 0) return 0;
        
        // Score based on amenity diversity and count
        const amenityTypes = Object.keys(amenities).filter(key => amenities[key] > 0).length;
        const countScore = Math.min(totalAmenities * 2, 60); // Max 60 points for count
        const diversityScore = Math.min(amenityTypes * 8, 40); // Max 40 points for diversity
        
        return Math.min(countScore + diversityScore, 100);
    }

    calculateAccessibilityScore(analysis) {
        const roads = analysis.roads || {};
        const totalRoads = Object.values(roads).reduce((sum, count) => sum + count, 0);
        
        if (totalRoads === 0) return 0;
        
        // Weighted scoring based on road importance
        const score = (roads.highways || 0) * 30 + (roads.primary || 0) * 20 + (roads.secondary || 0) * 10;
        return Math.min(score, 100);
    }

    calculateDiversityIndex(analysis) {
        // Shannon diversity index for land use
        const landUseCounts = [analysis.residential || 0, analysis.commercial || 0, analysis.industrial || 0, analysis.other || 0];
        const total = landUseCounts.reduce((sum, count) => sum + count, 0);
        
        if (total === 0) return 0;
        
        let diversity = 0;
        landUseCounts.forEach(count => {
            if (count > 0) {
                const proportion = count / total;
                diversity -= proportion * Math.log2(proportion);
            }
        });
        
        return parseFloat(diversity.toFixed(2));
    }
}

// Make the class globally available
window.LandUseAnalyzerV2 = LandUseAnalyzerV2;
