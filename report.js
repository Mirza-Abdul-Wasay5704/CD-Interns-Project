// Report Manager JavaScript
// Handles data population and status indicators for report cards

document.addEventListener('DOMContentLoaded', function() {
    initializeReportData();
    updateDataAvailability();
    setupStorageListeners();
    loadSavedCoordinates();
    checkDataAvailabilityForReportGeneration();
    
    // Debug: Check if analyzer modules are loaded
    console.log('🔍 Checking analyzer modules:');
    console.log('MapAnalyzerV2:', typeof window.MapAnalyzerV2);
    console.log('LandUseAnalyzerV2:', typeof window.LandUseAnalyzerV2);
    console.log('SSMAnalyzerV2:', typeof window.SSMAnalyzerV2);
    console.log('StorageManager:', typeof StorageManager);
});

// Setup listeners for storage updates from other modules
function setupStorageListeners() {
    window.addEventListener('storageUpdated', function(event) {
        const { module, data } = event.detail;
        console.log(`📊 Report: Received ${module} data update`);
        
        switch(module) {
            case 'map':
                if (data && Object.keys(data).length > 0) {
                    updateMapAnalysisCard(data);
                    setStatusIndicator('mapStatus', 'has-data');
                } else {
                    setStatusIndicator('mapStatus', 'no-data');
                }
                break;
            case 'analysis':
                if (data && Object.keys(data).length > 0) {
                    updateLandUseCard(data);
                    setStatusIndicator('analysisStatus', 'has-data');
                } else {
                    setStatusIndicator('analysisStatus', 'no-data');
                }
                break;
            case 'ssm':
                if (data && Object.keys(data).length > 0) {
                    updateSiteSelectionCard(data);
                    setStatusIndicator('ssmStatus', 'has-data');
                } else {
                    setStatusIndicator('ssmStatus', 'no-data');
                }
                break;
        }
        
        // Check data availability for report generation
        checkDataAvailabilityForReportGeneration();
    });
}

// Initialize report data on page load
function initializeReportData() {
    try {
        // Check if StorageManager is available
        if (typeof StorageManager !== 'undefined') {
            loadDataFromStorage();
        } else {
            // Use sample data for demonstration
            loadSampleData();
        }
    } catch (error) {
        console.log('Using sample data for report cards');
        loadSampleData();
    }
}

// Load data from storage manager if available
function loadDataFromStorage() {
    try {
        // Create StorageManager instance
        const storageManager = new StorageManager();
        
        // Map Analysis Data
        const mapData = storageManager.getData('map');
        if (mapData && Object.keys(mapData).length > 0) {
            updateMapAnalysisCard(mapData);
            setStatusIndicator('mapStatus', 'has-data');
        } else {
            setStatusIndicator('mapStatus', 'no-data');
        }

        // Land Use Analysis Data
        const analysisData = storageManager.getData('analysis');
        if (analysisData && Object.keys(analysisData).length > 0) {
            updateLandUseCard(analysisData);
            setStatusIndicator('analysisStatus', 'has-data');
        } else {
            setStatusIndicator('analysisStatus', 'no-data');
        }

        // Site Selection Matrix Data
        const ssmData = storageManager.getData('ssm');
        if (ssmData && Object.keys(ssmData).length > 0) {
            updateSiteSelectionCard(ssmData);
            setStatusIndicator('ssmStatus', 'has-data');
        } else {
            setStatusIndicator('ssmStatus', 'no-data');
        }
    } catch (error) {
        console.log('Error loading data from storage:', error);
        loadSampleData();
    }
}

// Load sample data for demonstration
function loadSampleData() {
    // Sample Map Analysis Data
    updateMapAnalysisCard({
        totalStations: 15,
        psoStations: 6,
        competitors: 9,
        coverage: '40%'
    });
    setStatusIndicator('mapStatus', 'has-data');

    // Sample Land Use Analysis Data  
    updateLandUseCard({
        landType: 'Commercial',
        viabilityScore: 8.5
    });
    setStatusIndicator('analysisStatus', 'has-data');

    // Sample Site Selection Data
    updateSiteSelectionCard({
        totalScore: 85,
        category: 'High Priority'
    });
    setStatusIndicator('ssmStatus', 'has-data');
}

