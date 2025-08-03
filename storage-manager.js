// ========================================
// COMPREHENSIVE STORAGE MANAGER SYSTEM
// ========================================

class StorageManager {
    constructor() {
        this.storageKeys = {
            map: 'mapData',
            analysis: 'analysisData',
            ssm: 'ssmData'
        };
        
        this.init();
    }

    init() {
        console.log('🏪 StorageManager initialized');
        this.ensureStorageStructure();
        this.setupEventListeners();
    }

    // Ensure proper storage structure exists
    ensureStorageStructure() {
        Object.values(this.storageKeys).forEach(key => {
            if (!localStorage.getItem(key)) {
                localStorage.setItem(key, JSON.stringify({}));
            }
        });
    }

    // Setup event listeners for storage changes
    setupEventListeners() {
        // Listen for storage events from other tabs/windows
        window.addEventListener('storage', (e) => {
            if (Object.values(this.storageKeys).includes(e.key)) {
                this.notifyStorageChange(e.key, e.newValue);
            }
        });
    }

    // Notify about storage changes
    notifyStorageChange(key, newValue) {
        const moduleMap = {
            [this.storageKeys.map]: 'map',
            [this.storageKeys.analysis]: 'analysis',
            [this.storageKeys.ssm]: 'ssm'
        };
        
        const module = moduleMap[key];
        if (module) {
            window.dispatchEvent(new CustomEvent('storageUpdated', {
                detail: { 
                    module, 
                    data: newValue ? JSON.parse(newValue) : {},
                    timestamp: new Date().toISOString()
                }
            }));
        }
    }

    // ========================================
    // GENERIC DATA METHODS
    // ========================================

    setData(module, data) {
        try {
            const key = this.storageKeys[module];
            if (!key) {
                console.error(`❌ Invalid module: ${module}`);
                return false;
            }

            const dataWithTimestamp = {
                ...data,
                metadata: {
                    ...data.metadata,
                    lastUpdated: new Date().toISOString(),
                    module: module,
                    version: '1.0'
                }
            };

            localStorage.setItem(key, JSON.stringify(dataWithTimestamp));
            console.log(`✅ ${module.toUpperCase()} data saved successfully`);
            
            // Dispatch custom event for data change
            this.notifyStorageChange(key, JSON.stringify(dataWithTimestamp));
            
            return true;
        } catch (error) {
            console.error(`❌ Error saving ${module} data:`, error);
            return false;
        }
    }

    getData(module) {
        try {
            const key = this.storageKeys[module];
            if (!key) {
                console.error(`❌ Invalid module: ${module}`);
                return null;
            }

            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : {};
        } catch (error) {
            console.error(`❌ Error retrieving ${module} data:`, error);
            return {};
        }
    }

    getAllData() {
        return {
            map: this.getData('map'),
            analysis: this.getData('analysis'),
            ssm: this.getData('ssm')
        };
    }

    clearData(module) {
        try {
            if (module === 'all') {
                Object.values(this.storageKeys).forEach(key => {
                    localStorage.removeItem(key);
                });
                console.log('🧹 All storage data cleared');
                
                // Notify about clearing all data
                Object.keys(this.storageKeys).forEach(mod => {
                    this.notifyStorageChange(this.storageKeys[mod], null);
                });
            } else {
                const key = this.storageKeys[module];
                if (key) {
                    localStorage.removeItem(key);
                    console.log(`🧹 ${module.toUpperCase()} data cleared`);
                    this.notifyStorageChange(key, null);
                }
            }
            
            this.ensureStorageStructure();
            return true;
        } catch (error) {
            console.error(`❌ Error clearing ${module} data:`, error);
            return false;
        }
    }

    // ========================================
    // MODULE-SPECIFIC METHODS
    // ========================================

    // MAP DATA METHODS
    setMapData(data) {
        console.log('🗺️ Storing Map Data:', data);
        
        // Calculate enhanced statistics
        const stations = data.stations || [];
        const brandCounts = data.brandCounts || this.calculateBrandCounts(stations);
        const distanceStats = data.distanceStats || this.calculateDistanceStats(stations);
        const marketAnalysis = data.marketAnalysis || this.calculateMarketAnalysis(stations);
        
        const mapData = {
            // Core station data
            stations: stations,
            totalStations: stations.length,
            
            // Coordinates
            coordinates: {
                latitude: data.coordinates?.latitude || data.coordinates?.lat || data.lat,
                longitude: data.coordinates?.longitude || data.coordinates?.lng || data.lng,
                radius: data.coordinates?.radius || data.searchRadius || data.radius
            },
            
            // Search parameters
            searchRadius: data.searchRadius || data.coordinates?.radius || data.radius || 0,
            
            // Station analysis
            brands: data.brands || [...new Set(stations.map(s => s.brand))],
            brandCounts: brandCounts,
            
            // PSO vs Competitor analysis
            psoStations: data.psoStations || stations.filter(s => s.brand?.toLowerCase().includes('pso')).length,
            competitorStations: data.competitorStations || stations.filter(s => !s.brand?.toLowerCase().includes('pso')).length,
            
            // Distance statistics
            distanceStats: {
                ...distanceStats,
                distribution: data.distanceStats?.distribution || this.calculateDistanceDistribution(stations),
                closest: data.distanceStats?.closest || this.findClosestStation(stations),
                farthest: data.distanceStats?.farthest || this.findFarthestStation(stations)
            },
            
            // Market analysis
            marketAnalysis: {
                ...marketAnalysis,
                competitorAnalysis: data.marketAnalysis?.competitorAnalysis || this.calculateCompetitorAnalysis(stations),
                marketOpportunity: data.marketAnalysis?.marketOpportunity || this.calculateMarketOpportunity(stations),
                geographicCoverage: data.marketAnalysis?.geographicCoverage || this.calculateGeographicCoverage(stations)
            },
            
            // Distance calculations
            averageDistance: stations.length > 0 ? 
                (stations.reduce((sum, s) => sum + (s.distance || 0), 0) / stations.length).toFixed(2) : 0,
            
            // Station density analysis
            stationDensity: data.stationDensity || this.calculateStationDensity(stations, data.searchRadius || 0),
            
            // Geographic analysis
            geographicData: {
                ...data.geographicData,
                quadrantAnalysis: data.geographicData?.quadrantAnalysis || this.calculateQuadrantAnalysis(stations, data.coordinates),
                clustering: data.geographicData?.clustering || this.calculateStationClustering(stations),
                coverage: data.geographicData?.coverage || this.calculateCoverageAnalysis(stations, data.searchRadius || 0)
            },
            
            // Competitive intelligence
            competitiveIntelligence: {
                ...data.competitiveIntelligence,
                threats: data.competitiveIntelligence?.threats || this.identifyThreats(stations),
                opportunities: data.competitiveIntelligence?.opportunities || this.identifyOpportunities(stations),
                marketGaps: data.competitiveIntelligence?.marketGaps || this.identifyMarketGaps(stations)
            },
            
            // Traffic and accessibility
            trafficAnalysis: data.trafficAnalysis || {},
            accessibilityMetrics: data.accessibilityMetrics || {},
            
            // Business insights
            businessInsights: {
                ...data.businessInsights,
                recommendations: data.businessInsights?.recommendations || this.generateBusinessRecommendations(stations, marketAnalysis),
                riskFactors: data.businessInsights?.riskFactors || this.identifyRiskFactors(stations),
                successFactors: data.businessInsights?.successFactors || this.identifySuccessFactors(stations)
            },
            
            // Search metadata
            searchParameters: {
                ...data.searchParameters,
                timestamp: new Date().toISOString(),
                query: data.searchParameters?.query || data.query,
                filters: data.searchParameters?.filters || data.filters || {},
                radius: data.searchRadius || data.coordinates?.radius || 0
            },
            
            // Quality metrics
            dataQuality: {
                completeness: data.dataQuality?.completeness || this.calculateDataCompleteness(stations),
                accuracy: data.dataQuality?.accuracy || 'high',
                freshness: data.dataQuality?.freshness || 'current',
                coverage: data.dataQuality?.coverage || this.calculateDataCoverage(stations)
            },
            
            // Preserve any additional data
            ...Object.keys(data).reduce((acc, key) => {
                if (!['stations', 'coordinates', 'searchRadius', 'brands', 'brandCounts', 
                      'psoStations', 'competitorStations', 'distanceStats', 'marketAnalysis', 
                      'averageDistance', 'metadata'].includes(key)) {
                    acc[key] = data[key];
                }
                return acc;
            }, {}),
            
            metadata: {
                source: data.metadata?.source || 'Overpass API',
                searchTimestamp: new Date().toISOString(),
                dataCompleteness: 'complete',
                totalDataPoints: Object.keys(data).length,
                stationCount: stations.length,
                preservedFields: Object.keys(data),
                apiVersion: '1.0',
                ...data.metadata
            }
        };
        
        console.log('💾 Complete Map Data being stored:', mapData);
        return this.setData('map', mapData);
    }

    getMapData() {
        return this.getData('map');
    }

    hasMapData() {
        const data = this.getMapData();
        return !!(data.stations && data.stations.length > 0);
    }

