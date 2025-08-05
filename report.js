// Report Manager JavaScript
// Handles data population and status indicators for report cards

document.addEventListener('DOMContentLoaded', function() {
    initializeReportData();
    updateDataAvailability();
    setupStorageListeners();
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
        
        if (pdfBlob && pdfBlob.size > 0) {
            // Step 5: Complete
            progressBar.style.width = '100%';
            progressPercent.textContent = '100%';
            progressText.textContent = 'Report generated successfully!';
            
            // Create blob URL for viewing
            const pdfUrl = URL.createObjectURL(pdfBlob);
            
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
            throw new Error('Failed to generate PDF - empty or invalid result');
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
    
    // Try embedded PDF first, fallback to iframe
    const isModernBrowser = 'PDFium' in window || navigator.pdfViewerEnabled !== false;
    
    if (isModernBrowser) {
        // Use embed for modern browsers
        pdfContainer.innerHTML = `
            <embed 
                src="${pdfUrl}" 
                type="application/pdf" 
                width="100%" 
                height="600px"
                class="rounded-lg border border-gray-600"
            />
        `;
    } else {
        // Fallback to iframe with PDF.js viewer or direct download
        pdfContainer.innerHTML = `
            <div class="bg-gray-700 rounded-lg p-8 text-center">
                <div class="mb-6">
                    <i class="fas fa-file-pdf text-6xl text-red-400 mb-4"></i>
                    <h3 class="text-xl font-bold text-white mb-2">PDF Report Generated</h3>
                    <p class="text-gray-300 mb-6">Your browser doesn't support embedded PDF viewing.</p>
                </div>
                <div class="space-y-4">
                    <button 
                        onclick="downloadReport()" 
                        class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center mx-auto"
                    >
                        <i class="fas fa-download mr-2"></i>
                        Download PDF Report
                    </button>
                    <button 
                        onclick="openPDFInNewTab()" 
                        class="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center mx-auto"
                    >
                        <i class="fas fa-external-link-alt mr-2"></i>
                        Open in New Tab
                    </button>
                </div>
            </div>
        `;
    }
    
    // Show the report viewer
    reportViewer.classList.remove('hidden');
    
    // Scroll to viewer
    reportViewer.scrollIntoView({ behavior: 'smooth', block: 'start' });
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