// Update Map Analysis Card
function updateMapAnalysisCard(data) {
    const stationsElement = document.getElementById('mapStations');
    const coverageElement = document.getElementById('mapCoverage');
    
    if (stationsElement) {
        if (data.stations && data.stations.length) {
            stationsElement.textContent = data.stations.length;
        } else if (data.totalStations) {
            stationsElement.textContent = data.totalStations;
        } else {
            stationsElement.textContent = '0';
        }
    }
    
    if (coverageElement) {
        if (data.coverage) {
            coverageElement.textContent = data.coverage;
        } else if (data.statistics && data.statistics.coverage) {
            coverageElement.textContent = data.statistics.coverage;
        } else {
            // Calculate coverage if we have PSO and total station counts
            const psoCount = data.psoStations || (data.stations ? data.stations.filter(s => s.brand?.toLowerCase().includes('pso')).length : 0);
            const totalCount = data.totalStations || (data.stations ? data.stations.length : 0);
            if (totalCount > 0) {
                const coveragePercent = Math.round((psoCount / totalCount) * 100);
                coverageElement.textContent = `${coveragePercent}%`;
            } else {
                coverageElement.textContent = 'N/A';
            }
        }
    }
}

// Update Land Use Analysis Card
function updateLandUseCard(data) {
    const typeElement = document.getElementById('analysisType');
    const scoreElement = document.getElementById('analysisScore');
    
    if (typeElement) {
        if (data.landType) {
            typeElement.textContent = data.landType;
        } else if (data.landUse && data.landUse.primary) {
            typeElement.textContent = data.landUse.primary;
        } else if (data.analysis && data.analysis.landType) {
            typeElement.textContent = data.analysis.landType;
        } else {
            typeElement.textContent = 'Mixed Use';
        }
    }
    
    if (scoreElement) {
        if (data.viabilityScore) {
            scoreElement.textContent = data.viabilityScore + '/10';
        } else if (data.score) {
            scoreElement.textContent = data.score + '/10';
        } else if (data.analysis && data.analysis.score) {
            scoreElement.textContent = data.analysis.score + '/10';
        } else {
            scoreElement.textContent = 'Pending';
        }
    }
}

// Update Site Selection Card
function updateSiteSelectionCard(data) {
    const scoreElement = document.getElementById('ssmScore');
    const categoryElement = document.getElementById('ssmCategory');
    
    if (scoreElement) {
        if (data.totalScore !== undefined) {
            scoreElement.textContent = data.totalScore + '/100';
        } else if (data.score !== undefined) {
            scoreElement.textContent = data.score + '/100';
        } else if (data.finalScore !== undefined) {
            scoreElement.textContent = data.finalScore + '/100';
        } else {
            scoreElement.textContent = 'Pending';
        }
    }
    
    if (categoryElement) {
        if (data.category) {
            categoryElement.textContent = data.category;
        } else if (data.rating) {
            categoryElement.textContent = data.rating;
        } else if (data.recommendation) {
            categoryElement.textContent = data.recommendation;
        } else {
            // Determine category based on score
            const score = data.totalScore || data.score || data.finalScore || 0;
            if (score >= 80) {
                categoryElement.textContent = 'High Priority';
            } else if (score >= 60) {
                categoryElement.textContent = 'Medium Priority';
            } else if (score >= 40) {
                categoryElement.textContent = 'Low Priority';
            } else {
                categoryElement.textContent = 'Not Recommended';
            }
        }
    }
}

