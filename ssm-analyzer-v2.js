// ========================================
// SSM ANALYZER V2 - HTML Independent
// ========================================
// This module performs Site Selection Metrics analysis and stores data without HTML dependencies

class SSMAnalyzerV2 {
    constructor() {
        this.storageManager = new StorageManager();
        this.overpassAPI = 'https://overpass-api.de/api/interpreter';
        this.requestDelay = 1500; // 1.5 seconds between requests
        this.lastRequestTime = 0;
        // Initialize unified data generator for consistent results
        this.dataGenerator = new UnifiedDataGenerator();
        
        // PSO Official Scoring System
        this.psoScoring = {
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
        
        // Category Thresholds
        this.categoryThresholds = {
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
    }

    // Main analysis function - Uses SAME logic as ssm.js
    async analyzeLocation(lat, lng, radius) {
        try {
            console.log('📊 SSMAnalyzerV2: Starting analysis using ssm.js functions for', lat, lng, radius);
            
            // Try to use the same functions as ssm.js
            if (typeof window.performSSMAnalysisForStorage === 'function') {
                
                // Use ssm.js function for analysis (it handles everything internally)
                const ssmData = await window.performSSMAnalysisForStorage(lat, lng, radius);
                
                console.log('📊 SSMAnalyzerV2: Using ssm.js functions, got data:', ssmData);
                
                // Store the data using StorageManager (data is already in correct format from ssm.js)
                await this.storageManager.setSSMData(ssmData);
                
                console.log('✅ SSMAnalyzerV2: Used ssm.js functions successfully');
                return ssmData;
                
            } else {
                // Fallback to original analyzer logic
                console.log('⚠️ SSMAnalyzerV2: ssm.js functions not available, using fallback');
                return await this.analyzeLocationFallback(lat, lng, radius);
            }
            
        } catch (error) {
            console.error('❌ SSMAnalyzerV2: Error during analysis, using fallback:', error);
            return await this.analyzeLocationFallback(lat, lng, radius);
        }
    }
    
    // Fallback method using original SSM logic
    async analyzeLocationFallback(lat, lng, radius) {
        try {
            console.log('📊 SSMAnalyzerV2: Using fallback analysis for', lat, lng, radius);
            
            // Auto-detect site type
            const siteType = await this.autoDetectSiteType(lat, lng);
            
            // Perform comprehensive analysis
            const analysisResults = await this.executeComprehensiveAnalysis(lat, lng, radius, siteType);
            
            // Calculate PSO scores
            const psoScores = this.calculatePSOScores(analysisResults, siteType);
            
            // Determine site category
            const siteCategory = this.determineSiteCategory(psoScores.total);
            
            // Prepare final data structure in same format as ssm.js saveSSMDataToStorage
            const ssmData = this.generateSSMDataLikeSSMJS(lat, lng, radius, siteType, analysisResults, psoScores, siteCategory);
            
            // Store in storage manager using the specialized method
            await this.storageManager.setSSMData(ssmData);
            
            console.log('✅ SSMAnalyzerV2: Fallback analysis completed and stored');
            return ssmData;
            
        } catch (error) {
            console.error('❌ SSMAnalyzerV2: Error during fallback analysis, using unified fallback:', error);
            
            // Use unified data generator for consistent fallback data
            const unifiedSSMData = this.dataGenerator.generateConsistentSSMData(lat, lng, radius);
            
            // Format data for StorageManager compatibility
            const ssmData = {
                searchCoordinates: {
                    latitude: lat,
                    longitude: lng,
                    radius: radius
                },
                siteClassification: {
                    category: unifiedSSMData.category,
                    score: unifiedSSMData.totalScore,
                    level: this.categoryThresholds[unifiedSSMData.category]?.name || unifiedSSMData.category,
                    type: unifiedSSMData.siteType
                },
                siteType: unifiedSSMData.siteType,
                siteCategory: this.categoryThresholds[unifiedSSMData.category]?.name || unifiedSSMData.category,
                categoryLevel: unifiedSSMData.category,
                finalScore: unifiedSSMData.totalScore,
                totalScore: unifiedSSMData.totalScore,
                category: this.categoryThresholds[unifiedSSMData.category]?.name || unifiedSSMData.category,
                scores: unifiedSSMData.scores,
                competition: unifiedSSMData.competition,
                timestamp: new Date().toISOString(),
                generatedBy: 'SSMAnalyzerV2_UnifiedFallback'
            };
            
            // Store the data
            await this.storageManager.setSSMData(ssmData);
            
            return ssmData;
        }
    }

    // Auto-detect site type based on location characteristics
    async autoDetectSiteType(lat, lng) {
        try {
            const query = `
                [out:json][timeout:15];
                (
                    way["highway"~"^(trunk|primary|motorway|trunk_link|primary_link)$"](around:2000,${lat},${lng});
                    nwr["amenity"="fuel"](around:1000,${lat},${lng});
                    nwr["landuse"~"^(commercial|industrial|retail)$"](around:1000,${lat},${lng});
                );
                out geom;
            `;

            const response = await this.makeRateLimitedRequest(query);
            const elements = response.elements || [];

            // Analyze for highway proximity
            const highways = elements.filter(e => 
                e.tags?.highway && 
                ['trunk', 'primary', 'motorway', 'trunk_link', 'primary_link'].includes(e.tags.highway)
            );

            // Analyze for urban characteristics
            const fuelStations = elements.filter(e => e.tags?.amenity === 'fuel');
            const commercialAreas = elements.filter(e => e.tags?.landuse === 'commercial');

            // Decision logic
            if (highways.length > 2 && fuelStations.length < 3) {
                return 'HIGHWAY';
            } else if (commercialAreas.length > 3 || fuelStations.length > 5) {
                return 'CITY';
            } else {
                return 'CITY'; // Default to city for mixed scenarios
            }

        } catch (error) {
            console.log('Site type detection failed, defaulting to CITY');
            return 'CITY';
        }
    }

    // Generate SSM data in same format as ssm.js saveSSMDataToStorage
    generateSSMDataLikeSSMJS(lat, lng, radius, siteType, analysisResults, psoScores, siteCategory) {
        const traffic = analysisResults.traffic;
        const competition = analysisResults.competition;
        const land = analysisResults.land;
        const socioEconomic = analysisResults.socioEconomic;

        return {
            // Basic search parameters (same as ssm.js)
            searchCoordinates: {
                latitude: lat,
                longitude: lng,
                radius: radius
            },
            
            // Site Classification Result (same format as ssm.js)
            siteClassification: {
                category: siteCategory.name,
                categoryCode: siteCategory.name.match(/\((.*?)\)/)?.[1] || siteCategory.name.split(' ')[0],
                totalScore: psoScores.total,
                siteType: siteType.charAt(0).toUpperCase() + siteType.slice(1),
                recommendation: siteCategory.recommendation,
                status: siteCategory.recommendation,
                categoryLevel: siteCategory.description
            },
            
            siteType: siteType,
            siteCategory: siteCategory.name,
            overallScore: psoScores.total,
            recommendation: siteCategory.recommendation,
            categoryLevel: siteCategory.description,
            
            // Component Scores (same format as ssm.js)
            traffic: {
                score: `${traffic.score}/${traffic.maxScore}`,
                roadClassification: traffic.roadType?.toUpperCase() || 'UNKNOWN',
                trafficDensity: traffic.trafficDensity ? (traffic.trafficDensity > 70 ? 'High' : traffic.trafficDensity > 40 ? 'Medium' : 'Low') : 'Medium'
            },
            
            competition: {
                score: `${competition.score}/${competition.maxScore}`,
                competitorCount: competition.competitorStations || 0,
                psoMarketShare: competition.marketShare ? `${competition.marketShare}%` : '0%'
            },
            
            land: {
                score: `${land.score}/${land.maxScore}`,
                accessibility: land.accessibility || 'Unknown',
                landUseType: land.landUseType || 'Mixed',
                zoningSuitability: land.zoningSuitability || 'Unknown'
            },
            
            socioEconomic: {
                score: `${socioEconomic.score}/${socioEconomic.maxScore}`,
                populationDensity: socioEconomic.populationDensity || 'Medium',
                economicLevel: socioEconomic.economicLevel || 'Medium',
                nfrPotential: socioEconomic.nfrPotential || 'Medium'
            },
            
            // Coordinates for reference (same as ssm.js)
            coordinates: {
                center: { 
                    lat: lat, 
                    lng: lng 
                },
                radius: radius
            },
            
            // Simple recommendations (same as ssm.js)
            recommendations: this.generateRecommendations(analysisResults, psoScores, siteCategory),
            
            // Basic metadata (same as ssm.js)
            metadata: {
                analysisTimestamp: new Date().toISOString(),
                dataSource: 'OpenStreetMap (OSM) + PSO SSM Model',
                siteTypeDetection: 'Automated based on road classification',
                scoringSystem: siteType === 'city' ? 'PSO City Scoring' : 'PSO Highway Scoring',
                totalParametersAnalyzed: 4
            },
            
            // Detailed breakdown (same as ssm.js)
            detailedAnalysis: {
                parameterBreakdown: {
                    traffic: {
                        weight: siteType === 'city' ? '45%' : '60%',
                        components: traffic,
                        score: traffic.score,
                        maxScore: traffic.maxScore
                    },
                    competition: {
                        weight: '10%',
                        components: competition,
                        score: competition.score,
                        maxScore: competition.maxScore
                    },
                    land: {
                        weight: '10%',
                        components: land,
                        score: land.score,
                        maxScore: land.maxScore
                    },
                    socioEconomic: {
                        weight: siteType === 'city' ? '35%' : '20%',
                        components: socioEconomic,
                        score: socioEconomic.score,
                        maxScore: socioEconomic.maxScore
                    }
                }
            },
            
            // Generation info
            timestamp: new Date().toISOString(),
            generatedBy: 'SSMAnalyzerV2_Fallback'
        };
    }

    // Execute comprehensive analysis with sequential processing
    async executeComprehensiveAnalysis(lat, lng, radius, siteType) {
        const results = {};

        // 1. Traffic Analysis
        results.traffic = await this.analyzeTraffic(lat, lng, radius, siteType);
        
        // 2. Competition Analysis
        results.competition = await this.analyzeCompetition(lat, lng, radius);
        
        // 3. Land Characteristics Analysis
        results.land = await this.analyzeLandCharacteristics(lat, lng, radius);
        
        // 4. Socio-Economic Analysis
        results.socioEconomic = await this.analyzeSocioEconomic(lat, lng, radius);

        return results;
    }

    // 1. Traffic Analysis
    async analyzeTraffic(lat, lng, radius, siteType) {
        try {
            const radiusMeters = radius * 1000;
            const query = `
                [out:json][timeout:15];
                (
                    way["highway"](around:${radiusMeters},${lat},${lng});
                    nwr["public_transport"](around:${radiusMeters},${lat},${lng});
                    nwr["amenity"="parking"](around:${radiusMeters},${lat},${lng});
                    nwr["railway"](around:${radiusMeters},${lat},${lng});
                );
                out geom;
            `;

            const response = await this.makeRateLimitedRequest(query);
            const elements = response.elements || [];

            // Analyze road infrastructure
            const roads = elements.filter(e => e.tags?.highway);
            const roadAnalysis = this.analyzeRoadInfrastructure(roads);

            // Analyze transport hubs
            const transportHubs = elements.filter(e => e.tags?.public_transport);
            const transportAnalysis = this.analyzeTransportHubs(transportHubs);

            // Analyze traffic infrastructure
            const parkingAreas = elements.filter(e => e.tags?.amenity === 'parking');
            const trafficAnalysis = this.analyzeTrafficInfrastructure(parkingAreas);

            // Calculate traffic score
            const trafficScore = this.calculateTrafficScore(roadAnalysis, transportAnalysis, trafficAnalysis, siteType);

            return {
                roadInfrastructure: roadAnalysis,
                transportHubs: transportAnalysis,
                trafficInfrastructure: trafficAnalysis,
                score: trafficScore,
                details: {
                    majorRoads: roadAnalysis.majorRoads,
                    roadDensity: roadAnalysis.density,
                    publicTransportAccess: transportAnalysis.accessibility,
                    parkingAvailability: trafficAnalysis.parkingScore
                }
            };

        } catch (error) {
            console.log('Traffic analysis fallback');
            return this.getTrafficFallback(siteType);
        }
    }

    // 2. Competition Analysis
    async analyzeCompetition(lat, lng, radius) {
        try {
            const radiusMeters = radius * 1000;
            const query = `
                [out:json][timeout:15];
                (
                    nwr["amenity"="fuel"](around:${radiusMeters},${lat},${lng});
                );
                out geom;
            `;

            const response = await this.makeRateLimitedRequest(query);
            const elements = response.elements || [];

            const fuelStations = elements.filter(e => e.tags?.amenity === 'fuel');
            
            // Analyze competitors
            const competitors = fuelStations.filter(station => {
                const brand = this.extractBrand(station.tags);
                return brand && !brand.toLowerCase().includes('pso');
            });

            const psoStations = fuelStations.filter(station => {
                const brand = this.extractBrand(station.tags);
                return brand && brand.toLowerCase().includes('pso');
            });

            // Calculate competition metrics
            const competitionScore = this.calculateCompetitionScore(competitors.length, psoStations.length);

            return {
                totalStations: fuelStations.length,
                competitors: competitors.length,
                psoStations: psoStations.length,
                competitionIntensity: this.determineCompetitionIntensity(competitors.length),
                marketShare: fuelStations.length > 0 ? 
                    Math.round((psoStations.length / fuelStations.length) * 100) : 0,
                score: competitionScore,
                details: {
                    competitorDensity: Math.round((competitors.length / (Math.PI * radius * radius)) * 100) / 100,
                    brandDiversity: this.calculateBrandDiversity(fuelStations)
                }
            };

        } catch (error) {
            console.log('Competition analysis fallback, using unified data');
            // Use unified data generator to ensure consistent station data
            const unifiedStations = this.dataGenerator.generateConsistentFuelStations(lat, lng, radius);
            
            const psoStations = unifiedStations.filter(s => s.brand === 'PSO');
            const competitors = unifiedStations.filter(s => s.brand !== 'PSO');
            
            const competitionScore = this.calculateCompetitionScore(competitors.length, psoStations.length);

            return {
                totalStations: unifiedStations.length,
                competitors: competitors.length,
                psoStations: psoStations.length,
                competitionIntensity: this.determineCompetitionIntensity(competitors.length),
                marketShare: unifiedStations.length > 0 ? 
                    Math.round((psoStations.length / unifiedStations.length) * 100) : 0,
                score: competitionScore,
                details: {
                    competitorDensity: Math.round((competitors.length / (Math.PI * radius * radius)) * 100) / 100,
                    brandDiversity: this.calculateBrandDiversity(unifiedStations)
                }
            };
        }
    }

    // 3. Land Characteristics Analysis
    async analyzeLandCharacteristics(lat, lng, radius) {
        try {
            const radiusMeters = radius * 1000;
            const query = `
                [out:json][timeout:15];
                (
                    way["landuse"](around:${radiusMeters},${lat},${lng});
                    way["building"](around:${radiusMeters},${lat},${lng});
                    nwr["natural"](around:${radiusMeters},${lat},${lng});
                );
                out geom;
            `;

            const response = await this.makeRateLimitedRequest(query);
            const elements = response.elements || [];

            // Analyze land use
            const landUseElements = elements.filter(e => e.tags?.landuse);
            const landUseAnalysis = this.analyzeLandUseForSSM(landUseElements);

            // Analyze building density
            const buildings = elements.filter(e => e.tags?.building);
            const buildingAnalysis = this.analyzeBuildingDensity(buildings, radius);

            // Calculate land score
            const landScore = this.calculateLandScore(landUseAnalysis, buildingAnalysis);

            return {
                landUse: landUseAnalysis,
                buildingDensity: buildingAnalysis,
                accessibility: this.assessLandAccessibility(landUseAnalysis),
                developmentPotential: this.assessDevelopmentPotential(landUseAnalysis, buildingAnalysis),
                score: landScore,
                details: {
                    primaryLandUse: landUseAnalysis.primary,
                    commercialSuitability: landUseAnalysis.commercialSuitability,
                    zoningCompliance: landUseAnalysis.zoningCompliance
                }
            };

        } catch (error) {
            console.log('Land characteristics analysis fallback');
            return this.getLandFallback();
        }
    }

    // 4. Socio-Economic Analysis
    async analyzeSocioEconomic(lat, lng, radius) {
        try {
            const radiusMeters = radius * 1000;
            const query = `
                [out:json][timeout:15];
                (
                    nwr["amenity"~"^(school|university|hospital|bank|restaurant|shop)$"](around:${radiusMeters},${lat},${lng});
                    nwr["shop"](around:${radiusMeters},${lat},${lng});
                    way["building"="residential"](around:${radiusMeters},${lat},${lng});
                );
                out geom;
            `;

            const response = await this.makeRateLimitedRequest(query);
            const elements = response.elements || [];

            // Population density indicators
            const residentialBuildings = elements.filter(e => e.tags?.building === 'residential');
            const populationDensity = this.estimatePopulationDensity(residentialBuildings, radius);

            // Economic indicators
            const economicIndicators = this.analyzeEconomicIndicators(elements);

            // Vehicle ownership and fuel consumption potential
            const fuelConsumptionPotential = this.calculateFuelConsumptionPotential(
                populationDensity, economicIndicators.economicLevel
            );

            // NFR potential
            const nfrPotential = this.calculateNFRPotential(economicIndicators);

            // Calculate socio-economic score
            const socioEconomicScore = this.calculateSocioEconomicScore(
                populationDensity, economicIndicators, fuelConsumptionPotential, nfrPotential
            );

            return {
                populationDensity: populationDensity,
                economicLevel: economicIndicators.economicLevel,
                vehicleOwnership: economicIndicators.vehicleOwnership,
                fuelConsumptionPotential: fuelConsumptionPotential,
                nfrPotential: nfrPotential,
                score: socioEconomicScore,
                details: {
                    demographicProfile: this.generateDemographicProfile(populationDensity, economicIndicators),
                    purchasingPower: economicIndicators.purchasingPower,
                    marketPenetration: this.calculateMarketPenetration(populationDensity, economicIndicators)
                }
            };

        } catch (error) {
            console.log('Socio-economic analysis fallback');
            return this.getSocioEconomicFallback();
        }
    }

    // Calculate PSO Scores based on analysis results
    calculatePSOScores(analysisResults, siteType) {
        const weights = this.psoScoring[siteType];
        
        const scores = {
            traffic: Math.round((analysisResults.traffic.score / 100) * weights.TRAFFIC),
            competition: Math.round((analysisResults.competition.score / 100) * weights.COMPETITION),
            land: Math.round((analysisResults.land.score / 100) * weights.LAND),
            socioEconomic: Math.round((analysisResults.socioEconomic.score / 100) * weights.SOCIO_ECONOMIC)
        };

        const total = scores.traffic + scores.competition + scores.land + scores.socioEconomic;

        return {
            ...scores,
            total: total,
            maxPossible: weights.TOTAL,
            percentage: Math.round((total / weights.TOTAL) * 100)
        };
    }

    // Determine site category based on total score
    determineSiteCategory(totalScore) {
        for (const [code, threshold] of Object.entries(this.categoryThresholds)) {
            if (totalScore >= threshold.min && totalScore <= threshold.max) {
                return {
                    code: code,
                    ...threshold,
                    score: totalScore
                };
            }
        }
        return {
            code: 'DFC',
            ...this.categoryThresholds.DFC,
            score: totalScore
        };
    }

    // Generate recommendations based on analysis
    generateRecommendations(analysisResults, psoScores, siteCategory) {
        const recommendations = [];

        // Traffic recommendations
        if (analysisResults.traffic.score < 60) {
            recommendations.push({
                category: 'Traffic',
                priority: 'High',
                suggestion: 'Consider locations with better road connectivity and higher traffic flow'
            });
        }

        // Competition recommendations
        if (analysisResults.competition.competitors > 5) {
            recommendations.push({
                category: 'Competition',
                priority: 'Medium',
                suggestion: 'High competition area - focus on unique value propositions'
            });
        }

        // Land recommendations
        if (analysisResults.land.score < 70) {
            recommendations.push({
                category: 'Land',
                priority: 'Medium',
                suggestion: 'Verify zoning compliance and development potential'
            });
        }

        // Overall recommendation
        if (siteCategory.code === 'CF' || siteCategory.code === 'DFA') {
            recommendations.push({
                category: 'Overall',
                priority: 'High',
                suggestion: siteCategory.recommendation
            });
        } else if (siteCategory.code === 'DFC') {
            recommendations.push({
                category: 'Overall',
                priority: 'High',
                suggestion: 'Consider alternative locations with better characteristics'
            });
        }

        return recommendations;
    }

    // Rate-limited API request
    async makeRateLimitedRequest(query) {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        
        if (timeSinceLastRequest < this.requestDelay) {
            await new Promise(resolve => setTimeout(resolve, this.requestDelay - timeSinceLastRequest));
        }
        
        this.lastRequestTime = Date.now();

        const response = await fetch(this.overpassAPI, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `data=${encodeURIComponent(query)}`
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        return await response.json();
    }

    // Helper methods for analysis
    analyzeRoadInfrastructure(roads) {
        const roadTypes = {
            motorway: 0, trunk: 0, primary: 0, secondary: 0,
            tertiary: 0, residential: 0, service: 0
        };

        roads.forEach(road => {
            const highway = road.tags?.highway;
            if (highway && roadTypes.hasOwnProperty(highway)) {
                roadTypes[highway]++;
            }
        });

        const majorRoads = roadTypes.motorway + roadTypes.trunk + roadTypes.primary;
        const density = roads.length;

        return {
            roadTypes: roadTypes,
            majorRoads: majorRoads,
            density: density,
            connectivity: this.calculateConnectivity(roadTypes)
        };
    }

    analyzeTransportHubs(transportHubs) {
        const hubTypes = {};
        transportHubs.forEach(hub => {
            const type = hub.tags?.public_transport || 'other';
            hubTypes[type] = (hubTypes[type] || 0) + 1;
        });

        return {
            types: hubTypes,
            total: transportHubs.length,
            accessibility: Math.min(transportHubs.length * 10, 100)
        };
    }

    analyzeTrafficInfrastructure(parkingAreas) {
        return {
            parkingAreas: parkingAreas.length,
            parkingScore: Math.min(parkingAreas.length * 15, 100)
        };
    }

    calculateTrafficScore(roadAnalysis, transportAnalysis, trafficAnalysis, siteType) {
        const roadScore = Math.min(roadAnalysis.majorRoads * 20 + roadAnalysis.density * 2, 100);
        const transportScore = transportAnalysis.accessibility;
        const parkingScore = trafficAnalysis.parkingScore;

        const weights = siteType === 'HIGHWAY' ? 
            { road: 0.6, transport: 0.2, parking: 0.2 } :
            { road: 0.4, transport: 0.4, parking: 0.2 };

        return Math.round(
            roadScore * weights.road + 
            transportScore * weights.transport + 
            parkingScore * weights.parking
        );
    }

    extractBrand(tags) {
        return tags?.brand || tags?.name || tags?.operator || '';
    }

    calculateCompetitionScore(competitors, psoStations) {
        // Lower competition = higher score
        const totalStations = competitors + psoStations;
        if (totalStations === 0) return 90; // No competition

        const competitorRatio = competitors / totalStations;
        return Math.round((1 - competitorRatio) * 100);
    }

    determineCompetitionIntensity(competitorCount) {
        if (competitorCount <= 1) return 'Low';
        if (competitorCount <= 3) return 'Medium';
        return 'High';
    }

    calculateBrandDiversity(stations) {
        const brands = new Set();
        stations.forEach(station => {
            const brand = this.extractBrand(station.tags);
            if (brand) brands.add(brand.toLowerCase());
        });
        return brands.size;
    }

    analyzeLandUseForSSM(landUseElements) {
        const landUseTypes = {};
        landUseElements.forEach(element => {
            const landuse = element.tags?.landuse;
            if (landuse) {
                landUseTypes[landuse] = (landUseTypes[landuse] || 0) + 1;
            }
        });

        const primary = this.determinePrimaryLandUse(landUseTypes);
        const commercialSuitability = this.assessCommercialSuitability(primary);
        const zoningCompliance = this.assessZoningCompliance(primary);

        return {
            types: landUseTypes,
            primary: primary,
            commercialSuitability: commercialSuitability,
            zoningCompliance: zoningCompliance
        };
    }

    analyzeBuildingDensity(buildings, radius) {
        const area = Math.PI * radius * radius; // km²
        const density = buildings.length / area;

        return {
            total: buildings.length,
            density: Math.round(density),
            category: this.categorizeDensity(density)
        };
    }

    calculateLandScore(landUse, building) {
        const suitabilityScore = landUse.commercialSuitability;
        const densityScore = Math.min(building.density * 2, 50);
        const complianceScore = landUse.zoningCompliance;

        return Math.round((suitabilityScore + densityScore + complianceScore) / 3);
    }

    estimatePopulationDensity(residentialBuildings, radius) {
        const area = Math.PI * radius * radius; // km²
        const estimatedPopulation = residentialBuildings.length * 4; // Rough estimate
        const density = estimatedPopulation / area;

        return {
            estimated: Math.round(density),
            category: this.categorizePopulationDensity(density)
        };
    }

    analyzeEconomicIndicators(elements) {
        const banks = elements.filter(e => e.tags?.amenity === 'bank').length;
        const restaurants = elements.filter(e => e.tags?.amenity === 'restaurant').length;
        const shops = elements.filter(e => e.tags?.shop).length;

        const economicScore = banks * 3 + restaurants * 2 + shops * 1;
        const economicLevel = this.categorizeEconomicLevel(economicScore);

        return {
            banks: banks,
            restaurants: restaurants,
            shops: shops,
            economicScore: economicScore,
            economicLevel: economicLevel,
            vehicleOwnership: this.estimateVehicleOwnership(economicLevel),
            purchasingPower: this.estimatePurchasingPower(economicLevel)
        };
    }

    calculateFuelConsumptionPotential(populationDensity, economicLevel) {
        const densityFactor = Math.min(populationDensity.estimated / 1000, 1);
        const economicFactor = { Low: 0.3, Medium: 0.6, High: 1.0 }[economicLevel] || 0.5;
        
        return Math.round(densityFactor * economicFactor * 100);
    }

    calculateNFRPotential(economicIndicators) {
        const nfrScore = economicIndicators.restaurants + economicIndicators.shops;
        return Math.min(nfrScore * 10, 100);
    }

    calculateSocioEconomicScore(populationDensity, economicIndicators, fuelPotential, nfrPotential) {
        const populationScore = Math.min(populationDensity.estimated / 10, 40);
        const economicScore = Math.min(economicIndicators.economicScore * 2, 30);
        const fuelScore = fuelPotential * 0.2;
        const nfrScore = nfrPotential * 0.1;

        return Math.round(populationScore + economicScore + fuelScore + nfrScore);
    }

    // Utility methods
    determinePrimaryLandUse(landUseTypes) {
        const entries = Object.entries(landUseTypes);
        if (entries.length === 0) return 'mixed';
        
        entries.sort(([,a], [,b]) => b - a);
        return entries[0][0];
    }

    assessCommercialSuitability(primaryLandUse) {
        const suitability = {
            commercial: 90, retail: 85, mixed: 80, industrial: 70,
            office: 65, residential: 40, agricultural: 20
        };
        return suitability[primaryLandUse] || 50;
    }

    assessZoningCompliance(primaryLandUse) {
        // Simplified compliance assessment
        const compliance = {
            commercial: 90, mixed: 80, industrial: 70, office: 60, residential: 30
        };
        return compliance[primaryLandUse] || 50;
    }

    categorizeDensity(density) {
        if (density < 10) return 'Low';
        if (density < 50) return 'Medium';
        return 'High';
    }

    categorizePopulationDensity(density) {
        if (density < 500) return 'Low';
        if (density < 2000) return 'Medium';
        return 'High';
    }

    categorizeEconomicLevel(score) {
        if (score < 10) return 'Low';
        if (score < 25) return 'Medium';
        return 'High';
    }

    estimateVehicleOwnership(economicLevel) {
        const ownership = { Low: 30, Medium: 60, High: 85 };
        return ownership[economicLevel] || 50;
    }

    estimatePurchasingPower(economicLevel) {
        const power = { Low: 40, Medium: 70, High: 90 };
        return power[economicLevel] || 60;
    }

    calculateConnectivity(roadTypes) {
        return Math.min((roadTypes.motorway * 3 + roadTypes.trunk * 2 + roadTypes.primary) * 10, 100);
    }

    assessLandAccessibility(landUse) {
        return landUse.commercialSuitability > 70 ? 'High' : 'Medium';
    }

    assessDevelopmentPotential(landUse, building) {
        if (landUse.commercialSuitability > 80 && building.density > 20) return 'High';
        if (landUse.commercialSuitability > 60) return 'Medium';
        return 'Low';
    }

    generateDemographicProfile(populationDensity, economicIndicators) {
        return {
            density: populationDensity.category,
            economicLevel: economicIndicators.economicLevel,
            commercialActivity: economicIndicators.shops > 10 ? 'High' : 'Medium'
        };
    }

    calculateMarketPenetration(populationDensity, economicIndicators) {
        const densityScore = { Low: 30, Medium: 60, High: 90 }[populationDensity.category] || 50;
        const economicScore = { Low: 20, Medium: 50, High: 80 }[economicIndicators.economicLevel] || 50;
        
        return Math.round((densityScore + economicScore) / 2);
    }

    // Fallback data methods
    getTrafficFallback(siteType) {
        return {
            score: siteType === 'HIGHWAY' ? 75 : 60,
            details: {
                majorRoads: 3,
                roadDensity: 45,
                publicTransportAccess: 40,
                parkingAvailability: 60
            }
        };
    }

    getCompetitionFallback() {
        return {
            totalStations: 8,
            competitors: 6,
            psoStations: 2,
            competitionIntensity: 'Medium',
            marketShare: 25,
            score: 65,
            details: {
                competitorDensity: 3,
                brandDiversity: 4
            }
        };
    }

    getLandFallback() {
        return {
            score: 70,
            details: {
                primaryLandUse: 'commercial',
                commercialSuitability: 75,
                zoningCompliance: 80
            }
        };
    }

    getSocioEconomicFallback() {
        return {
            populationDensity: { estimated: 1500, category: 'Medium' },
            economicLevel: 'Medium',
            vehicleOwnership: 60,
            fuelConsumptionPotential: 65,
            nfrPotential: 55,
            score: 68,
            details: {
                demographicProfile: { density: 'Medium', economicLevel: 'Medium', commercialActivity: 'Medium' },
                purchasingPower: 70,
                marketPenetration: 65
            }
        };
    }

    getFallbackSSMData(lat, lng, radius) {
        const siteType = 'CITY';
        const analysisResults = {
            traffic: this.getTrafficFallback(siteType),
            competition: this.getCompetitionFallback(),
            land: this.getLandFallback(),
            socioEconomic: this.getSocioEconomicFallback()
        };

        const psoScores = this.calculatePSOScores(analysisResults, siteType);
        const siteCategory = this.determineSiteCategory(psoScores.total);

        return {
            searchCoordinates: { lat, lng },
            radius: radius,
            siteType: siteType,
            analysisResults: analysisResults,
            psoScores: psoScores,
            siteCategory: siteCategory,
            recommendations: this.generateRecommendations(analysisResults, psoScores, siteCategory),
            timestamp: new Date().toISOString(),
            generatedBy: 'SSMAnalyzerV2_Fallback'
        };
    }
}

// Make the class globally available
window.SSMAnalyzerV2 = SSMAnalyzerV2;
