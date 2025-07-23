// SSM.js - Site Selection Metrics Implementation
// PSO Site Classification System based on official parameters

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
    console.log('SSM System Initialized');
    
    // Try to sync coordinates from map on page load
    syncCoordinatesFromMap();
    
    // Add event listeners
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Coordinate input validation
    document.getElementById('ssm-latitude').addEventListener('input', validateCoordinates);
    document.getElementById('ssm-longitude').addEventListener('input', validateCoordinates);
    
    // Site type change handler
    document.querySelectorAll('input[name="siteType"]').forEach(radio => {
        radio.addEventListener('change', updateSiteTypeDisplay);
    });
}

// Sync coordinates from map page
function syncCoordinatesFromMap() {
    try {
        // Try multiple methods to get coordinates
        const urlParams = new URLSearchParams(window.location.search);
        let lat = urlParams.get('lat');
        let lng = urlParams.get('lng');
        
        // Try localStorage if URL params not available
        if (!lat || !lng) {
            lat = localStorage.getItem('mapLatitude');
            lng = localStorage.getItem('mapLongitude');
        }
        
        // Try sessionStorage as backup
        if (!lat || !lng) {
            lat = sessionStorage.getItem('selectedLatitude');
            lng = sessionStorage.getItem('selectedLongitude');
        }
        
        if (lat && lng) {
            document.getElementById('ssm-latitude').value = parseFloat(lat).toFixed(6);
            document.getElementById('ssm-longitude').value = parseFloat(lng).toFixed(6);
            
            showTemporaryMessage('✅ Coordinates synced from map successfully!', 'success');
            return true;
        } else {
            showTemporaryMessage('⚠️ No coordinates found. Please enter manually or visit Map page first.', 'warning');
            return false;
        }
    } catch (error) {
        console.error('Error syncing coordinates:', error);
        showTemporaryMessage('❌ Error syncing coordinates from map.', 'error');
        return false;
    }
}

// Validate coordinate inputs
function validateCoordinates() {
    const lat = parseFloat(document.getElementById('ssm-latitude').value);
    const lng = parseFloat(document.getElementById('ssm-longitude').value);
    
    const latValid = !isNaN(lat) && lat >= -90 && lat <= 90;
    const lngValid = !isNaN(lng) && lng >= -180 && lng <= 180;
    
    const analyzeBtn = document.getElementById('analyzeSSMBtn');
    
    if (latValid && lngValid) {
        analyzeBtn.disabled = false;
        analyzeBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    } else {
        analyzeBtn.disabled = true;
        analyzeBtn.classList.add('opacity-50', 'cursor-not-allowed');
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

// Main SSM Analysis Function
async function performSSMAnalysis() {
    if (analysisInProgress) {
        showTemporaryMessage('⏳ Analysis already in progress...', 'info');
        return;
    }
    
    const lat = parseFloat(document.getElementById('ssm-latitude').value);
    const lng = parseFloat(document.getElementById('ssm-longitude').value);
    const radius = parseFloat(document.getElementById('ssm-radius').value);
    const siteType = document.querySelector('input[name="siteType"]:checked').value;
    
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
        
        console.log('✅ SSM Analysis completed successfully');
        
    } catch (error) {
        console.error('❌ SSM Analysis failed:', error);
        showTemporaryMessage('❌ Analysis failed. Please try again.', 'error');
        hideLoadingState();
    } finally {
        analysisInProgress = false;
    }
}

// Execute Comprehensive Analysis
async function executeComprehensiveAnalysis(lat, lng, radius, siteType) {
    console.log('📊 Executing comprehensive analysis...');
    
    // Parallel execution of all analysis components
    const [trafficData, competitionData, landData, socioEconomicData] = await Promise.all([
        analyzeTrafficNearLocation(lat, lng, radius, siteType),
        analyzeCompetitionNearLocation(lat, lng, radius),
        analyzeLandCharacteristics(lat, lng, radius),
        analyzeSocioEconomicProfile(lat, lng, radius)
    ]);
    
    return {
        traffic: trafficData,
        competition: competitionData,
        land: landData,
        socioEconomic: socioEconomicData
    };
}

// 1. Traffic Near Location Analysis
async function analyzeTrafficNearLocation(lat, lng, radius, siteType) {
    console.log('🚗 Analyzing traffic near location...');
    
    try {
        // Simulate comprehensive traffic analysis
        await new Promise(resolve => setTimeout(resolve, 1500));
        
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

// 2. Competition Near Location Analysis
async function analyzeCompetitionNearLocation(lat, lng, radius) {
    console.log('🏪 Analyzing competition near location...');
    
    try {
        // Simulate competition analysis using existing map.js functionality
        await new Promise(resolve => setTimeout(resolve, 1000));
        
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

// 3. Land Characteristics Analysis
async function analyzeLandCharacteristics(lat, lng, radius) {
    console.log('🗺️ Analyzing land characteristics...');
    
    try {
        await new Promise(resolve => setTimeout(resolve, 800));
        
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

// 4. Socio Economic Profile and NFR Potential Analysis
async function analyzeSocioEconomicProfile(lat, lng, radius) {
    console.log('👥 Analyzing socio-economic profile...');
    
    try {
        await new Promise(resolve => setTimeout(resolve, 1200));
        
        // Population analysis
        const populationDensity = calculatePopulationDensity(lat, lng);
        const economicLevel = determineEconomicLevel(lat, lng);
        const vehicleOwnership = estimateVehicleOwnership(lat, lng, economicLevel);
        const fuelConsumptionPotential = calculateFuelConsumptionPotential(populationDensity, vehicleOwnership);
        const nfrPotential = calculateNFRPotential(lat, lng, economicLevel);
        
        // Get max score based on site type
        const maxScore = document.querySelector('input[name="siteType"]:checked').value === 'city' 
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

// Determine road classification based on coordinates
function determineRoadClassification(lat, lng) {
    // Simplified logic - in real implementation, use OSM data
    const random = Math.random();
    if (random > 0.8) return 'highway';
    if (random > 0.6) return 'primary';
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
        document.getElementById('ssm-latitude').value = lat;
        document.getElementById('ssm-longitude').value = lng;
        
        if (radius) {
            document.getElementById('ssm-radius').value = radius;
        }
        
        if (siteType && (siteType === 'city' || siteType === 'highway')) {
            document.querySelector(`input[name="siteType"][value="${siteType}"]`).checked = true;
        }
        
        // Auto-analyze if all parameters are present
        if (urlParams.get('autoAnalyze') === 'true') {
            setTimeout(performSSMAnalysis, 1000);
        }
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
    console.log('🚀 PSO Site Selection Metrics System Initialized');
    
    // Initialize from URL if parameters present
    initializeFromURL();
    
    // Enhanced coordinate validation
    document.getElementById('ssm-latitude').addEventListener('input', validatePakistanCoordinates);
    document.getElementById('ssm-longitude').addEventListener('input', validatePakistanCoordinates);
    
    // Try to sync coordinates from map
    syncCoordinatesFromMap();
    
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
window.syncCoordinatesFromMap = syncCoordinatesFromMap;
window.exportSSMResults = exportSSMResults;
window.printSSMReport = printSSMReport;