// Set status indicator color
function setStatusIndicator(elementId, status) {
    const indicator = document.getElementById(elementId);
    if (indicator) {
        // Remove existing status classes
        indicator.classList.remove('has-data', 'partial-data', 'no-data');
        
        // Add appropriate status class
        switch (status) {
            case 'has-data':
                indicator.classList.add('has-data');
                break;
            case 'partial-data':
                indicator.classList.add('partial-data');
                break;
            case 'no-data':
            default:
                // Red is default in CSS
                break;
        }
    }
}

// Update data availability overview
function updateDataAvailability() {
    // This function can be called to refresh data availability
    // when new data is loaded from other pages
    setTimeout(() => {
        initializeReportData();
    }, 1000);
}

// Report generation function - Uses StorageManager's advanced PDF generation
async function generateReport() {
    const generateBtn = document.getElementById('generateBtn');
    const progressContainer = document.getElementById('progressContainer');
    const progressText = document.getElementById('progressText');
    const progressBar = document.getElementById('progressBar');
    const progressPercent = document.getElementById('progressPercent');
    const reportViewer = document.getElementById('reportViewer');
    
    try {
        // Disable button and show initial progress
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i><span>Initializing...</span>';
        progressContainer.classList.remove('hidden');
        reportViewer.classList.add('hidden');
        
        // Reset progress
        progressBar.style.width = '0%';
        progressPercent.textContent = '0%';
        progressText.textContent = 'Initializing report generation...';
        
        // Create StorageManager instance
        const storageManager = new StorageManager();
        
        // Step 1: Collect and validate data
        progressBar.style.width = '20%';
        progressPercent.textContent = '20%';
        progressText.textContent = 'Collecting data from all modules...';
        
        const allData = storageManager.getReportData();
        console.log('📊 Enhanced data for report:', allData);
        
        // Check if we have any data
        const hasMapData = allData.map && Object.keys(allData.map).length > 0;
        const hasSSMData = allData.ssm && Object.keys(allData.ssm).length > 0;
        const hasAnalysisData = allData.analysis && Object.keys(allData.analysis).length > 0;
        
        if (!hasMapData && !hasSSMData && !hasAnalysisData) {
            throw new Error('No data available for report generation. Please run analysis on at least one module first.');
        }
        
        // Step 2: Validate data
        progressBar.style.width = '40%';
        progressPercent.textContent = '40%';
        progressText.textContent = 'Validating data integrity...';
        
        const validationResult = storageManager.validateReportData();
        if (!validationResult.isValid) {
            console.warn('⚠️ Some data missing, but proceeding with available data:', validationResult.issues);
        }
        
        // Step 3: Load required libraries
        progressBar.style.width = '60%';
        progressPercent.textContent = '60%';
        progressText.textContent = 'Loading chart libraries...';
        
        await storageManager.loadChartLibraries();
        
        // Step 4: Generate PDF
        progressBar.style.width = '80%';
        progressPercent.textContent = '80%';
        progressText.textContent = 'Generating professional PDF...';
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i><span>Creating PDF...</span>';
        
        // Use StorageManager's professional PDF creation
        const pdfBlob = await storageManager.createProfessionalPDF(allData);
        
        console.log('📄 PDF Generation Result:', {
            blobExists: !!pdfBlob,
            blobSize: pdfBlob ? pdfBlob.size : 0,
            blobType: pdfBlob ? pdfBlob.type : 'N/A'
        });
        
        if (pdfBlob && pdfBlob.size > 0) {
            // Step 5: Complete
            progressBar.style.width = '100%';
            progressPercent.textContent = '100%';
            progressText.textContent = 'Report generated successfully!';
            
            // Create blob URL for viewing
            const pdfUrl = URL.createObjectURL(pdfBlob);
            console.log('🔗 PDF URL created:', pdfUrl);
            
            // Store PDF for download
            window.generatedPDFBlob = pdfBlob;
            window.generatedPDFUrl = pdfUrl;
            
            generateBtn.innerHTML = '<i class="fas fa-check mr-2"></i><span>Generated!</span>';
            
            // Display PDF in our custom viewer
            displayPDFInViewer(pdfUrl);
            
            // Show success message
            showStatusMessage('Professional report generated successfully using StorageManager!', 'success');
            
            // Reset button after short delay
            setTimeout(() => {
                generateBtn.disabled = false;
                generateBtn.innerHTML = '<i class="fas fa-file-pdf mr-2"></i><span>Generate Report</span>';
                progressContainer.classList.add('hidden');
            }, 2000);
            
        } else {
            throw new Error(`Failed to generate PDF - ${pdfBlob ? 'empty blob (size: 0)' : 'no blob returned'}`);
        }
        
    } catch (error) {
        console.error('❌ Report generation failed:', error);
        
        // Re-enable button on error
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i class="fas fa-file-pdf mr-2"></i><span>Generate Report</span>';
        progressContainer.classList.add('hidden');
        
        // Show error message
        const errorMsg = error.message || 'An unexpected error occurred during report generation';
        showStatusMessage(`Error: ${errorMsg}`, 'error');
        
        // If no data available, show helpful message
        if (errorMsg.includes('No data available')) {
            showStatusMessage('Please visit Map, Analysis, or SSM pages to collect data first.', 'info');
        }
    }
}