    // ANALYSIS DATA METHODS
    setAnalysisData(data) {
        console.log('🔍 Storing Analysis Data:', data);
        
        // Preserve ALL incoming data and enhance with calculations
        const analysisData = {
            // Core site information
            siteType: data.siteType || 'Unknown',
            dominantLandUse: data.dominantLandUse || 'Unknown',
            totalElements: data.totalElements || 0,
            
            // Coordinates
            coordinates: {
                latitude: data.coordinates?.latitude || data.coordinates?.lat || data.lat,
                longitude: data.coordinates?.longitude || data.coordinates?.lng || data.lng,
                radius: data.coordinates?.radius || data.radius
            },
            
            // Complete Land Use Data with percentages
            landUse: {
                counts: data.landUse?.counts || data.counts || {},
                areas: data.landUse?.areas || data.areas || {},
                percentages: data.landUse?.percentages || data.percentages || {},
                breakdown: data.landUse?.breakdown || data.breakdown || {},
                distribution: data.landUse?.distribution || data.distribution || {},
                summary: data.landUse?.summary || data.summary || {}
            },
            
            // Complete Amenities Data
            amenities: {
                ...data.amenities,
                schools: data.amenities?.schools || 0,
                hospitals: data.amenities?.hospitals || 0,
                restaurants: data.amenities?.restaurants || 0,
                malls: data.amenities?.malls || 0,
                banks: data.amenities?.banks || 0,
                parks: data.amenities?.parks || 0,
                busStations: data.amenities?.busStations || 0,
                railwayStations: data.amenities?.railwayStations || 0,
                gasStations: data.amenities?.gasStations || 0,
                atms: data.amenities?.atms || 0,
                hotels: data.amenities?.hotels || 0,
                pharmacies: data.amenities?.pharmacies || 0,
                count: data.amenities?.count || 0,
                density: data.amenities?.density || 0
            },
            
            // Complete Roads Data
            roads: {
                ...data.roads,
                highways: data.roads?.highways || 0,
                primary: data.roads?.primary || 0,
                secondary: data.roads?.secondary || 0,
                tertiary: data.roads?.tertiary || 0,
                residential: data.roads?.residential || 0,
                unclassified: data.roads?.unclassified || 0,
                total: data.roads?.total || 0,
                majorRoads: data.roads?.majorRoads || 0,
                accessibilityScore: data.roads?.accessibilityScore || 0,
                connectivity: data.roads?.connectivity || 'Unknown'
            },
            
            // Buildings data
            buildings: data.buildings || 0,
            buildingTypes: data.buildingTypes || {},
            buildingDensity: data.buildingDensity || 0,
            
            // Complete Statistics
            statistics: {
                ...data.statistics,
                totalArea: data.statistics?.totalArea || 0,
                density: data.statistics?.density || 0,
                diversityIndex: data.statistics?.diversityIndex || 0,
                commercialIndex: data.statistics?.commercialIndex || 0,
                residentialIndex: data.statistics?.residentialIndex || 0,
                mixedUseIndex: data.statistics?.mixedUseIndex || 0,
                accessibilityIndex: data.statistics?.accessibilityIndex || 0,
                viabilityScore: data.statistics?.viabilityScore || 0
            },
            
            // Complete Area Analysis
            areaAnalysis: {
                ...data.areaAnalysis,
                commercialAreas: data.areaAnalysis?.commercialAreas || [],
                residentialAreas: data.areaAnalysis?.residentialAreas || [],
                industrialAreas: data.areaAnalysis?.industrialAreas || [],
                mixedUseAreas: data.areaAnalysis?.mixedUseAreas || [],
                totalCommercialArea: data.areaAnalysis?.totalCommercialArea || 0,
                totalResidentialArea: data.areaAnalysis?.totalResidentialArea || 0,
                totalIndustrialArea: data.areaAnalysis?.totalIndustrialArea || 0,
                averageAreaSize: data.areaAnalysis?.averageAreaSize || 0,
                largestArea: data.areaAnalysis?.largestArea || {},
                smallestArea: data.areaAnalysis?.smallestArea || {},
                areaDistribution: data.areaAnalysis?.areaDistribution || {}
            },
            
            // Commercial Viability - preserve incoming data or calculate
            commercialViability: {
                ...data.commercialViability,
                score: data.commercialViability?.score || this.calculateCommercialViability(data),
                factors: data.commercialViability?.factors || {},
                recommendations: data.commercialViability?.recommendations || [],
                strengths: data.commercialViability?.strengths || [],
                weaknesses: data.commercialViability?.weaknesses || [],
                opportunities: data.commercialViability?.opportunities || []
            },
            
            // Accessibility Score
            accessibilityScore: data.accessibilityScore || this.calculateAccessibilityScore(data),
            
            // Diversity Index
            diversityIndex: data.diversityIndex || this.calculateDiversityIndex(data),
            
            // Additional Analysis Data
            demographicData: data.demographicData || {},
            economicFactors: data.economicFactors || {},
            competitionAnalysis: data.competitionAnalysis || {},
            marketPotential: data.marketPotential || {},
            riskFactors: data.riskFactors || {},
            futureGrowth: data.futureGrowth || {},
            
            // Traffic and Transportation
            trafficAnalysis: data.trafficAnalysis || {},
            publicTransport: data.publicTransport || {},
            walkability: data.walkability || {},
            
            // Environmental Factors
            environmentalFactors: data.environmentalFactors || {},
            sustainability: data.sustainability || {},
            
            // Preserve any other data fields
            ...Object.keys(data).reduce((acc, key) => {
                if (!['siteType', 'dominantLandUse', 'totalElements', 'coordinates', 'landUse', 
                      'amenities', 'roads', 'buildings', 'statistics', 'areaAnalysis', 
                      'commercialViability', 'accessibilityScore', 'diversityIndex', 'metadata'].includes(key)) {
                    acc[key] = data[key];
                }
                return acc;
            }, {}),
            
            metadata: {
                source: 'Overpass API Land Use Analysis',
                analysisTimestamp: new Date().toISOString(),
                dataCompleteness: 'complete',
                totalDataPoints: Object.keys(data).length,
                preservedFields: Object.keys(data),
                ...data.metadata
            }
        };
        
        console.log('💾 Complete Analysis Data being stored:', analysisData);
        return this.setData('analysis', analysisData);
    }

    getAnalysisData() {
        return this.getData('analysis');
    }

    hasAnalysisData() {
        const data = this.getAnalysisData();
        return !!(data.landUse && data.siteType && data.siteType !== 'Unknown');
    }

