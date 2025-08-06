// ========================================
// UNIFIED DATA GENERATOR
// ========================================
// This module ensures consistent data generation across all analyzers

class UnifiedDataGenerator {
    constructor() {
        this.coordinateKey = null;
        this.seedData = new Map(); // Store consistent data by coordinate key
    }

    // Generate a unique key for coordinates to ensure consistency
    getCoordinateKey(lat, lng, radius) {
        // Round to 6 decimal places for consistency
        const roundedLat = parseFloat(lat.toFixed(6));
        const roundedLng = parseFloat(lng.toFixed(6));
        const roundedRadius = parseFloat(radius.toFixed(2));
        return `${roundedLat}_${roundedLng}_${roundedRadius}`;
    }

    // Set seed for consistent random data generation
    setSeed(coordinateKey) {
        this.coordinateKey = coordinateKey;
        // Create a simple seed from coordinate key for consistent random generation
        this.seed = this.stringToSeed(coordinateKey);
    }

    // Convert string to numeric seed
    stringToSeed(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    // Seeded random number generator for consistent results
    seededRandom(min = 0, max = 1) {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        const randomValue = this.seed / 233280;
        return min + (randomValue * (max - min));
    }

    // Generate consistent mock stations for the same coordinates
    generateConsistentFuelStations(lat, lng, radius) {
        const key = this.getCoordinateKey(lat, lng, radius);
        
        if (this.seedData.has(key + '_stations')) {
            return this.seedData.get(key + '_stations');
        }

        this.setSeed(key);
        
        const brands = ['PSO', 'Shell', 'Total', 'Attock', 'Hascol', 'Caltex', 'Byco'];
        const stationCount = Math.floor(this.seededRandom(8, 15));
        const stations = [];

        for (let i = 0; i < stationCount; i++) {
            const angle = this.seededRandom(0, 2 * Math.PI);
            const distance = this.seededRandom(0.5, radius * 0.9);
            const stationLat = lat + (distance / 111) * Math.cos(angle);
            const stationLng = lng + (distance / (111 * Math.cos(lat * Math.PI / 180))) * Math.sin(angle);
            
            const brand = brands[Math.floor(this.seededRandom(0, brands.length))];
            
            stations.push({
                id: `station_${i + 1}`,
                name: `${brand} Fuel Station ${i + 1}`,
                brand: brand,
                lat: parseFloat(stationLat.toFixed(6)),
                lng: parseFloat(stationLng.toFixed(6)),
                distance: parseFloat(distance.toFixed(2)),
                address: `${brand} Station, Area ${Math.floor(this.seededRandom(1, 10))}`,
                amenities: this.generateStationAmenities(),
                services: ['Petrol', 'Diesel'],
                rating: parseFloat((3 + this.seededRandom(0, 2)).toFixed(1)),
                isOpen: this.seededRandom(0, 1) > 0.1
            });
        }

        // Store for consistency
        this.seedData.set(key + '_stations', stations);
        return stations;
    }

    // Generate consistent amenities for stations
    generateStationAmenities() {
        const amenities = [];
        const possibleAmenities = ['ATM', 'Convenience Store', 'Car Wash', 'Air Pump', 'Toilet'];
        
        possibleAmenities.forEach(amenity => {
            if (this.seededRandom(0, 1) > 0.5) {
                amenities.push(amenity);
            }
        });
        
        return amenities;
    }

    // Generate consistent land use data
    generateConsistentLandUse(lat, lng, radius) {
        const key = this.getCoordinateKey(lat, lng, radius);
        
        if (this.seedData.has(key + '_landuse')) {
            return this.seedData.get(key + '_landuse');
        }

        this.setSeed(key);

        const landUseTypes = {
            commercial: Math.floor(this.seededRandom(3, 8)),
            residential: Math.floor(this.seededRandom(5, 12)),
            mixed: Math.floor(this.seededRandom(2, 6)),
            industrial: Math.floor(this.seededRandom(1, 4)),
            other: Math.floor(this.seededRandom(0, 3))
        };

        const amenities = this.generateConsistentAmenities(lat, lng);

        const landUseData = {
            types: landUseTypes,
            primary: this.determinePrimaryLandUse(landUseTypes),
            secondary: this.determineSecondaryLandUse(landUseTypes),
            diversity: this.calculateLandUseDiversity(landUseTypes),
            amenities: amenities,
            viabilityScore: this.calculateViabilityScore(landUseTypes, amenities)
        };

        this.seedData.set(key + '_landuse', landUseData);
        return landUseData;
    }

    // Generate consistent amenities
    generateConsistentAmenities(lat, lng) {
        const amenityTypes = {
            schools: Math.floor(this.seededRandom(1, 4)),
            universities: Math.floor(this.seededRandom(0, 2)),
            malls: Math.floor(this.seededRandom(1, 3)),
            restaurants: Math.floor(this.seededRandom(3, 8)),
            hospitals: Math.floor(this.seededRandom(1, 2)),
            banks: Math.floor(this.seededRandom(2, 5))
        };

        return amenityTypes;
    }

    // Generate consistent SSM data
    generateConsistentSSMData(lat, lng, radius) {
        const key = this.getCoordinateKey(lat, lng, radius);
        
        if (this.seedData.has(key + '_ssm')) {
            return this.seedData.get(key + '_ssm');
        }

        this.setSeed(key);

        // Use the same station data for competition analysis
        const stations = this.generateConsistentFuelStations(lat, lng, radius);
        const landUse = this.generateConsistentLandUse(lat, lng, radius);

        const siteType = this.determineSiteType(lat, lng);
        
        const ssmScores = {
            traffic: Math.floor(this.seededRandom(60, 85)),
            competition: Math.floor(this.seededRandom(45, 75)),
            land: Math.floor(this.seededRandom(55, 80)),
            socioEconomic: Math.floor(this.seededRandom(65, 85))
        };

        const totalScore = Math.floor(
            ssmScores.traffic * (siteType === 'HIGHWAY' ? 0.6 : 0.45) +
            ssmScores.competition * 0.1 +
            ssmScores.land * 0.1 +
            ssmScores.socioEconomic * (siteType === 'HIGHWAY' ? 0.2 : 0.35)
        );

        const ssmData = {
            siteType: siteType,
            scores: ssmScores,
            totalScore: totalScore,
            category: this.determineCategory(totalScore),
            competition: {
                totalStations: stations.length,
                psoStations: stations.filter(s => s.brand === 'PSO').length,
                competitors: stations.filter(s => s.brand !== 'PSO').length
            }
        };

        this.seedData.set(key + '_ssm', ssmData);
        return ssmData;
    }

    // Helper methods
    determinePrimaryLandUse(landUseTypes) {
        return Object.keys(landUseTypes).reduce((a, b) => 
            landUseTypes[a] > landUseTypes[b] ? a : b
        );
    }

    determineSecondaryLandUse(landUseTypes) {
        const sorted = Object.entries(landUseTypes).sort(([,a], [,b]) => b - a);
        return sorted.length > 1 ? sorted[1][0] : null;
    }

    calculateLandUseDiversity(landUseTypes) {
        const total = Object.values(landUseTypes).reduce((sum, count) => sum + count, 0);
        if (total === 0) return 0;

        let diversity = 0;
        Object.values(landUseTypes).forEach(count => {
            const proportion = count / total;
            if (proportion > 0) {
                diversity -= proportion * Math.log2(proportion);
            }
        });

        return parseFloat(diversity.toFixed(2));
    }

    calculateViabilityScore(landUseTypes, amenities) {
        const landScore = (landUseTypes.commercial * 2 + landUseTypes.mixed * 1.5) / 10;
        const amenityScore = Object.values(amenities).reduce((sum, count) => sum + count, 0) / 5;
        return parseFloat(Math.min(landScore + amenityScore, 10).toFixed(1));
    }

    determineSiteType(lat, lng) {
        // Simple logic based on coordinates - in real world, you'd check actual road data
        const latStr = lat.toString();
        const lngStr = lng.toString();
        const lastDigit = parseInt(latStr.slice(-1)) + parseInt(lngStr.slice(-1));
        
        return lastDigit > 10 ? 'HIGHWAY' : 'CITY';
    }

    determineCategory(totalScore) {
        if (totalScore >= 80) return 'CF';
        if (totalScore >= 60) return 'DFA';
        if (totalScore >= 49) return 'DFB';
        return 'DFC';
    }

    // Clear stored data (for testing)
    clearCache() {
        this.seedData.clear();
    }
}

// Make globally available
window.UnifiedDataGenerator = UnifiedDataGenerator;