// Display PDF in embedded viewer
function displayPDFInViewer(pdfUrl) {
    const reportViewer = document.getElementById('reportViewer');
    const pdfContainer = document.getElementById('pdfContainer');
    
    console.log('🔍 Attempting to display PDF:', pdfUrl);
    
    // Show loading message first
    pdfContainer.innerHTML = `
        <div class="flex items-center justify-center h-96 bg-gray-700/50 rounded-lg">
            <div class="text-center text-gray-400">
                <i class="fas fa-spinner fa-spin text-4xl mb-4"></i>
                <p class="text-lg">Loading PDF...</p>
            </div>
        </div>
    `;
    
    // Show the report viewer immediately
    reportViewer.classList.remove('hidden');
    reportViewer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // Try different display methods in order of preference
    let displayMethod = 1;
    
    function tryDisplayMethod(method) {
        console.log(`🔧 Trying PDF display method ${method}`);
        
        if (method === 1) {
            // Method 1: Object tag (usually most reliable)
            pdfContainer.innerHTML = `
                <div class="relative w-full h-full">
                    <object 
                        data="${pdfUrl}#view=FitH&toolbar=1&navpanes=1&scrollbar=1" 
                        type="application/pdf" 
                        width="100%" 
                        height="700px"
                        class="rounded-lg border border-gray-600 bg-white"
                        style="min-height: 700px;"
                    >
                        <p class="text-center text-gray-400 p-8">
                            <i class="fas fa-exclamation-triangle text-2xl mb-2"></i><br>
                            Your browser does not support PDF display. Please use the download button below.
                        </p>
                    </object>
                    <div class="absolute bottom-4 right-4 space-x-2">
                        <button 
                            onclick="downloadReport()" 
                            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-300 shadow-lg"
                            title="Download PDF"
                        >
                            <i class="fas fa-download"></i>
                        </button>
                        <button 
                            onclick="openPDFInNewTab()" 
                            class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-300 shadow-lg"
                            title="Open in New Tab"
                        >
                            <i class="fas fa-external-link-alt"></i>
                        </button>
                    </div>
                </div>
            `;
            
            // Check if object tag worked
            setTimeout(() => {
                const objectTag = pdfContainer.querySelector('object');
                if (objectTag && objectTag.offsetHeight < 100) {
                    console.log('❌ Object tag failed, trying method 2');
                    tryDisplayMethod(2);
                } else {
                    console.log('✅ Object tag working');
                }
            }, 2000);
            
        } else if (method === 2) {
            // Method 2: Embed tag
            pdfContainer.innerHTML = `
                <div class="relative w-full h-full">
                    <embed 
                        src="${pdfUrl}#view=FitH&toolbar=1&navpanes=1&scrollbar=1" 
                        type="application/pdf" 
                        width="100%" 
                        height="700px"
                        class="rounded-lg border border-gray-600 bg-white"
                        style="min-height: 700px;"
                    />
                    <div class="absolute bottom-4 right-4 space-x-2">
                        <button 
                            onclick="downloadReport()" 
                            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-300 shadow-lg"
                            title="Download PDF"
                        >
                            <i class="fas fa-download"></i>
                        </button>
                        <button 
                            onclick="openPDFInNewTab()" 
                            class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-300 shadow-lg"
                            title="Open in New Tab"
                        >
                            <i class="fas fa-external-link-alt"></i>
                        </button>
                    </div>
                </div>
            `;
            
            // Check if embed tag worked
            setTimeout(() => {
                const embedTag = pdfContainer.querySelector('embed');
                if (embedTag && embedTag.offsetHeight < 100) {
                    console.log('❌ Embed tag failed, trying method 3');
                    tryDisplayMethod(3);
                } else {
                    console.log('✅ Embed tag working');
                }
            }, 2000);
            
        } else if (method === 3) {
            // Method 3: iframe
            pdfContainer.innerHTML = `
                <div class="relative w-full h-full">
                    <iframe 
                        src="${pdfUrl}" 
                        width="100%" 
                        height="700px"
                        class="rounded-lg border border-gray-600 bg-white"
                        style="min-height: 700px;"
                        frameborder="0"
                        onload="console.log('✅ Iframe loaded successfully')"
                        onerror="console.log('❌ Iframe failed to load')"
                    ></iframe>
                    <div class="absolute bottom-4 right-4 space-x-2">
                        <button 
                            onclick="downloadReport()" 
                            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-300 shadow-lg"
                            title="Download PDF"
                        >
                            <i class="fas fa-download"></i>
                        </button>
                        <button 
                            onclick="openPDFInNewTab()" 
                            class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-300 shadow-lg"
                            title="Open in New Tab"
                        >
                            <i class="fas fa-external-link-alt"></i>
                        </button>
                    </div>
                </div>
            `;
            
            // Check if iframe worked
            setTimeout(() => {
                const iframeTag = pdfContainer.querySelector('iframe');
                if (iframeTag && iframeTag.offsetHeight < 100) {
                    console.log('❌ Iframe failed, showing fallback');
                    tryDisplayMethod(4);
                } else {
                    console.log('✅ Iframe working');
                }
            }, 3000);
            
        } else {
            // Method 4: Fallback - show download option only
            console.log('💡 All display methods failed, showing fallback');
            pdfContainer.innerHTML = `
                <div class="text-center text-gray-400 p-8 bg-gray-700/50 rounded-lg">
                    <i class="fas fa-file-pdf text-6xl mb-4"></i>
                    <h3 class="text-xl font-semibold mb-2">PDF Generated Successfully</h3>
                    <p class="text-gray-500 mb-6">Your browser doesn't support inline PDF viewing.<br>Please download the PDF or open it in a new tab.</p>
                    <div class="space-x-4">
                        <button 
                            onclick="downloadReport()" 
                            class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 shadow-lg"
                        >
                            <i class="fas fa-download mr-2"></i>Download PDF
                        </button>
                        <button 
                            onclick="openPDFInNewTab()" 
                            class="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 shadow-lg"
                        >
                            <i class="fas fa-external-link-alt mr-2"></i>Open in New Tab
                        </button>
                    </div>
                </div>
            `;
        }
    }
    
    // Start with method 1 after a short delay
    setTimeout(() => {
        tryDisplayMethod(1);
    }, 500);
}