    // SSM DATA METHODS
    setSSMData(data) {
        console.log('🎯 Storing SSM Data:', data);
        
        try {
            // Preserve ALL incoming SSM data completely
            const ssmData = {
                // Core site classification
                siteClassification: {
                    ...data.siteClassification,
                    category: data.siteClassification?.category || data.category,
                    level: data.siteClassification?.level || data.level,
                    type: data.siteClassification?.type || data.type,
                    score: data.siteClassification?.score || data.score
                },
                
                // Search coordinates
                searchCoordinates: {
                    latitude: data.searchCoordinates?.latitude || data.coordinates?.center?.lat || data.coordinates?.latitude || data.lat,
                    longitude: data.searchCoordinates?.longitude || data.coordinates?.center?.lng || data.coordinates?.longitude || data.lng,
                    radius: data.searchCoordinates?.radius || data.coordinates?.radius || data.radius
                },
                
                // Site identification
                siteType: data.siteType || 'Unknown',
                siteCategory: data.siteCategory || 'Unknown',
                categoryLevel: data.categoryLevel || 'Unknown',
                
                // Complete Traffic Analysis with safe property access
                traffic: {
                    ...data.traffic,
                    volume: data.traffic?.volume || 0,
                    density: data.traffic?.density || 0,
                    peak_hours: data.traffic?.peak_hours || {},
                    average_daily: data.traffic?.average_daily || 0,
                    commercial_vehicles: data.traffic?.commercial_vehicles || 0,
                    pedestrian_count: data.traffic?.pedestrian_count || 0,
                    accessibility: data.traffic?.accessibility || 'Unknown',
                    congestion_level: data.traffic?.congestion_level || 'Unknown',
                    flow_patterns: data.traffic?.flow_patterns || {},
                    seasonal_variations: data.traffic?.seasonal_variations || {},
                    score: data.traffic?.score || 0,
                    weight: data.traffic?.weight || 0,
                    weightedScore: data.traffic?.weightedScore || 0
                },
                
                // Complete Competition Analysis with safe property access
                competition: {
                    ...data.competition,
                    nearby_stations: data.competition?.nearby_stations || [],
                    pso_stations: data.competition?.pso_stations || 0,
                    competitor_stations: data.competition?.competitor_stations || 0,
                    total_stations: data.competition?.total_stations || 0,
                    market_share: data.competition?.market_share || 0,
                    dominant_competitors: data.competition?.dominant_competitors || [],
                    competition_density: data.competition?.competition_density || 0,
                    distance_to_nearest: data.competition?.distance_to_nearest || 0,
                    market_saturation: data.competition?.market_saturation || 'Unknown',
                    competitive_advantage: data.competition?.competitive_advantage || {},
                    threat_level: data.competition?.threat_level || 'Unknown',
                    score: data.competition?.score || 0,
                    weight: data.competition?.weight || 0,
                    weightedScore: data.competition?.weightedScore || 0
                },
                
                // Complete Land Analysis with safe property access
                land: {
                    ...data.land,
                    availability: data.land?.availability || 'Unknown',
                    cost: data.land?.cost || 0,
                    size: data.land?.size || 0,
                    zoning: data.land?.zoning || 'Unknown',
                    development_potential: data.land?.development_potential || 'Unknown',
                    accessibility: data.land?.accessibility || 'Unknown',
                    utilities: data.land?.utilities || {},
                    topography: data.land?.topography || 'Unknown',
                    soil_quality: data.land?.soil_quality || 'Unknown',
                    environmental_factors: data.land?.environmental_factors || {},
                    legal_restrictions: data.land?.legal_restrictions || [],
                    future_development: data.land?.future_development || 'Unknown',
                    score: data.land?.score || 0,
                    weight: data.land?.weight || 0,
                    weightedScore: data.land?.weightedScore || 0
                },
                
                // Complete Socio-Economic Analysis with safe property access
                socioEconomic: {
                    ...data.socioEconomic,
                    population_density: data.socioEconomic?.population_density || 0,
                    income_level: data.socioEconomic?.income_level || 'Unknown',
                    employment_rate: data.socioEconomic?.employment_rate || 0,
                    education_level: data.socioEconomic?.education_level || 'Unknown',
                    age_demographics: data.socioEconomic?.age_demographics || {},
                    purchasing_power: data.socioEconomic?.purchasing_power || 0,
                    vehicle_ownership: data.socioEconomic?.vehicle_ownership || 0,
                    commercial_activity: data.socioEconomic?.commercial_activity || 'Unknown',
                    residential_growth: data.socioEconomic?.residential_growth || 0,
                    industrial_presence: data.socioEconomic?.industrial_presence || 'Unknown',
                    economic_indicators: data.socioEconomic?.economic_indicators || {},
                    market_potential: data.socioEconomic?.market_potential || 'Unknown',
                    score: data.socioEconomic?.score || 0,
                    weight: data.socioEconomic?.weight || 0,
                    weightedScore: data.socioEconomic?.weightedScore || 0
                },
                
                // Complete coordinates data
                coordinates: {
                    ...data.coordinates,
                    center: data.coordinates?.center || {},
                    bounds: data.coordinates?.bounds || {},
                    search_area: data.coordinates?.search_area || {}
                },
                
                // Scoring and Results
                overallScore: data.overallScore || 0,
                recommendation: data.recommendation || 'Unknown',
                recommendations: data.recommendations || [],
                
                // PSO Specific Scores
                psoScores: {
                    ...data.psoScores,
                    traffic: data.psoScores?.traffic || 0,
                    competition: data.psoScores?.competition || 0,
                    land: data.psoScores?.land || 0,
                    socioEconomic: data.psoScores?.socioEconomic || 0,
                    weighted_total: data.psoScores?.weighted_total || 0,
                    percentage: data.psoScores?.percentage || 0
                },
                
                // Complete Analysis Results
                analysisResults: {
                    ...data.analysisResults,
                    strengths: data.analysisResults?.strengths || [],
                    weaknesses: data.analysisResults?.weaknesses || [],
                    opportunities: data.analysisResults?.opportunities || [],
                    threats: data.analysisResults?.threats || [],
                    recommendations: data.analysisResults?.recommendations || [],
                    risk_factors: data.analysisResults?.risk_factors || [],
                    success_probability: data.analysisResults?.success_probability || 0,
                    investment_recommendation: data.analysisResults?.investment_recommendation || 'Unknown'
                },
                
                // Detailed Analysis
                detailedAnalysis: {
                    ...data.detailedAnalysis,
                    market_analysis: data.detailedAnalysis?.market_analysis || {},
                    financial_projections: data.detailedAnalysis?.financial_projections || {},
                    risk_assessment: data.detailedAnalysis?.risk_assessment || {},
                    timeline: data.detailedAnalysis?.timeline || {},
                    implementation_plan: data.detailedAnalysis?.implementation_plan || {},
                    monitoring_metrics: data.detailedAnalysis?.monitoring_metrics || {}
                },
                
                // Additional Analysis Data
                marketAnalysis: data.marketAnalysis || {},
                demographicProfile: data.demographicProfile || {},
                economicFactors: data.economicFactors || {},
                infrastructureAssessment: data.infrastructureAssessment || {},
                environmentalImpact: data.environmentalImpact || {},
                regulatoryFactors: data.regulatoryFactors || {},
                competitiveIntelligence: data.competitiveIntelligence || {},
                
                // Financial Analysis
                financialAnalysis: data.financialAnalysis || {},
                investmentRequirements: data.investmentRequirements || {},
                revenueProjections: data.revenueProjections || {},
                costAnalysis: data.costAnalysis || {},
                profitabilityAnalysis: data.profitabilityAnalysis || {},
                
                // Risk Analysis
                riskAnalysis: data.riskAnalysis || {},
                mitigationStrategies: data.mitigationStrategies || {},
                
                // Implementation Details
                implementationPlan: data.implementationPlan || {},
                timeline: data.timeline || {},
                milestones: data.milestones || {},
                
                // Preserve any other data fields not explicitly handled
                ...Object.keys(data).reduce((acc, key) => {
                    if (!['siteClassification', 'searchCoordinates', 'siteType', 'siteCategory', 'categoryLevel',
                          'traffic', 'competition', 'land', 'socioEconomic', 'coordinates', 'overallScore',
                          'recommendation', 'recommendations', 'psoScores', 'analysisResults', 'detailedAnalysis', 'metadata'].includes(key)) {
                        acc[key] = data[key];
                    }
                    return acc;
                }, {}),
                
                metadata: {
                    source: 'Site Selection Matrix Analysis',
                    analysisTimestamp: new Date().toISOString(),
                    dataCompleteness: 'complete',
                    totalDataPoints: Object.keys(data).length,
                    preservedFields: Object.keys(data),
                    analysisVersion: '2.0',
                    ...data.metadata
                }
            };
            
            console.log('💾 Complete SSM Data being stored:', ssmData);
            return this.setData('ssm', ssmData);
            
        } catch (error) {
            console.error('❌ Error processing SSM data for storage:', error);
            console.error('❌ Original SSM data that caused error:', data);
            
            // Fallback: Store minimal data structure
            const fallbackData = {
                siteType: data.siteType || 'Unknown',
                siteCategory: data.siteCategory || 'Unknown',
                overallScore: data.overallScore || 0,
                traffic: data.traffic || {},
                competition: data.competition || {},
                land: data.land || {},
                socioEconomic: data.socioEconomic || {},
                psoScores: data.psoScores || {},
                coordinates: data.coordinates || {},
                searchCoordinates: data.searchCoordinates || {},
                metadata: {
                    source: 'Site Selection Matrix Analysis',
                    analysisTimestamp: new Date().toISOString(),
                    dataCompleteness: 'partial',
                    error: 'Fallback storage due to data processing error',
                    ...data.metadata
                }
            };
            
            console.log('🔄 Storing fallback SSM data:', fallbackData);
            return this.setData('ssm', fallbackData);
        }
    }

    getSSMData() {
        return this.getData('ssm');
    }

    hasSSMData() {
        const data = this.getSSMData();
        console.log('🔍 Checking SSM data validity:', data);
        
        // More flexible validation - check if any SSM analysis has been performed
        const hasBasicData = !!(
            data && 
            Object.keys(data).length > 1 && // More than just metadata
            (
                // Check for any of these key indicators of SSM analysis
                (data.traffic && Object.keys(data.traffic).length > 0) ||
                (data.competition && Object.keys(data.competition).length > 0) ||
                (data.land && Object.keys(data.land).length > 0) ||
                (data.socioEconomic && Object.keys(data.socioEconomic).length > 0) ||
                (data.overallScore && data.overallScore > 0) ||
                (data.psoScores && Object.keys(data.psoScores).length > 0) ||
                (data.siteType && data.siteType !== 'Unknown') ||
                (data.siteCategory && data.siteCategory !== 'Unknown')
            )
        );
        
        console.log('✅ SSM data validation result:', hasBasicData);
        return hasBasicData;
    }

    // ========================================
    // UTILITY AND CALCULATION METHODS
    // ========================================

    calculateBrandCounts(stations) {
        const counts = {};
        stations.forEach(station => {
            const brand = station.brand || 'Unknown';
            counts[brand] = (counts[brand] || 0) + 1;
        });
        return counts;
    }

    calculateDistanceStats(stations) {
        if (!stations || stations.length === 0) return {};
        
        const distances = stations.map(s => s.distance || 0).filter(d => d > 0);
        if (distances.length === 0) return {};
        
        return {
            average: Math.round((distances.reduce((a, b) => a + b, 0) / distances.length) * 100) / 100,
            minimum: Math.round(Math.min(...distances) * 100) / 100,
            maximum: Math.round(Math.max(...distances) * 100) / 100,
            within1km: stations.filter(s => (s.distance || 0) <= 1).length,
            within2km: stations.filter(s => (s.distance || 0) <= 2).length,
            within5km: stations.filter(s => (s.distance || 0) <= 5).length
        };
    }

    calculateMarketAnalysis(stations) {
        if (!stations || stations.length === 0) return {};
        
        const psoStations = stations.filter(s => s.brand?.toLowerCase().includes('pso'));
        const competitorStations = stations.filter(s => !s.brand?.toLowerCase().includes('pso'));
        const brandCounts = this.calculateBrandCounts(stations);
        
        return {
            psoMarketShare: stations.length > 0 ? Math.round((psoStations.length / stations.length) * 100) : 0,
            competitionLevel: competitorStations.length <= 2 ? 'Low' : 
                            competitorStations.length <= 5 ? 'Medium' : 'High',
            dominantCompetitor: Object.entries(brandCounts)
                .filter(([brand]) => !brand.toLowerCase().includes('pso'))
                .sort(([,a], [,b]) => b - a)[0]?.[0] || 'None'
        };
    }

    calculateCommercialViability(data) {
        const landUse = data.landUse || {};
        const amenities = data.amenities || {};
        
        let score = 0;
        
        // Land use factors
        if (landUse.percentages?.commercial > 30) score += 30;
        if (landUse.percentages?.residential > 40) score += 20;
        if (landUse.percentages?.industrial > 20) score += 15;
        
        // Amenity factors
        if (amenities.schools > 5) score += 10;
        if (amenities.restaurants > 10) score += 10;
        if (amenities.malls > 0) score += 15;
        
        return Math.min(score, 100);
    }

    calculateAccessibilityScore(data) {
        const roads = data.roads || {};
        const amenities = data.amenities || {};
        
        let score = 0;
        
        // Road accessibility
        if (roads.highways > 0) score += 25;
        if (roads.primary > 2) score += 20;
        if (roads.secondary > 5) score += 15;
        
        // Public transport
        if (amenities.busStations > 0) score += 20;
        if (amenities.railwayStations > 0) score += 20;
        
        return Math.min(score, 100);
    }

    calculateDiversityIndex(data) {
        const landUse = data.landUse?.counts || {};
        const total = Object.values(landUse).reduce((a, b) => a + b, 0);
        
        if (total === 0) return 0;
        
        // Shannon diversity index
        let diversity = 0;
        Object.values(landUse).forEach(count => {
            if (count > 0) {
                const proportion = count / total;
                diversity -= proportion * Math.log2(proportion);
            }
        });
        
        return Math.round(diversity * 100) / 100;
    }

