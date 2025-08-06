# Auto-Generation System Documentation

## Overview
The Auto-Generation System allows users to automatically generate analysis data for all three modules (Map Analysis, Land Use Analysis, SSM) from the Report page without manually visiting each page.

## Features

### 1. Data Availability Check
- The "Generate Report" button is disabled when any module data is missing
- Hover tooltip shows which data is missing
- Auto-enables when all required data is available

### 2. Auto-Generate Data Button
- Blue button next to "Generate Report"
- Opens a coordinate input modal
- Pre-fills with previously saved coordinates
- Validates input before proceeding

### 3. Progress Modal
- Shows real-time progress of data generation
- Three-step process with visual indicators:
  1. Fuel station data analysis
  2. Land use pattern analysis
  3. Site selection metrics calculation
- Progress bar and step completion indicators

### 4. HTML-Independent Analyzers
Three new analyzer modules have been created:
- `map-analyzer-v2.js` - Analyzes fuel stations without HTML dependencies
- `analysis-v2.js` - Performs land use analysis without HTML dependencies
- `ssm-analyzer-v2.js` - Calculates site selection metrics without HTML dependencies

## How It Works

### Data Flow
1. User enters coordinates in the auto-generation modal
2. Coordinates are validated and saved to cookies
3. Progress modal displays showing current step
4. Each analyzer runs sequentially:
   - MapAnalyzerV2 fetches and analyzes fuel station data
   - LandUseAnalyzerV2 performs comprehensive land use analysis
   - SSMAnalyzerV2 calculates PSO scoring metrics
5. All data is automatically stored in StorageManager
6. Report page refreshes to show updated data availability
7. Generate Report button becomes enabled

### Data Storage Format
Each analyzer stores data in the same format as the original HTML-dependent versions:

#### Map Data Structure
```javascript
{
    searchCoordinates: { lat, lng },
    radius: number,
    stations: [array of fuel stations],
    statistics: {object with stats},
    distanceData: {distance calculations},
    timestamp: ISO string,
    generatedBy: 'MapAnalyzerV2'
}
```

#### Analysis Data Structure
```javascript
{
    searchCoordinates: { lat, lng },
    radius: number,
    landUse: {land use analysis},
    amenities: {amenity analysis},
    areaAnalysis: {area-based calculations},
    siteCharacteristics: {site type and features},
    viabilityScores: {scoring breakdown},
    timestamp: ISO string,
    generatedBy: 'LandUseAnalyzerV2'
}
```

#### SSM Data Structure
```javascript
{
    searchCoordinates: { lat, lng },
    radius: number,
    siteType: 'CITY' | 'HIGHWAY',
    analysisResults: {comprehensive analysis},
    psoScores: {PSO scoring breakdown},
    siteCategory: {category classification},
    recommendations: [array of recommendations],
    timestamp: ISO string,
    generatedBy: 'SSMAnalyzerV2'
}
```

## API Integration
- Uses Overpass API for real-time data fetching
- Implements rate limiting (1-1.5 second delays between requests)
- Fallback data provided when APIs are unavailable
- Comprehensive error handling with graceful degradation

## User Interface Elements

### Auto-Generate Button
```html
<button onclick="showAutoGenerateModal()" id="autoGenerateBtn">
    <i class="fas fa-magic mr-2"></i>
    <span>Auto Generate Data</span>
</button>
```

### Coordinate Input Modal
- Latitude/Longitude inputs with validation
- Radius selector (1-10 km)
- Pre-filled with saved values
- Input validation and error messages

### Progress Modal
- Loading spinner animation
- Step-by-step progress indicators
- Real-time status updates
- Progress bar with percentage

## Functions Reference

### Main Functions
- `showAutoGenerateModal()` - Opens coordinate input
- `startAutoGeneration()` - Begins analysis process
- `checkDataAvailabilityForReportGeneration()` - Updates button state
- `loadAnalysisModules()` - Verifies analyzer availability

### Utility Functions
- `saveCoordinates(lat, lng, radius)` - Saves to cookies
- `loadSavedCoordinates()` - Loads from cookies
- `updateProgressStep(step, status)` - Updates progress UI
- `setCookie()` / `getCookie()` - Cookie management

### Analyzer Classes
- `MapAnalyzerV2.analyzeLocation(lat, lng, radius)`
- `LandUseAnalyzerV2.analyzeLocation(lat, lng, radius)`
- `SSMAnalyzerV2.analyzeLocation(lat, lng, radius)`

## Error Handling
- API timeout handling with fallback data
- Input validation with user-friendly messages
- Progress modal error states
- Graceful degradation when services unavailable

## Browser Compatibility
- Modern browsers with ES6+ support
- Uses Fetch API for HTTP requests
- LocalStorage for data persistence
- CSS Grid and Flexbox for layout

## Dependencies
- StorageManager.js (required for data persistence)
- Tailwind CSS (for styling)
- Font Awesome (for icons)
- Modern browser with JavaScript enabled

## Usage Instructions
1. Navigate to the Report page
2. If "Generate Report" is disabled, click "Auto Generate Data"
3. Enter coordinates or use pre-filled values
4. Click "Generate Data" and wait for completion
5. Once complete, "Generate Report" will be enabled
6. Click "Generate Report" to create comprehensive PDF

This system provides a seamless way to generate all required data from a single interface while maintaining compatibility with the existing storage and reporting systems.