// Open PDF in new tab
function openPDFInNewTab() {
    if (window.generatedPDFUrl) {
        window.open(window.generatedPDFUrl, '_blank');
        showStatusMessage('PDF opened in new tab', 'success');
    } else {
        showStatusMessage('No PDF available to open', 'error');
    }
}

// Show status message
function showStatusMessage(message, type = 'info') {
    const statusMessages = document.getElementById('statusMessages');
    const messageDiv = document.createElement('div');
    
    const colorClass = type === 'success' ? 'text-green-400' : 
                      type === 'error' ? 'text-red-400' : 'text-blue-400';
    
    messageDiv.className = `text-sm ${colorClass} bg-gray-700/50 rounded-lg p-3`;
    messageDiv.innerHTML = `<i class="fas fa-info-circle mr-2"></i>${message}`;
    
    statusMessages.appendChild(messageDiv);
    
    // Remove message after 5 seconds
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

// Download report function
function downloadReport() {
    try {
        if (window.generatedPDFBlob) {
            // Create download link
            const downloadLink = document.createElement('a');
            const fileName = `PSO_Site_Analysis_Report_${new Date().toISOString().split('T')[0]}.pdf`;
            
            downloadLink.href = window.generatedPDFUrl;
            downloadLink.download = fileName;
            downloadLink.style.display = 'none';
            
            // Append to document, click, and remove
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            
            showStatusMessage(`Report downloaded as: ${fileName}`, 'success');
        } else {
            showStatusMessage('No report available for download. Please generate a report first.', 'error');
        }
    } catch (error) {
        console.error('Error downloading report:', error);
        showStatusMessage('Error downloading report. Please try again.', 'error');
    }
}

// Close viewer function
function closeViewer() {
    const reportViewer = document.getElementById('reportViewer');
    const pdfContainer = document.getElementById('pdfContainer');
    
    if (reportViewer) {
        reportViewer.classList.add('hidden');
    }
    
    // Clean up PDF container
    pdfContainer.innerHTML = `
        <div class="text-center text-gray-500">
            <i class="fas fa-file-pdf text-4xl mb-4"></i>
            <p class="text-lg">PDF will be displayed here</p>
        </div>
    `;
    
    // Clean up blob URLs to prevent memory leaks
    if (window.generatedPDFUrl) {
        URL.revokeObjectURL(window.generatedPDFUrl);
        window.generatedPDFUrl = null;
        window.generatedPDFBlob = null;
    }
}

// ============================================================================
// AUTO GENERATION FUNCTIONALITY
// ============================================================================

// Check data availability and enable/disable report generation
function checkDataAvailabilityForReportGeneration() {
    try {
        const storageManager = new StorageManager();
        const mapData = storageManager.getData('map');
        const analysisData = storageManager.getData('analysis');
        const ssmData = storageManager.getData('ssm');
        
        const hasMapData = mapData && Object.keys(mapData).length > 0;
        const hasAnalysisData = analysisData && Object.keys(analysisData).length > 0;
        const hasSSMData = ssmData && Object.keys(ssmData).length > 0;
        
        const generateBtn = document.getElementById('generateBtn');
        const autoGenerateBtn = document.getElementById('autoGenerateBtn');
        
        if (hasMapData && hasAnalysisData && hasSSMData) {
            generateBtn.disabled = false;
            generateBtn.title = 'Generate comprehensive report';
            generateBtn.classList.remove('disabled:bg-gray-600', 'disabled:cursor-not-allowed');
        } else {
            generateBtn.disabled = true;
            const missingModules = [];
            if (!hasMapData) missingModules.push('Map Analysis');
            if (!hasAnalysisData) missingModules.push('Land Use Analysis');
            if (!hasSSMData) missingModules.push('Site Selection Metrics');
            
            generateBtn.title = `Missing data: ${missingModules.join(', ')}. Use Auto Generate to create missing data.`;
            generateBtn.classList.add('disabled:bg-gray-600', 'disabled:cursor-not-allowed');
        }
    } catch (error) {
        console.log('Error checking data availability:', error);
    }
}

// Load saved coordinates from cookies
function loadSavedCoordinates() {
    const latitude = getCookie('latitude') || '24.8318068784576';
    const longitude = getCookie('longitude') || '67.0765271168376';
    const radius = getCookie('radius') || '2';
    
    const latInput = document.getElementById('autoGenLatitude');
    const lngInput = document.getElementById('autoGenLongitude');
    const radiusInput = document.getElementById('autoGenRadius');
    
    if (latInput) latInput.value = latitude;
    if (lngInput) lngInput.value = longitude;
    if (radiusInput) radiusInput.value = radius;
}

// Show auto generate modal
function showAutoGenerateModal() {
    const modal = document.getElementById('autoGenerateModal');
    modal.classList.remove('hidden');
    loadSavedCoordinates();
}

// Close auto generate modal
function closeAutoGenerateModal() {
    const modal = document.getElementById('autoGenerateModal');
    modal.classList.add('hidden');
}

// Save coordinates to cookies
function saveCoordinates(lat, lng, radius) {
    setCookie('latitude', lat, 30);
    setCookie('longitude', lng, 30);
    setCookie('radius', radius, 30);
}

// Cookie utility functions
function setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

// Start auto generation process
async function startAutoGeneration() {
    const latInput = document.getElementById('autoGenLatitude');
    const lngInput = document.getElementById('autoGenLongitude');
    const radiusInput = document.getElementById('autoGenRadius');
    
    const lat = parseFloat(latInput.value);
    const lng = parseFloat(lngInput.value);
    const radius = parseFloat(radiusInput.value);
    
    // Validate inputs
    if (isNaN(lat) || isNaN(lng) || isNaN(radius)) {
        alert('Please enter valid coordinates and radius');
        return;
    }
    
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        alert('Please enter valid latitude (-90 to 90) and longitude (-180 to 180)');
        return;
    }
    
    if (radius < 1 || radius > 10) {
        alert('Please enter radius between 1 and 10 km');
        return;
    }
    
    // Save coordinates
    saveCoordinates(lat, lng, radius);
    
    // Close input modal and show progress modal
    closeAutoGenerateModal();
    showAutoGenerationProgress();
    
    try {
        // Load the HTML-independent analysis modules
        await loadAnalysisModules();
        
        // Run analyses in sequence
        await runAutoGeneration(lat, lng, radius);
        
        // Close progress modal and refresh data
        hideAutoGenerationProgress();
        checkDataAvailabilityForReportGeneration();
        initializeReportData();
        
        showStatusMessage('All data generated successfully! You can now generate the report.', 'success');
        
    } catch (error) {
        console.error('Error during auto generation:', error);
        hideAutoGenerationProgress();
        showStatusMessage('Error during data generation. Please try again.', 'error');
    }
}