    // Additional Map Analysis Methods
    calculateDistanceDistribution(stations) {
        if (!stations || stations.length === 0) return {};
        
        const distances = stations.map(s => s.distance || 0).filter(d => d > 0);
        const ranges = {
            '0-1km': distances.filter(d => d <= 1).length,
            '1-2km': distances.filter(d => d > 1 && d <= 2).length,
            '2-5km': distances.filter(d => d > 2 && d <= 5).length,
            '5-10km': distances.filter(d => d > 5 && d <= 10).length,
            '10km+': distances.filter(d => d > 10).length
        };
        
        return ranges;
    }

    findClosestStation(stations) {
        if (!stations || stations.length === 0) return null;
        return stations.reduce((closest, station) => 
            (station.distance || 0) < (closest.distance || Infinity) ? station : closest, {});
    }

    findFarthestStation(stations) {
        if (!stations || stations.length === 0) return null;
        return stations.reduce((farthest, station) => 
            (station.distance || 0) > (farthest.distance || 0) ? station : farthest, {});
    }

    calculateCompetitorAnalysis(stations) {
        if (!stations || stations.length === 0) return {};
        
        const competitors = stations.filter(s => !s.brand?.toLowerCase().includes('pso'));
        const brandAnalysis = {};
        
        competitors.forEach(station => {
            const brand = station.brand || 'Unknown';
            if (!brandAnalysis[brand]) {
                brandAnalysis[brand] = {
                    count: 0,
                    averageDistance: 0,
                    minDistance: Infinity,
                    locations: []
                };
            }
            brandAnalysis[brand].count++;
            brandAnalysis[brand].locations.push(station);
            if (station.distance < brandAnalysis[brand].minDistance) {
                brandAnalysis[brand].minDistance = station.distance;
            }
        });
        
        // Calculate average distances
        Object.keys(brandAnalysis).forEach(brand => {
            const distances = brandAnalysis[brand].locations.map(s => s.distance || 0);
            brandAnalysis[brand].averageDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
        });
        
        return brandAnalysis;
    }

    calculateMarketOpportunity(stations) {
        if (!stations || stations.length === 0) return { level: 'high', score: 100 };
        
        const psoStations = stations.filter(s => s.brand?.toLowerCase().includes('pso'));
        const competitors = stations.filter(s => !s.brand?.toLowerCase().includes('pso'));
        
        let opportunityScore = 100;
        
        // Reduce score based on competition density
        if (competitors.length > 5) opportunityScore -= 30;
        else if (competitors.length > 2) opportunityScore -= 15;
        
        // Reduce score if PSO already has presence
        if (psoStations.length > 0) opportunityScore -= 20;
        
        // Check distance to nearest competitor
        const nearestCompetitor = competitors.reduce((nearest, station) => 
            (station.distance || 0) < (nearest.distance || Infinity) ? station : nearest, {});
        
        if (nearestCompetitor.distance && nearestCompetitor.distance < 1) opportunityScore -= 25;
        else if (nearestCompetitor.distance && nearestCompetitor.distance < 2) opportunityScore -= 10;
        
        opportunityScore = Math.max(0, opportunityScore);
        
        let level = 'low';
        if (opportunityScore > 70) level = 'high';
        else if (opportunityScore > 40) level = 'medium';
        
        return { level, score: opportunityScore };
    }

    calculateGeographicCoverage(stations) {
        if (!stations || stations.length === 0) return {};
        
        const coordinates = stations.map(s => ({ lat: s.lat, lng: s.lng })).filter(c => c.lat && c.lng);
        if (coordinates.length === 0) return {};
        
        const bounds = {
            north: Math.max(...coordinates.map(c => c.lat)),
            south: Math.min(...coordinates.map(c => c.lat)),
            east: Math.max(...coordinates.map(c => c.lng)),
            west: Math.min(...coordinates.map(c => c.lng))
        };
        
        const center = {
            lat: (bounds.north + bounds.south) / 2,
            lng: (bounds.east + bounds.west) / 2
        };
        
        return { bounds, center, coverage: coordinates.length };
    }

    calculateStationDensity(stations, radius) {
        if (!stations || stations.length === 0 || !radius) return 0;
        
        const area = Math.PI * Math.pow(radius, 2); // Area in km²
        return Math.round((stations.length / area) * 100) / 100; // Stations per km²
    }

    calculateQuadrantAnalysis(stations, centerCoords) {
        if (!stations || stations.length === 0 || !centerCoords) return {};
        
        const quadrants = { NE: 0, NW: 0, SE: 0, SW: 0 };
        
        stations.forEach(station => {
            if (!station.lat || !station.lng) return;
            
            const isNorth = station.lat > centerCoords.latitude;
            const isEast = station.lng > centerCoords.longitude;
            
            if (isNorth && isEast) quadrants.NE++;
            else if (isNorth && !isEast) quadrants.NW++;
            else if (!isNorth && isEast) quadrants.SE++;
            else quadrants.SW++;
        });
        
        return quadrants;
    }

    calculateStationClustering(stations) {
        if (!stations || stations.length < 2) return { clusters: 0, isolated: stations.length };
        
        // Simple clustering based on distance threshold
        const threshold = 1; // 1km
        let clusters = 0;
        let isolated = 0;
        const processed = new Set();
        
        stations.forEach((station, i) => {
            if (processed.has(i)) return;
            
            let clusterSize = 1;
            processed.add(i);
            
            stations.forEach((otherStation, j) => {
                if (i !== j && !processed.has(j)) {
                    const distance = this.calculateDistance(station, otherStation);
                    if (distance <= threshold) {
                        clusterSize++;
                        processed.add(j);
                    }
                }
            });
            
            if (clusterSize > 1) clusters++;
            else isolated++;
        });
        
        return { clusters, isolated };
    }

    calculateCoverageAnalysis(stations, radius) {
        if (!stations || stations.length === 0) return {};
        
        return {
            totalStations: stations.length,
            searchRadius: radius,
            density: this.calculateStationDensity(stations, radius),
            distribution: this.calculateDistanceDistribution(stations)
        };
    }

    identifyThreats(stations) {
        const threats = [];
        const competitors = stations.filter(s => !s.brand?.toLowerCase().includes('pso'));
        
        if (competitors.length > 5) {
            threats.push('High competitor density in the area');
        }
        
        const nearbyCompetitors = competitors.filter(s => (s.distance || 0) < 2);
        if (nearbyCompetitors.length > 2) {
            threats.push('Multiple competitors within 2km radius');
        }
        
        const majorBrands = ['Shell', 'Total', 'Caltex', 'GO'];
        const majorCompetitors = competitors.filter(s => 
            majorBrands.some(brand => s.brand?.toLowerCase().includes(brand.toLowerCase()))
        );
        
        if (majorCompetitors.length > 0) {
            threats.push('Presence of major international brands');
        }
        
        return threats;
    }

    identifyOpportunities(stations) {
        const opportunities = [];
        const competitors = stations.filter(s => !s.brand?.toLowerCase().includes('pso'));
        const psoStations = stations.filter(s => s.brand?.toLowerCase().includes('pso'));
        
        if (competitors.length < 3) {
            opportunities.push('Low competition - market entry opportunity');
        }
        
        if (psoStations.length === 0) {
            opportunities.push('No existing PSO presence - first mover advantage');
        }
        
        const nearestCompetitor = competitors.reduce((nearest, station) => 
            (station.distance || 0) < (nearest.distance || Infinity) ? station : nearest, {});
        
        if (!nearestCompetitor.distance || nearestCompetitor.distance > 3) {
            opportunities.push('Significant distance from nearest competitor');
        }
        
        return opportunities;
    }

    identifyMarketGaps(stations) {
        const gaps = [];
        
        if (stations.length < 2) {
            gaps.push('Underserved market with minimal fuel station presence');
        }
        
        const brandDiversity = [...new Set(stations.map(s => s.brand))].length;
        if (brandDiversity < 3) {
            gaps.push('Limited brand diversity - room for new entrant');
        }
        
        return gaps;
    }

    generateBusinessRecommendations(stations, marketAnalysis) {
        const recommendations = [];
        
        if (marketAnalysis.competitionLevel === 'Low') {
            recommendations.push('Strong market entry opportunity due to low competition');
        }
        
        if (marketAnalysis.psoMarketShare === 0) {
            recommendations.push('First mover advantage - establish PSO brand presence');
        }
        
        const competitors = stations.filter(s => !s.brand?.toLowerCase().includes('pso'));
        if (competitors.length > 0) {
            const avgDistance = competitors.reduce((sum, s) => sum + (s.distance || 0), 0) / competitors.length;
            if (avgDistance > 2) {
                recommendations.push('Favorable distance from competitors allows for market penetration');
            }
        }
        
        return recommendations;
    }

    identifyRiskFactors(stations) {
        const risks = [];
        
        if (stations.length > 8) {
            risks.push('Market saturation risk - high number of existing stations');
        }
        
        const nearbyStations = stations.filter(s => (s.distance || 0) < 1);
        if (nearbyStations.length > 2) {
            risks.push('High competition risk - multiple stations within 1km');
        }
        
        return risks;
    }

    identifySuccessFactors(stations) {
        const factors = [];
        
        const competitors = stations.filter(s => !s.brand?.toLowerCase().includes('pso'));
        if (competitors.length < 4) {
            factors.push('Manageable competition level');
        }
        
        if (stations.length > 0 && stations.length < 6) {
            factors.push('Established market with room for growth');
        }
        
        return factors;
    }

    calculateDataCompleteness(stations) {
        if (!stations || stations.length === 0) return 0;
        
        let completenessScore = 0;
        const requiredFields = ['name', 'brand', 'lat', 'lng', 'distance'];
        
        stations.forEach(station => {
            const fieldCount = requiredFields.filter(field => station[field] !== undefined && station[field] !== null).length;
            completenessScore += (fieldCount / requiredFields.length) * 100;
        });
        
        return Math.round(completenessScore / stations.length);
    }

    calculateDataCoverage(stations) {
        if (!stations || stations.length === 0) return 'none';
        
        if (stations.length >= 10) return 'comprehensive';
        if (stations.length >= 5) return 'good';
        if (stations.length >= 2) return 'moderate';
        return 'limited';
    }