// Show auto generation progress modal
function showAutoGenerationProgress() {
    const modal = document.getElementById('autoGenerationProgressModal');
    modal.classList.remove('hidden');
    resetProgressSteps();
}

// Hide auto generation progress modal
function hideAutoGenerationProgress() {
    const modal = document.getElementById('autoGenerationProgressModal');
    modal.classList.add('hidden');
}

// Reset progress steps
function resetProgressSteps() {
    const steps = ['map', 'analysis', 'ssm'];
    steps.forEach(step => {
        document.getElementById(`step-${step}-loading`).classList.add('hidden');
        document.getElementById(`step-${step}-complete`).classList.add('hidden');
        document.getElementById(`step-${step}-waiting`).classList.remove('hidden');
    });
    document.getElementById('autoGenProgressBar').style.width = '0%';
}

// Update progress step
function updateProgressStep(step, status) {
    const loadingEl = document.getElementById(`step-${step}-loading`);
    const completeEl = document.getElementById(`step-${step}-complete`);
    const waitingEl = document.getElementById(`step-${step}-waiting`);
    
    if (status === 'loading') {
        waitingEl.classList.add('hidden');
        loadingEl.classList.remove('hidden');
        completeEl.classList.add('hidden');
    } else if (status === 'complete') {
        waitingEl.classList.add('hidden');
        loadingEl.classList.add('hidden');
        completeEl.classList.remove('hidden');
    }
}

// Load HTML-independent analysis modules
async function loadAnalysisModules() {
    // Since modules are loaded directly in HTML, just verify they exist
    return new Promise((resolve, reject) => {
        // Check if all modules are loaded
        if (typeof window.MapAnalyzerV2 !== 'undefined' && 
            typeof window.LandUseAnalyzerV2 !== 'undefined' && 
            typeof window.SSMAnalyzerV2 !== 'undefined') {
            resolve();
        } else {
            // Wait a bit for modules to load
            setTimeout(() => {
                if (typeof window.MapAnalyzerV2 !== 'undefined' && 
                    typeof window.LandUseAnalyzerV2 !== 'undefined' && 
                    typeof window.SSMAnalyzerV2 !== 'undefined') {
                    resolve();
                } else {
                    reject(new Error('Analysis modules not loaded'));
                }
            }, 1000);
        }
    });
}

// Run auto generation process
async function runAutoGeneration(lat, lng, radius) {
    const progressBar = document.getElementById('autoGenProgressBar');
    const progressText = document.getElementById('autoGenProgressText');
    
    try {
        // Ensure unified coordinates for all analyzers
        const coordinates = {
            lat: parseFloat(lat.toFixed(6)), // Ensure precision consistency
            lng: parseFloat(lng.toFixed(6)),
            radius: parseFloat(radius.toFixed(2))
        };
        
        console.log('🎯 Starting unified analysis with coordinates:', coordinates);
        
        // Step 1: Map Analysis
        updateProgressStep('map', 'loading');
        progressText.textContent = 'Analyzing fuel stations...';
        progressBar.style.width = '10%';
        
        if (typeof window.MapAnalyzerV2 !== 'undefined') {
            const mapAnalyzer = new window.MapAnalyzerV2();
            await mapAnalyzer.analyzeLocation(coordinates.lat, coordinates.lng, coordinates.radius);
            updateProgressStep('map', 'complete');
            progressBar.style.width = '33%';
        } else {
            throw new Error('Map analyzer not loaded');
        }
        
        // Small delay to ensure data is stored
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Step 2: Land Use Analysis
        updateProgressStep('analysis', 'loading');
        progressText.textContent = 'Analyzing land use patterns...';
        
        if (typeof window.LandUseAnalyzerV2 !== 'undefined') {
            const landUseAnalyzer = new window.LandUseAnalyzerV2();
            await landUseAnalyzer.analyzeLocation(coordinates.lat, coordinates.lng, coordinates.radius);
            updateProgressStep('analysis', 'complete');
            progressBar.style.width = '66%';
        } else {
            throw new Error('Land use analyzer not loaded');
        }
        
        // Small delay to ensure data is stored
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Step 3: SSM Analysis
        updateProgressStep('ssm', 'loading');
        progressText.textContent = 'Calculating site metrics...';
        
        if (typeof window.SSMAnalyzerV2 !== 'undefined') {
            const ssmAnalyzer = new window.SSMAnalyzerV2();
            await ssmAnalyzer.analyzeLocation(coordinates.lat, coordinates.lng, coordinates.radius);
            updateProgressStep('ssm', 'complete');
            progressBar.style.width = '100%';
        } else {
            throw new Error('SSM analyzer not loaded');
        }
        
        progressText.textContent = 'All analyses completed successfully!';
        console.log('✅ All unified analyses completed');
        
        // Final delay to ensure all data is stored
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Refresh the report data to show updated information
        initializeReportData();
        updateDataAvailability();
        
        // Hide progress modal after a short delay
        setTimeout(() => {
            hideAutoGenerationProgress();
            showStatusMessage('✅ Auto-generation completed successfully!', 'success');
        }, 1000);
        
    } catch (error) {
        console.error('❌ Auto-generation failed:', error);
        progressText.textContent = `Error: ${error.message}`;
        
        // Show error but don't hide modal immediately
        setTimeout(() => {
            hideAutoGenerationProgress();
            showStatusMessage(`❌ Auto-generation failed: ${error.message}`, 'error');
        }, 3000);
    }
}