    calculateDistance(station1, station2) {
        if (!station1.lat || !station1.lng || !station2.lat || !station2.lng) return 0;
        
        const R = 6371; // Earth's radius in km
        const dLat = (station2.lat - station1.lat) * Math.PI / 180;
        const dLng = (station2.lng - station1.lng) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(station1.lat * Math.PI / 180) * Math.cos(station2.lat * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    // ========================================
    // STATUS AND SUMMARY METHODS
    // ========================================

    getStorageStatus() {
        const allData = this.getAllData();
        
        return {
            map: {
                hasData: this.hasMapData(),
                dataSize: JSON.stringify(allData.map).length,
                stationCount: allData.map.stations ? allData.map.stations.length : 0,
                lastUpdated: allData.map.metadata?.lastUpdated || 'Never',
                coordinates: allData.map.coordinates || null
            },
            analysis: {
                hasData: this.hasAnalysisData(),
                dataSize: JSON.stringify(allData.analysis).length,
                siteType: allData.analysis.siteType || 'Unknown',
                dominantLandUse: allData.analysis.dominantLandUse || 'Unknown',
                lastUpdated: allData.analysis.metadata?.lastUpdated || 'Never',
                coordinates: allData.analysis.coordinates || null
            },
            ssm: {
                hasData: this.hasSSMData(),
                dataSize: JSON.stringify(allData.ssm).length,
                overallScore: allData.ssm.overallScore || 0,
                siteCategory: allData.ssm.siteCategory || 'Unknown',
                lastUpdated: allData.ssm.metadata?.lastUpdated || 'Never',
                coordinates: allData.ssm.searchCoordinates || null
            }
        };
    }

    getDataSummary() {
        const status = this.getStorageStatus();
        const allData = this.getAllData();
        
        const modulesWithData = [status.map.hasData, status.analysis.hasData, status.ssm.hasData].filter(Boolean).length;
        const totalDataSize = Object.values(status).reduce((sum, module) => sum + module.dataSize, 0);
        
        const lastActivities = [
            status.map.lastUpdated,
            status.analysis.lastUpdated,
            status.ssm.lastUpdated
        ].filter(date => date !== 'Never').map(date => new Date(date).getTime());
        
        const lastActivity = lastActivities.length > 0 ? Math.max(...lastActivities) : 0;
        
        return {
            summary: {
                totalModules: 3,
                modulesWithData,
                totalDataSize,
                lastActivity: lastActivity ? new Date(lastActivity).toISOString() : 'Never'
            },
            modules: status,
            data: allData
        };
    }

    // ========================================
    // EXPORT/IMPORT METHODS
    // ========================================

    exportData(modules = 'all') {
        try {
            const allData = this.getAllData();
            const exportData = {
                exportTimestamp: new Date().toISOString(),
                version: '1.0',
                exportSource: 'PSO Smart Trading Area - Storage Manager'
            };

            if (modules === 'all') {
                exportData.map = this.hasMapData() ? allData.map : null;
                exportData.analysis = this.hasAnalysisData() ? allData.analysis : null;
                exportData.ssm = this.hasSSMData() ? allData.ssm : null;
            } else if (Array.isArray(modules)) {
                modules.forEach(module => {
                    // Handle SSM capitalization correctly
                    const hasDataMethodName = module === 'ssm' ? 'hasSSMData' : `has${module.charAt(0).toUpperCase() + module.slice(1)}Data`;
                    if (this[hasDataMethodName]()) {
                        exportData[module] = allData[module];
                    } else {
                        exportData[module] = null;
                    }
                });
            } else {
                // Single module - handle SSM capitalization correctly
                const hasDataMethodName = modules === 'ssm' ? 'hasSSMData' : `has${modules.charAt(0).toUpperCase() + modules.slice(1)}Data`;
                if (this[hasDataMethodName]()) {
                    exportData[modules] = allData[modules];
                } else {
                    exportData[modules] = null;
                }
            }

            return JSON.stringify(exportData, null, 2);
        } catch (error) {
            console.error('❌ Error exporting data:', error);
            return null;
        }
    }

    importData(jsonString) {
        try {
            const importData = JSON.parse(jsonString);
            let importedCount = 0;
            
            // Handle both old format (with data property) and new format (direct module properties)
            let mapData, analysisData, ssmData;
            
            if (importData.data) {
                // Old format
                mapData = importData.data.map;
                analysisData = importData.data.analysis;
                ssmData = importData.data.ssm;
            } else {
                // New format
                mapData = importData.map;
                analysisData = importData.analysis;
                ssmData = importData.ssm;
            }
            
            // Import each module's data if it exists and is not null
            if (mapData && Object.keys(mapData).length > 0) {
                this.setData('map', mapData);
                importedCount++;
                console.log('✅ Map data imported');
            }
            
            if (analysisData && Object.keys(analysisData).length > 0) {
                this.setData('analysis', analysisData);
                importedCount++;
                console.log('✅ Analysis data imported');
            }
            
            if (ssmData && Object.keys(ssmData).length > 0) {
                this.setData('ssm', ssmData);
                importedCount++;
                console.log('✅ SSM data imported');
            }
            
            console.log(`✅ Successfully imported data for ${importedCount} module(s)`);
            return importedCount;
            
        } catch (error) {
            console.error('❌ Error importing data:', error);
            return 0;
        }
    }

    // ========================================
    // COORDINATE SYNCHRONIZATION
    // ========================================

    checkCoordinateConsistency() {
        const allData = this.getAllData();
        const coordinates = {};
        
        // Extract coordinates from each module with safe property access
        if (allData.map && allData.map.coordinates && allData.map.coordinates.latitude && allData.map.coordinates.longitude) {
            coordinates.map = {
                latitude: allData.map.coordinates.latitude,
                longitude: allData.map.coordinates.longitude,
                radius: allData.map.coordinates.radius || allData.map.searchRadius || 0
            };
        }
        if (allData.analysis && allData.analysis.coordinates && allData.analysis.coordinates.latitude && allData.analysis.coordinates.longitude) {
            coordinates.analysis = {
                latitude: allData.analysis.coordinates.latitude,
                longitude: allData.analysis.coordinates.longitude,
                radius: allData.analysis.coordinates.radius || 0
            };
        }
        if (allData.ssm && allData.ssm.searchCoordinates && allData.ssm.searchCoordinates.latitude && allData.ssm.searchCoordinates.longitude) {
            coordinates.ssm = {
                latitude: allData.ssm.searchCoordinates.latitude,
                longitude: allData.ssm.searchCoordinates.longitude,
                radius: allData.ssm.searchCoordinates.radius || 0
            };
        }
        
        // Check if all coordinates are consistent
        const coordValues = Object.values(coordinates);
        if (coordValues.length === 0) {
            return { isConsistent: true, message: 'No coordinate data available' };
        }
        
        const firstCoord = coordValues[0];
        const isConsistent = coordValues.every(coord => 
            Math.abs(coord.latitude - firstCoord.latitude) < 0.0001 &&
            Math.abs(coord.longitude - firstCoord.longitude) < 0.0001 &&
            Math.abs((coord.radius || 0) - (firstCoord.radius || 0)) < 0.1
        );
        
        return {
            isConsistent,
            coordinates,
            message: isConsistent ? 'All coordinates are consistent' : 'Coordinates vary between modules'
        };
    }

    // ========================================
    // UTILITY FUNCTIONS
    // ========================================

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    formatDate(dateString) {
        if (!dateString || dateString === 'Never') return 'Never';
        try {
            return new Date(dateString).toLocaleString();
        } catch {
            return 'Invalid Date';
        }
    }

    // Validate data integrity
    validateDataIntegrity() {
        const issues = [];
        const allData = this.getAllData();
        
        // Check map data
        if (this.hasMapData()) {
            const mapData = allData.map;
            if (!mapData.stations || !Array.isArray(mapData.stations)) {
                issues.push('Map: Invalid stations data');
            }
            if (!mapData.coordinates || !mapData.coordinates.latitude) {
                issues.push('Map: Missing coordinate data');
            }
        }
        
        // Check analysis data
        if (this.hasAnalysisData()) {
            const analysisData = allData.analysis;
            if (!analysisData.landUse || !analysisData.landUse.counts) {
                issues.push('Analysis: Invalid land use data');
            }
        }
        
        // Check SSM data
        if (this.hasSSMData()) {
            const ssmData = allData.ssm;
            if (!ssmData.overallScore || ssmData.overallScore <= 0) {
                issues.push('SSM: Invalid score data');
            }
        }
        
        return {
            isValid: issues.length === 0,
            issues
        };
    }

    // ========================================
    // ADVANCED PDF REPORT GENERATION
    // ========================================

    async generateReport() {
        try {
            // Show loading UI
            this.showReportGenerationUI();
            
            // Validate data completeness
            const validation = this.validateReportData();
            if (!validation.isValid) {
                throw new Error(`Incomplete data: ${validation.issues.join(', ')}`);
            }

            // Generate HTML-based PDF report
            const pdfBlob = await this.createHTMLtoPDF();
            
            // Show success UI with download options
            this.showReportSuccessUI(pdfBlob);
            
            return pdfBlob;
            
        } catch (error) {
            console.error('❌ Error generating report:', error);
            this.showReportErrorUI(error.message);
            throw error;
        }
    }

    validateReportData() {
        const allData = this.getAllData();
        const issues = [];
        
        // Check if all modules have data
        if (!this.hasMapData()) {
            issues.push('Map analysis data is missing');
        }
        if (!this.hasAnalysisData()) {
            issues.push('Land use analysis data is missing');
        }
        if (!this.hasSSMData()) {
            issues.push('Site Selection Matrix data is missing');
        }
        
        // Check coordinate consistency
        const consistency = this.checkCoordinateConsistency();
        if (!consistency.isConsistent) {
            issues.push('Coordinates are not consistent across modules');
        }
        
        // Check data quality
        const mapData = allData.map;
        const analysisData = allData.analysis;
        const ssmData = allData.ssm;
        
        if (mapData.stations && mapData.stations.length === 0) {
            issues.push('No fuel stations found in map data');
        }
        
        if (!analysisData.landUse || !analysisData.landUse.counts) {
            issues.push('Land use analysis is incomplete');
        }
        
        if (!ssmData.overallScore || ssmData.overallScore <= 0) {
            issues.push('Site selection analysis is incomplete');
        }
        
        return {
            isValid: issues.length === 0,
            issues,
            data: allData
        };
    }

    async createHTMLtoPDF() {
        try {
            // Load html2pdf library if not already loaded
            if (!window.html2pdf) {
                console.log('📚 Loading html2pdf library...');
                await this.loadHTML2PDFLibrary();
                console.log('✅ html2pdf library loaded successfully');
            }

            const allData = this.getAllData();
            console.log('📊 Raw data for report:', allData);
            
            // Validate that we have data
            if (!allData.map || !allData.map.stations || allData.map.stations.length === 0) {
                throw new Error('No station data available for report generation');
            }
            
            const reportData = this.prepareReportData(allData);
            console.log('📋 Prepared report data:', reportData);
            
            // Create HTML report template
            const htmlContent = this.createHTMLReportTemplate(reportData);
            console.log('📝 Generated HTML content length:', htmlContent.length);
            console.log('📝 HTML Preview (first 1000 chars):', htmlContent.substring(0, 1000));
            
            // Create temporary container with better visibility for debugging
            const tempContainer = document.createElement('div');
            tempContainer.innerHTML = htmlContent;
            tempContainer.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: white;
                z-index: 999999;
                overflow: auto;
                padding: 20px;
            `;
            
            document.body.appendChild(tempContainer);
            console.log('📦 Temp container created and added to DOM');
            console.log('📦 Container children count:', tempContainer.children.length);
            console.log('📦 Container innerHTML length:', tempContainer.innerHTML.length);
            
            // Wait a moment for DOM to settle
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            try {
                console.log('🔄 Starting PDF generation...');
                // Generate PDF from HTML with optimized settings
                const pdfBlob = await html2pdf()
                    .set({
                        margin: [10, 10, 10, 10],
                        filename: `PSO_Site_Analysis_${new Date().toISOString().slice(0, 10)}.pdf`,
                        image: { type: 'jpeg', quality: 0.8 },
                        html2canvas: { 
                            scale: 1,
                            useCORS: false,
                            allowTaint: true,
                            logging: true,
                            width: 800,
                            height: 1200
                        },
                        jsPDF: { 
                            unit: 'mm', 
                            format: 'a4', 
                            orientation: 'portrait'
                        }
                    })
                    .from(tempContainer)
                    .toPdf()
                    .output('blob');
                
                console.log('✅ PDF generated successfully, size:', pdfBlob.size, 'bytes');
                return pdfBlob;
            } finally {
                // Clean up temporary container
                console.log('🧹 Cleaning up temporary container...');
                if (tempContainer.parentNode) {
                    document.body.removeChild(tempContainer);
                }
            }
        } catch (error) {
            console.error('❌ Error in createHTMLtoPDF:', error);
            throw error;
        }
    }

    async loadHTML2PDFLibrary() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    createHTMLReportTemplate(data) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>PSO Site Analysis Report</title>
            <style>
                ${this.getReportCSS()}
            </style>
        </head>
        <body>
            <div class="report-container">
                <!-- Page 1: Professional PSO Report -->
                <div class="page">
                    ${this.createProfessionalPage1(data)}
                </div>
            </div>
        </body>
        </html>
        `;
    }

    getReportCSS() {
        return `
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: Arial, sans-serif;
                font-size: 14px;
                line-height: 1.6;
                color: #333;
                background: white;
                padding: 20px;
            }
            
            .report-container {
                width: 100%;
                max-width: 800px;
                margin: 0 auto;
            }
            
            .page {
                width: 100%;
                min-height: 1000px;
                background: white;
                position: relative;
            }
            
            /* PSO Professional Header */
            .pso-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 30px;
                padding-bottom: 15px;
                border-bottom: 4px solid #1C5E40;
            }
            
            .header-left h1 {
                font-size: 24px;
                font-weight: bold;
                color: #333;
                margin-bottom: 8px;
            }
            
            .report-meta {
                color: #666;
                font-size: 12px;
                line-height: 1.4;
            }
            
            .header-right {
                text-align: right;
            }
            
            .pso-logo {
                width: 60px;
                height: 60px;
                background-color: #1C5E40;
                border-radius: 50%;
                margin-bottom: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: 16px;
            }
            
            .company-name {
                font-size: 16px;
                font-weight: bold;
                color: #ff6600;
            }
            
            /* Content Sections */
            .content-section {
                margin: 30px 0;
            }
            
            .section-title {
                font-size: 18px;
                font-weight: bold;
                color: #1C5E40;
                margin-bottom: 15px;
                padding-bottom: 5px;
                border-bottom: 2px solid #1C5E40;
            }
            
            /* Location Info Box */
            .location-info {
                background: #f8f9fa;
                border: 1px solid #ddd;
                border-left: 4px solid #1C5E40;
                padding: 20px;
                margin: 20px 0;
            }
            
            .info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
            }
            
            .info-item {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px solid #eee;
            }
            
            .info-item:last-child {
                border-bottom: none;
            }
            
            .info-label {
                font-weight: bold;
                color: #333;
            }
            
            .info-value {
                color: #666;
            }
            
            /* Executive Summary Cards */
            .summary-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 20px;
                margin: 25px 0;
            }
            
            .summary-card {
                background: white;
                border: 2px solid #ddd;
                padding: 20px;
                text-align: center;
            }
            
            .summary-card h3 {
                font-size: 14px;
                color: #666;
                margin-bottom: 10px;
                text-transform: uppercase;
            }
            
            .summary-card .value {
                font-size: 32px;
                font-weight: bold;
                color: #1C5E40;
                margin-bottom: 5px;
            }
            
            .summary-card .label {
                font-size: 12px;
                color: #999;
            }
            
            /* Statistics Table */
            .stats-table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
                background: white;
            }
            
            .stats-table th {
                background: #1C5E40;
                color: white;
                padding: 12px 15px;
                text-align: left;
                font-weight: bold;
                font-size: 14px;
                border: 1px solid #1C5E40;
            }
            
            .stats-table td {
                padding: 12px 15px;
                border: 1px solid #ddd;
                font-size: 12px;
            }
            
            .stats-table tr:nth-child(even) {
                background: #f9f9f9;
            }
            
            /* Competitors List */
            .competitors-list {
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                padding: 15px;
                margin: 15px 0;
            }
            
            .competitors-list h4 {
                color: #856404;
                margin-bottom: 10px;
                font-size: 14px;
            }
            
            .competitor-item {
                display: inline-block;
                background: white;
                border: 1px solid #ddd;
                padding: 5px 12px;
                margin: 3px;
                font-size: 11px;
                color: #333;
            }
            
            /* Footer */
            .page-footer {
                margin-top: 50px;
                border-top: 2px solid #1C5E40;
                padding-top: 10px;
                font-size: 12px;
                color: #666;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
        `;
    }

    createLandUseChartHTML(landUseData) {
        if (!landUseData.labels || landUseData.labels.length === 0) {
            return '<div style="color: #999;">No land use data available</div>';
        }
        
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
        let html = '<div style="display: flex; flex-wrap: wrap; gap: 5px; justify-content: center;">';
        
        landUseData.labels.forEach((label, index) => {
            const value = landUseData.datasets[0].data[index];
            const color = colors[index % colors.length];
            html += `
                <div style="display: flex; align-items: center; gap: 5px; font-size: 9px;">
                    <div style="width: 12px; height: 12px; background: ${color}; border-radius: 2px;"></div>
                    <span>${label}: ${value}</span>
                </div>
            `;
        });
        
        html += '</div>';
        return html;
    }

    createCompetitionChartHTML(competitionData) {
        if (!competitionData.labels || competitionData.labels.length === 0) {
            return '<div style="color: #999;">No competition data available</div>';
        }
        
        const maxValue = Math.max(...competitionData.datasets[0].data);
        let html = '<div style="display: flex; flex-direction: column; gap: 5px;">';
        
        competitionData.labels.forEach((label, index) => {
            const value = competitionData.datasets[0].data[index];
            const percentage = (value / maxValue) * 100;
            html += `
                <div style="display: flex; align-items: center; gap: 10px; font-size: 9px;">
                    <span style="min-width: 60px; text-align: left;">${label}</span>
                    <div style="flex: 1; background: #f0f0f0; height: 15px; border-radius: 3px; overflow: hidden;">
                        <div style="width: ${percentage}%; height: 100%; background: #3498db; border-radius: 3px;"></div>
                    </div>
                    <span style="min-width: 20px; text-align: right;">${value}</span>
                </div>
            `;
        });
        
        html += '</div>';
        return html;
    }

    createSSMChartHTML(ssmData) {
        if (!ssmData.labels || ssmData.labels.length === 0) {
            return '<div style="color: #999;">No SSM data available</div>';
        }
        
        let html = '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; align-items: center;">';
        
        ssmData.labels.forEach((label, index) => {
            const value = ssmData.datasets[0].data[index] || 0;
            const percentage = (value / 100) * 100;
            html += `
                <div style="text-align: center;">
                    <div style="font-size: 10px; margin-bottom: 5px; font-weight: bold;">${label}</div>
                    <div style="width: 60px; height: 60px; border-radius: 50%; background: conic-gradient(#1C6645 0% ${percentage}%, #f0f0f0 ${percentage}% 100%); margin: 0 auto; display: flex; align-items: center; justify-content: center;">
                        <div style="width: 40px; height: 40px; border-radius: 50%; background: white; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold;">
                            ${value}%
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        return html;
    }

    prepareReportData(allData) {
        const mapData = allData.map;
        const analysisData = allData.analysis;
        const ssmData = allData.ssm;
        
        return {
            // Header information
            title: 'Site Analysis Report',
            subtitle: 'Comprehensive Trading Area Assessment',
            reportId: `PSO-STA-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
            generatedOn: new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }),
            
            // Coordinates with safe fallbacks
            coordinates: {
                latitude: analysisData.searchCoordinates?.latitude || 0,
                longitude: analysisData.searchCoordinates?.longitude || 0,
                radius: analysisData.searchCoordinates?.radius || 0
            },
            
            // Executive Summary
            summary: {
                overallScore: ssmData.overallScore || 0,
                recommendation: ssmData.recommendation || 'Further analysis required',
                siteCategory: ssmData.siteCategory || 'Unknown',
                competitionLevel: mapData.marketAnalysis?.competitionLevel || 'Unknown',
                totalStations: mapData.totalStations || 0,
                dominantLandUse: analysisData.dominantLandUse || 'Mixed Use'
            },
            
            // Charts data
            landUseData: this.prepareLandUseChartData(analysisData),
            competitionData: this.prepareCompetitionChartData(mapData),
            ssmScoresData: this.prepareSSMChartData(ssmData),
            
            // Detailed analysis
            mapAnalysis: mapData,
            landUseAnalysis: analysisData,
            ssmAnalysis: ssmData,
            
            // Key metrics
            keyMetrics: {
                accessibilityScore: analysisData.accessibilityScore || 0,
                diversityIndex: analysisData.diversityIndex || 0,
                commercialViability: analysisData.commercialViability?.score || 0,
                marketOpportunity: mapData.marketAnalysis?.marketOpportunity?.score || 0
            }
        };
    }

    createHTMLPage2(data) {
        return `
            <div class="pso-header">
                <div class="pso-logo">Pakistan State Oil</div>
                <div class="pso-department">Retail Business | Site Selection Analysis</div>
            </div>
            
            <h2>Analysis & Data Visualization</h2>
            
            <div class="charts-grid">
                <div class="chart-container">
                    <div class="chart-title">Land Use Distribution</div>
                    <div class="chart-placeholder">
                        ${this.createLandUseChartHTML(data.landUseData)}
                    </div>
                </div>
                <div class="chart-container">
                    <div class="chart-title">Competition Analysis</div>
                    <div class="chart-placeholder">
                        ${this.createCompetitionChartHTML(data.competitionData)}
                    </div>
                </div>
            </div>
            
            <div style="margin: 30px 0;">
                <div class="chart-container">
                    <div class="chart-title">Site Selection Matrix Scores</div>
                    <div class="chart-placeholder" style="height: 200px;">
                        ${this.createSSMChartHTML(data.ssmScoresData)}
                    </div>
                </div>
            </div>
            
            <h3>Key Performance Indicators</h3>
            <table class="metrics-table">
                <thead>
                    <tr>
                        <th>Metric</th>
                        <th>Value</th>
                        <th>Score</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Accessibility Score</td>
                        <td>${data.keyMetrics.accessibilityScore || 'N/A'}</td>
                        <td>${data.keyMetrics.accessibilityScore || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td>Diversity Index</td>
                        <td>${data.keyMetrics.diversityIndex || 'N/A'}</td>
                        <td>${data.keyMetrics.diversityIndex || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td>Commercial Viability</td>
                        <td>${data.keyMetrics.commercialViability || 'N/A'}</td>
                        <td>${data.keyMetrics.commercialViability || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td>Market Opportunity</td>
                        <td>${data.keyMetrics.marketOpportunity || 'N/A'}</td>
                        <td>${data.keyMetrics.marketOpportunity || 'N/A'}</td>
                    </tr>
                </tbody>
            </table>
            
            <div class="page-footer">
                <span>PSO Site Selection Analysis Report</span>
                <span>Page 2</span>
            </div>
        `;
    }

    createHTMLPage3(data) {
        const recommendations = this.generateRecommendations(data);
        const risks = this.generateRiskAssessment(data);
        
        return `
            <div class="pso-header">
                <div class="pso-logo">Pakistan State Oil</div>
                <div class="pso-department">Retail Business | Site Selection Analysis</div>
            </div>
            
            <h2>Recommendations & Strategic Analysis</h2>
            
            <h3>Strategic Recommendations</h3>
            <ul class="recommendation-list">
                ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
            
            <h3>Risk Assessment</h3>
            <ul class="risk-list">
                ${risks.map(risk => `<li>${risk}</li>`).join('')}
            </ul>
            
            <h3>Implementation Roadmap</h3>
            <div class="timeline">
                <div class="timeline-phase phase-1">
                    <div class="phase-name">Site Preparation</div>
                    <div class="phase-duration">2-3 months</div>
                </div>
                <div class="timeline-phase phase-2">
                    <div class="phase-name">Construction</div>
                    <div class="phase-duration">4-6 months</div>
                </div>
                <div class="timeline-phase phase-3">
                    <div class="phase-name">Testing & Setup</div>
                    <div class="phase-duration">1 month</div>
                </div>
                <div class="timeline-phase phase-4">
                    <div class="phase-name">Launch</div>
                    <div class="phase-duration">2 weeks</div>
                </div>
            </div>
            
            <div style="margin-top: 40px; padding: 20px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #1C6645;">
                <h4 style="color: #1C6645; margin-bottom: 10px;">Report Summary</h4>
                <p style="font-size: 11px; line-height: 1.6; color: #666;">
                    This comprehensive site analysis provides strategic insights for PSO's expansion planning. 
                    The analysis covers market competition, land use patterns, accessibility factors, and 
                    site-specific recommendations to support informed decision-making for fuel station development.
                </p>
            </div>
            
            <div class="page-footer">
                <span>PSO Site Selection Analysis Report</span>
                <span>Page 3</span>
            </div>
        `;
    }

    // Chart data preparation methods (kept for HTML charts)
    prepareLandUseChartData(analysisData) {
        const landUse = analysisData.landUse?.percentages || analysisData.landUse?.counts || {};
        
        return {
            labels: Object.keys(landUse),
            datasets: [{
                data: Object.values(landUse),
                backgroundColor: [
                    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'
                ],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        };
    }

    prepareCompetitionChartData(mapData) {
        const brands = mapData.brandCounts || {};
        
        return {
            labels: Object.keys(brands),
            datasets: [{
                label: 'Number of Stations',
                data: Object.values(brands),
                backgroundColor: '#3498db',
                borderColor: '#2980b9',
                borderWidth: 1
            }]
        };
    }

    prepareSSMChartData(ssmData) {
        const scores = ssmData.psoScores || {};
        
        return {
            labels: ['Traffic', 'Competition', 'Land', 'Socio-Economic'],
            datasets: [{
                label: 'SSM Scores',
                data: [
                    scores.traffic || 0,
                    scores.competition || 0,
                    scores.land || 0,
                    scores.socioEconomic || 0
                ],
                backgroundColor: 'rgba(0, 170, 68, 0.2)',
                borderColor: 'rgba(0, 170, 68, 1)',
                borderWidth: 2
            }]
        };
    }

    createProfessionalPage1(data) {
        // Extract station data for analysis
        const allData = this.getAllData();
        const mapData = allData.map || {};
        const stations = mapData.stations || [];
        
        // Calculate PSO and competitor statistics
        const totalStations = stations.length;
        const psoStations = stations.filter(s => 
            s.brand && s.brand.toLowerCase().includes('pso')
        );
        const competitors = stations.filter(s => 
            s.brand && !s.brand.toLowerCase().includes('pso')
        );
        
        // Get unique competitor names
        const competitorNames = [...new Set(competitors.map(s => s.brand))].filter(name => name);
        
        // Get coordinates safely
        const coords = data.coordinates || allData.analysis?.searchCoordinates || allData.map?.coordinates || {};
        const latitude = coords.latitude || 0;
        const longitude = coords.longitude || 0;
        const radius = coords.radius || mapData.searchRadius || 0;
        
        return `
            <!-- Professional PSO Header -->
            <div class="pso-header">
                <div class="header-left">
                    <h1>Channel Development Department</h1>
                    <div class="report-meta">
                        <div>Report Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                        <div>Report ID: ${data.reportId || 'PSO-STA-' + new Date().toISOString().slice(0, 10).replace(/-/g, '')}</div>
                    </div>
                </div>
                <div class="header-right">
                    <div class="pso-logo">PSO</div>
                    <div class="company-name">Pakistan State Oil</div>
                </div>
            </div>
            
            <!-- Location Information Section -->
            <div class="content-section">
                <h2 class="section-title">Location Information</h2>
                <div class="location-info">
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="info-label">Latitude:</span>
                            <span class="info-value">${latitude.toFixed(6)}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Longitude:</span>
                            <span class="info-value">${longitude.toFixed(6)}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Analysis Radius:</span>
                            <span class="info-value">${radius ? (radius / 1000).toFixed(1) + ' km' : 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Analysis Date:</span>
                            <span class="info-value">${new Date().toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Executive Summary Section -->
            <div class="content-section">
                <h2 class="section-title">Executive Summary</h2>
                
                <div class="summary-grid">
                    <div class="summary-card">
                        <h3>Total Stations</h3>
                        <div class="value">${totalStations}</div>
                        <div class="label">Within Analysis Radius</div>
                    </div>
                    
                    <div class="summary-card">
                        <h3>PSO Stations</h3>
                        <div class="value">${psoStations.length}</div>
                        <div class="label">PSO Market Presence</div>
                    </div>
                    
                    <div class="summary-card">
                        <h3>Competitors</h3>
                        <div class="value">${competitors.length}</div>
                        <div class="label">Competing Stations</div>
                    </div>
                    
                    <div class="summary-card">
                        <h3>Market Share</h3>
                        <div class="value">${totalStations > 0 ? ((psoStations.length / totalStations) * 100).toFixed(1) : 0}%</div>
                        <div class="label">PSO Market Share</div>
                    </div>
                </div>
                
                <!-- Detailed Statistics Table -->
                <table class="stats-table">
                    <thead>
                        <tr>
                            <th>Metric</th>
                            <th>Value</th>
                            <th>Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Total Fuel Stations</td>
                            <td><strong>${totalStations}</strong></td>
                            <td>All stations within ${radius ? (radius / 1000).toFixed(1) + ' km' : 'analysis'} radius</td>
                        </tr>
                        <tr>
                            <td>PSO Stations</td>
                            <td><strong>${psoStations.length}</strong></td>
                            <td>Current PSO market presence</td>
                        </tr>
                        <tr>
                            <td>Competitor Stations</td>
                            <td><strong>${competitors.length}</strong></td>
                            <td>Non-PSO fuel stations</td>
                        </tr>
                        <tr>
                            <td>Unique Competitors</td>
                            <td><strong>${competitorNames.length}</strong></td>
                            <td>Different fuel brands present</td>
                        </tr>
                        <tr>
                            <td>Market Density</td>
                            <td><strong>${radius > 0 ? (totalStations / Math.PI / Math.pow(radius / 1000, 2)).toFixed(2) : 'N/A'}</strong></td>
                            <td>Stations per sq km</td>
                        </tr>
                    </tbody>
                </table>
                
                ${competitorNames.length > 0 ? `
                <div class="competitors-list">
                    <h4>Competitor Brands Identified:</h4>
                    ${competitorNames.map(name => `<span class="competitor-item">${name}</span>`).join('')}
                </div>
                ` : ''}
            </div>
            
            <!-- Footer -->
            <div class="page-footer">
                <span>PSO Channel Development - Site Analysis Report</span>
                <span>Page 1 of 1</span>
            </div>
        `;
    }

    generateRecommendations(data) {
        const recommendations = [];
        const score = data.summary.overallScore;
        
        if (score >= 80) {
            recommendations.push('Highly recommended site with excellent potential for PSO station');
            recommendations.push('Proceed with detailed feasibility study and site acquisition');
        } else if (score >= 60) {
            recommendations.push('Good potential site requiring strategic considerations');
            recommendations.push('Evaluate competitive positioning and market entry strategy');
        } else if (score >= 40) {
            recommendations.push('Moderate potential requiring significant market development');
            recommendations.push('Consider long-term growth prospects and infrastructure development');
        } else {
            recommendations.push('Low potential site not recommended for immediate development');
            recommendations.push('Monitor market conditions and reassess in future planning cycles');
        }
        
        return recommendations;
    }

    generateRiskAssessment(data) {
        const risks = [];
        
        if (data.summary.competitionLevel === 'High') {
            risks.push('High competition risk - market saturation concerns');
        }
        
        if (data.summary.totalStations > 10) {
            risks.push('Market oversaturation - limited growth potential');
        }
        
        if (data.summary.overallScore < 50) {
            risks.push('Low viability score - investment risk assessment required');
        }
        
        if (risks.length === 0) {
            risks.push('Low risk profile - favorable conditions for development');
        }
        
        return risks;
    }



    // ========================================
    // REPORT GENERATION UI COMPONENTS
    // ========================================

    showReportGenerationUI() {
        // Create loading overlay
        const overlay = document.createElement('div');
        overlay.id = 'reportGenerationOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            backdrop-filter: blur(5px);
        `;

        const loadingCard = document.createElement('div');
        loadingCard.style.cssText = `
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 20px;
            padding: 40px;
            text-align: center;
            color: white;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            max-width: 400px;
            width: 90%;
        `;

        loadingCard.innerHTML = `
            <div class="loading-spinner" style="
                width: 60px;
                height: 60px;
                border: 4px solid rgba(255, 255, 255, 0.3);
                border-top: 4px solid white;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
            "></div>
            <h3 style="margin: 0 0 10px; font-size: 24px; font-weight: bold;">
                Generating Report
            </h3>
            <p style="margin: 0 0 20px; opacity: 0.9; font-size: 16px;">
                Creating comprehensive site analysis report...
            </p>
            <div class="progress-bar" style="
                width: 100%;
                height: 6px;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 3px;
                overflow: hidden;
            ">
                <div class="progress-fill" style="
                    height: 100%;
                    background: white;
                    border-radius: 3px;
                    animation: progress 3s ease-in-out;
                    transform: translateX(-100%);
                "></div>
            </div>
        `;

        // Add CSS animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            @keyframes progress {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(0%); }
            }
        `;
        document.head.appendChild(style);

        overlay.appendChild(loadingCard);
        document.body.appendChild(overlay);
    }

    showReportSuccessUI(pdfBlob) {
        // Remove loading overlay
        const overlay = document.getElementById('reportGenerationOverlay');
        if (overlay) overlay.remove();

        // Create success modal
        const modal = document.createElement('div');
        modal.id = 'reportSuccessModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            backdrop-filter: blur(5px);
        `;

        const successCard = document.createElement('div');
        successCard.style.cssText = `
            background: white;
            border-radius: 20px;
            padding: 40px;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            max-width: 500px;
            width: 90%;
        `;

        const fileSize = (pdfBlob.size / 1024).toFixed(1);
        const fileName = `PSO_Site_Analysis_${new Date().toISOString().slice(0, 10)}.pdf`;

        successCard.innerHTML = `
            <div style="
                width: 80px;
                height: 80px;
                background: linear-gradient(135deg, #00AA44, #00DD55);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 20px;
                box-shadow: 0 10px 20px rgba(0, 170, 68, 0.3);
            ">
                <svg width="40" height="40" fill="white" viewBox="0 0 24 24">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                </svg>
            </div>
            
            <h3 style="margin: 0 0 10px; color: #333; font-size: 24px; font-weight: bold;">
                Report Generated Successfully!
            </h3>
            
            <div style="
                background: #f8f9fa;
                border-radius: 10px;
                padding: 20px;
                margin: 20px 0;
                border-left: 4px solid #00AA44;
            ">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                    <span style="font-weight: bold; color: #333;">📄 ${fileName}</span>
                </div>
                <div style="display: flex; justify-content: space-between; color: #666; font-size: 14px;">
                    <span>📊 Size: ${fileSize} KB</span>
                    <span>📅 Generated: ${new Date().toLocaleTimeString()}</span>
                </div>
            </div>
            
            <div style="display: flex; gap: 15px; margin-top: 30px;">
                <button id="downloadReportBtn" style="
                    flex: 1;
                    background: linear-gradient(135deg, #00AA44, #00DD55);
                    color: white;
                    border: none;
                    padding: 15px 20px;
                    border-radius: 10px;
                    font-size: 16px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.3s ease;
                ">
                    📥 Download PDF
                </button>
                
                <button id="viewReportBtn" style="
                    flex: 1;
                    background: white;
                    color: #00AA44;
                    border: 2px solid #00AA44;
                    padding: 15px 20px;
                    border-radius: 10px;
                    font-size: 16px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.3s ease;
                ">
                    👁️ View in Browser
                </button>
            </div>
            
            <button id="closeReportModal" style="
                position: absolute;
                top: 15px;
                right: 15px;
                background: none;
                border: none;
                font-size: 24px;
                color: #999;
                cursor: pointer;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
            ">&times;</button>
        `;

        modal.appendChild(successCard);
        document.body.appendChild(modal);

        // Add event listeners
        document.getElementById('downloadReportBtn').onclick = () => {
            this.downloadPDF(pdfBlob, fileName);
        };

        document.getElementById('viewReportBtn').onclick = () => {
            this.viewPDFInBrowser(pdfBlob);
        };

        document.getElementById('closeReportModal').onclick = () => {
            modal.remove();
        };

        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };
    }

    showReportErrorUI(errorMessage) {
        // Remove loading overlay
        const overlay = document.getElementById('reportGenerationOverlay');
        if (overlay) overlay.remove();

        // Show error notification
        const errorModal = document.createElement('div');
        errorModal.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff4757;
            color: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 10px 20px rgba(255, 71, 87, 0.3);
            z-index: 10001;
            max-width: 400px;
        `;

        errorModal.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 20px;">❌</span>
                <div>
                    <h4 style="margin: 0 0 5px;">Report Generation Failed</h4>
                    <p style="margin: 0; font-size: 14px; opacity: 0.9;">${errorMessage}</p>
                </div>
            </div>
        `;

        document.body.appendChild(errorModal);

        setTimeout(() => {
            errorModal.remove();
        }, 5000);
    }

    downloadPDF(pdfBlob, fileName) {
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Close modal
        const modal = document.getElementById('reportSuccessModal');
        if (modal) modal.remove();
    }

    viewPDFInBrowser(pdfBlob) {
        const url = URL.createObjectURL(pdfBlob);
        window.open(url, '_blank');
        
        // Close modal
        const modal = document.getElementById('reportSuccessModal');
        if (modal) modal.remove();
    }
}

// ========================================
// INITIALIZE STORAGE MANAGER
// ========================================

// Create global instance
window.storageManager = new StorageManager();

// ========================================
// GLOBAL HELPER FUNCTIONS FOR BACKWARD COMPATIBILITY
// ========================================

window.setMapData = (data) => window.storageManager.setMapData(data);
window.getMapData = () => window.storageManager.getMapData();
window.hasMapData = () => window.storageManager.hasMapData();

window.setAnalysisData = (data) => window.storageManager.setAnalysisData(data);
window.getAnalysisData = () => window.storageManager.getAnalysisData();
window.hasAnalysisData = () => window.storageManager.hasAnalysisData();

window.setSSMData = (data) => window.storageManager.setSSMData(data);
window.getSSMData = () => window.storageManager.getSSMData();
window.hasSSMData = () => window.storageManager.hasSSMData();

window.getAllStorageData = () => window.storageManager.getAllData();
window.getStorageStatus = () => window.storageManager.getStorageStatus();
window.clearAllData = () => window.storageManager.clearData('all');

// Add generateReport function to global scope
window.generateReport = () => window.storageManager.generateReport();

// Event listener for storage changes
window.addEventListener('storageUpdated', (event) => {
    console.log(`📢 Storage updated for ${event.detail.module} module at ${event.detail.timestamp}`);
});

console.log('🏪 Comprehensive Storage Manager loaded successfully');
console.log('📊 Available functions: setMapData(), getMapData(), setAnalysisData(), getAnalysisData(), setSSMData(), getSSMData()');
console.log('🔄 Auto-syncing enabled across all modules');
console.log('📋 Report generation: generateReport() function available');