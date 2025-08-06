let map;
        let radiusCircle;
        let focusModeButton;
        let currentStations = [];
        let filteredStations = [];
        let distanceLabelsGroup = null;
        let connectionLinesGroup = null;
        let showDistances = true;
        let showLines = true;

// Edit Map variables
let editMode = false;
let addType = null;
let editLayerGroup = null;
let editableElements = [];
let elementIdCounter = 0;

        // Initialize map
        function initMap() {
            map = L.map('map').setView([25.3730, 68.3512], 12);
            
            // Layer Control
            const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 55
            });
            
            const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: '© Esri',
                maxZoom: 24 // Increased zoom level for more detail
            });
            
            const terrainLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenTopoMap',
                maxZoom: 18
            });

            // Add default layer
            osmLayer.addTo(map);

            // Layer control
            const baseLayers = {
                "Street Map": osmLayer,
                "Satellite": satelliteLayer,
                "Terrain": terrainLayer
            };

            L.control.layers(baseLayers).addTo(map);

            // Map click event
            map.on('click', function(e) {
                document.getElementById('latitude').value = e.latlng.lat.toFixed(6);
                document.getElementById('longitude').value = e.latlng.lng.toFixed(6);
            });
        }

        // Search function
        async function searchStations() {
            const lat = parseFloat(document.getElementById('latitude').value);
            const lng = parseFloat(document.getElementById('longitude').value);
            const radius = parseFloat(document.getElementById('radius').value);
            console.log("XXXXXXX hello XXXXXXXXXXXX");

            if (isNaN(lat) || isNaN(lng) || isNaN(radius) || radius <= 0) {
                alert('Please enter valid coordinates and radius');
                return;
            }

            // Show enhanced loading overlay
            showLoading();
            console.log("XXXXXXX hello XXXXXXXXXXXX");
            

            try {
                // Clear previous markers
                clearMap();
                clearAllData();
                // Add search marker
                const searchMarker = L.marker([lat, lng], {
                    icon: L.divIcon({
                        html: '<i class="fas fa-crosshairs" style="color: #dc2626; font-size: 20px;"></i>',
                        className: 'custom-marker',
                        iconSize: [20, 20],
                        iconAnchor: [10, 10]
                    })
                }).addTo(map);

                // Add radius circle
                radiusCircle = L.circle([lat, lng], {
                    color: '#2d8659',
                    fillColor: '#4ade80',
                    fillOpacity: 0.2,
                    radius: radius * 1000
                }).addTo(map);

                // Simulate API call (replace with actual API)
                const stations = await fetchFuelStations(lat, lng, radius);
                displayStationResults(stations);
                updateStatistics(stations);

            } catch (error) {
                document.getElementById('results-list').innerHTML = `
                    <div class="error">
                        <i class="fas fa-exclamation-circle text-2xl mb-2"></i>
                        <p>Error searching for stations</p>
                    </div>
                `;
            } finally {
                // Hide enhanced loading overlay
                hideLoading();
            }
        }

        // Mock API function (replace with real API)
        async function fetchFuelStations(lat, lng, radius) {
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Mock data
            return [
                {
                    id: 1,
                    name: 'پاکستان اسٹیٹ آئل',
                    brand: 'PSO',
                    lat: lat + 0.01,
                    lng: lng + 0.01,
                    distance: 1.2,
                    rating: 4,
                    price: 272.5,
                    fuels: ['Petrol', 'Diesel']
                },
                {
                    id: 2,
                    name: 'Total Parco',
                    brand: 'Total',
                    lat: lat - 0.01,
                    lng: lng + 0.015,
                    distance: 1.8,
                    rating: 4,
                    price: 274.0,
                    fuels: ['Petrol', 'Diesel']
                }
            ];
        }

        // Display station results
        function displayStationResults(stations) {
            currentStations = stations;
            filteredStations = stations;
            
            if (stations.length === 0) {
                document.getElementById('results-list').innerHTML = `
                    <div class="error">
                        <i class="fas fa-exclamation-circle text-2xl mb-2"></i>
                        <p>No fuel stations found</p>
                    </div>
                `;
                return;
            }

            renderStationList(stations);
            addStationMarkers(stations);
        }

        // Render station list
        function renderStationList(stations) {
            const html = stations.map(station => `
                <div class="station-card bg-gray-700 border border-gray-600 rounded-lg p-4">
                    <div class="flex justify-between items-start mb-3">
                        <h4 class="text-lg font-bold text-white">${station.name}</h4>
                        <span class="px-3 py-1 rounded-full text-xs font-bold ${
                            station.brand === 'PSO' ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'
                        }">
                            ${station.brand}
                        </span>
                    </div>
                    
                    <div class="flex items-center text-gray-300 mb-2">
                        <i class="fas fa-map-marker-alt mr-2 text-green-400"></i>
                        <span>${station.distance} km</span>
                        <div class="flex items-center ml-4">
                            ${generateStarRating(station.rating)}
                            <span class="ml-1 text-sm">${station.rating}/5</span>
                        </div>
                    </div>
                    
                    <div class="flex items-center text-gray-300 mb-3">
                        <i class="fas fa-rupee-sign mr-2 text-blue-400"></i>
                        <span>Rs. ${station.price}/L</span>
                    </div>
                    
                    <div class="flex gap-2">
                        ${station.fuels.map(fuel => `
                            <span class="px-2 py-1 bg-gray-600 text-gray-200 text-xs rounded">${fuel}</span>
                        `).join('')}
                    </div>
                </div>
            `).join('');

            document.getElementById('results-list').innerHTML = html;
        }

        // Generate star rating
        function generateStarRating(rating) {
            let stars = '';
            for (let i = 1; i <= 5; i++) {
                stars += `<i class="fas fa-star ${i <= rating ? 'text-yellow-400' : 'text-gray-600'}"></i>`;
            }
            return stars;
        }

        // Add station markers to map
        function addStationMarkers(stations) {
            stations.forEach(station => {
                const icon = station.brand === 'PSO' ? 
                    '<i class="fas fa-gas-pump" style="color: #10b981; font-size: 16px;"></i>' :
                    '<i class="fas fa-gas-pump" style="color: #3b82f6; font-size: 16px;"></i>';

                L.marker([station.lat, station.lng], {
                    icon: L.divIcon({
                        html: icon,
                        className: 'custom-marker',
                        iconSize: [20, 20],
                        iconAnchor: [10, 10]
                    })
                }).addTo(map).bindPopup(`
                    <div class="text-gray-800">
                        <h4 class="font-bold">${station.name}</h4>
                        <p>${station.brand} • ${station.distance}km</p>
                        <p>Rs. ${station.price}/L</p>
                    </div>
                `);
            });
        }

        // Update statistics
        function updateStatistics(stations) {
            const psoCount = stations.filter(s => s.brand === 'PSO').length;
            const competitorCount = stations.length - psoCount;
            const coverage = stations.length > 0 ? Math.round((psoCount / stations.length) * 100) : 0;

            document.getElementById('pso-count').textContent = psoCount;
            document.getElementById('competitor-count').textContent = competitorCount;
            document.getElementById('total-count').textContent = stations.length;
            document.getElementById('coverage-percent').textContent = coverage + '%';
        }

        // Filter stations
        function filterStations(type) {
            // Update active filter button
            document.querySelectorAll('[id^="filter-"]').forEach(btn => {
                btn.classList.remove('bg-yellow-600', 'text-white');
                btn.classList.add('text-gray-300');
            });
            document.getElementById(`filter-${type}`).classList.add('bg-yellow-600', 'text-white');
            document.getElementById(`filter-${type}`).classList.remove('text-gray-300');

            // Filter stations
            let filtered = currentStations;
            if (type === 'pso') {
                filtered = currentStations.filter(s => s.brand === 'PSO');
            } else if (type === 'competitors') {
                filtered = currentStations.filter(s => s.brand !== 'PSO');
            }

            renderStationList(filtered);
        }

        // Clear map markers
        function clearMap() {
            map.eachLayer(layer => {
                if (layer instanceof L.Marker || layer instanceof L.Circle) {
                    map.removeLayer(layer);
                }
            });
            
            // Clear distance labels and connection lines
            if (distanceLabelsGroup) {
                distanceLabelsGroup.clearLayers();
            }
            if (connectionLinesGroup) {
                connectionLinesGroup.clearLayers();
            }
        }

        // Clear all data including station arrays
        function clearAllData() {
            currentStations = [];
            filteredStations = [];
            clearMap();
        }

        // Show loading state with progressive steps
        function showLoading() {
            document.getElementById('loadingIndicator').classList.remove('hidden');
            const searchBtn = document.getElementById('searchBtn');
            searchBtn.disabled = true;
            searchBtn.innerHTML = `
                <svg class="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Searching...
            `;
            
            // Reset loading steps
            resetLoadingSteps();
            
            // Progressive step animation
            setTimeout(() => updateLoadingStep(1), 500);
            setTimeout(() => updateLoadingStep(2), 1500);
            setTimeout(() => updateLoadingStep(3), 2500);
        }

        // Update loading step visibility
        function updateLoadingStep(step) {
            const stepElement = document.getElementById(`loadingStep${step}`);
            if (stepElement) {
                stepElement.classList.remove('opacity-30');
                stepElement.classList.add('opacity-100', 'text-yellow-300');
                
                // Add checkmark when complete
                if (step < 3) {
                    setTimeout(() => {
                        stepElement.innerHTML = stepElement.innerHTML.replace('🔍', '✅').replace('🏗️', '✅').replace('📊', '✅');
                    }, 800);
                }
            }
        }

        // Reset loading steps
        function resetLoadingSteps() {
            for (let i = 1; i <= 3; i++) {
                const stepElement = document.getElementById(`loadingStep${i}`);
                if (stepElement) {
                    stepElement.classList.remove('opacity-100', 'text-yellow-300');
                    stepElement.classList.add('opacity-30');
                    
                    // Reset text
                    if (i === 1) stepElement.innerHTML = 'Querying station database...';
                    if (i === 2) stepElement.innerHTML = 'Processing station data...';
                    if (i === 3) stepElement.innerHTML = 'Calculating distances...';
                }
            }
        }

        // Hide loading state
        function hideLoading() {
            // Show completion step briefly before hiding
            updateLoadingStep(3);
            const step3 = document.getElementById('loadingStep3');
            if (step3) {
                step3.innerHTML = '✅ Search complete!';
                step3.classList.add('text-green-400');
            }
            
            setTimeout(() => {
                document.getElementById('loadingIndicator').classList.add('hidden');
                const searchBtn = document.getElementById('searchBtn');
                searchBtn.disabled = false;
                searchBtn.innerHTML = `
                    <i class="fas fa-search mr-2"></i>
                    Search Stations
                `;
            }, 800);
        }

        // Placeholder functions
        function toggleFocusMode() {
            alert('Focus Mode functionality would be implemented here');
        }

        function tradingAreaAnalysis() {
            alert('Trading Area Analysis would be implemented here');
        }

        function editMap() {
            editMode = !editMode;
            if (editMode) {
                enableEditMode();
            } else {
                disableEditMode();
            }
        }

        // Enable edit mode
        function enableEditMode() {
            editMode = true;
            addType = null;
            createEditToolbar();
            document.getElementById('map').style.cursor = 'crosshair';
            map.on('click', handleMapClickInEditMode);
            if (!editLayerGroup) {
                editLayerGroup = L.layerGroup().addTo(map);
            }
            map.on('zoomend', handleZoomChange);
            if (typeof window.initialZoomLevel === 'undefined') {
                window.initialZoomLevel = map.getZoom();
            }
            showEditableElements();
            const editBtn = document.querySelector('[onclick="editMap()"]');
            if (editBtn) {
                editBtn.innerHTML = '<i class="fas fa-times mr-2"></i>Exit Edit Mode';
                editBtn.classList.add('bg-red-600', 'hover:bg-red-700');
                editBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
            }
        }

        // Disable edit mode
        function disableEditMode() {
            editMode = false;
            addType = null;
            removeEditToolbar();
            document.getElementById('map').style.cursor = '';
            map.off('click', handleMapClickInEditMode);
            map.off('zoomend', handleZoomChange);
            hideEditControls();
            const editBtn = document.querySelector('[onclick="editMap()"]');
            if (editBtn) {
                editBtn.innerHTML = '<i class="fas fa-edit mr-2"></i>Edit Map';
                editBtn.classList.remove('bg-red-600', 'hover:bg-red-700');
                editBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
            }
        }

        // Create edit toolbar
        function createEditToolbar() {
            const toolbar = document.createElement('div');
            toolbar.id = 'edit-toolbar';
            toolbar.className = 'fixed top-20 right-6 bg-[#18181b] border border-[#27272a] rounded-xl p-5 z-[9999] shadow-2xl flex flex-col gap-4 w-80 pointer-events-auto';
            toolbar.innerHTML = `
                <div class="flex items-center justify-between mb-2">
                    <span class="text-lg font-semibold text-[#e4e4e7] tracking-wide flex items-center gap-2"><i class="fas fa-paint-brush"></i> Edit Map</span>
                    <button onclick="disableEditMode()" class="px-2 py-1 rounded bg-[#27272a] hover:bg-[#3f3f46] text-[#e4e4e7] text-xs font-bold transition-all duration-150"><i class="fas fa-times"></i></button>
                </div>
                <div class="flex gap-2 mb-2">
                    <button onclick="setAddType('text')" class="flex-1 px-3 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-150"><i class="fas fa-font"></i>Text</button>
                    <button onclick="setAddType('image')" class="flex-1 px-3 py-2 bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-150"><i class="fas fa-image"></i>Image</button>
                </div>
                <div class="flex gap-2 mb-2">
                    <button onclick="clearAllEditableElements()" class="flex-1 px-3 py-2 bg-[#ef4444] hover:bg-[#dc2626] text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-150"><i class="fas fa-trash"></i>Clear All</button>
                </div>
                <div class="border-t border-[#27272a] pt-3">
                    <label class="block text-[#e4e4e7] text-xs mb-1 font-medium">📁 Upload Image</label>
                    <input type="file" id="image-upload" accept="image/*" class="w-full text-xs text-[#a1a1aa] bg-[#27272a] rounded-lg px-2 py-1 border-none focus:outline-none" style="margin-top:2px;" />
                </div>
                <div class="border-t border-[#27272a] pt-3">
                    <p class="text-xs text-[#a1a1aa] mb-1 font-medium">💡 Instructions</p>
                    <ul class="text-xs text-[#a1a1aa] space-y-1 list-disc pl-4">
                        <li>Click a tool, then click the map to add</li>
                        <li>Drag elements to move</li>
                        <li>Use resize handles to scale</li>
                        <li>Elements scale with zoom level</li>
                        <li>Click elements for options</li>
                    </ul>
                </div>
            `;
            // Always append to document.body so it stays above fullscreen
            document.body.appendChild(toolbar);
            document.getElementById('image-upload').addEventListener('change', handleImageUpload);

            // Listen for fullscreen changes to re-append toolbar if needed
            document.addEventListener('fullscreenchange', () => {
                const toolbar = document.getElementById('edit-toolbar');
                if (toolbar && !document.body.contains(toolbar)) {
                    document.body.appendChild(toolbar);
                }
                // Optionally, adjust toolbar position if map is fullscreen
                if (document.fullscreenElement) {
                    toolbar.style.top = '32px';
                    toolbar.style.right = '32px';
                } else {
                    toolbar.style.top = '';
                    toolbar.style.right = '';
                }
            });
        }

        // Remove edit toolbar
        function removeEditToolbar() {
            const toolbar = document.getElementById('edit-toolbar');
            if (toolbar) {
                toolbar.remove();
            }
        }

        // Set current edit tool
        function setAddType(type) {
            addType = type;
            document.querySelectorAll('#edit-toolbar button').forEach(btn => {
                btn.classList.remove('ring-2', 'ring-yellow-400');
            });
            event.target.classList.add('ring-2', 'ring-yellow-400');
        }

        // Handle zoom changes to scale elements dynamically
        // Handle zoom changes to scale elements dynamically
        function handleZoomChange() {
            if (!editLayerGroup || !editMode) return;
            
            const currentZoom = map.getZoom();
            const initialZoom = window.initialZoomLevel || currentZoom;
            
            // Calculate scale factor based on zoom difference
            // Use a more gradual scaling factor for better visual experience
            const zoomDiff = currentZoom - initialZoom;
            const scaleFactor = Math.pow(1.4, zoomDiff); // Less aggressive than 2^zoomDiff
            
            // Scale all editable elements
            editLayerGroup.eachLayer(function(marker) {
                if (marker._baseSize && marker._customType) {
                    const baseWidth = marker._baseSize.width;
                    const baseHeight = marker._baseSize.height;
                    
                    // Calculate new dimensions with reasonable limits
                    const newWidth = Math.max(20, Math.min(500, baseWidth * scaleFactor));
                    const newHeight = Math.max(15, Math.min(300, baseHeight * scaleFactor));
                    
                    // Update marker size
                    marker._customSize = { width: newWidth, height: newHeight };
                    
                    // Get the icon element
                    const iconElem = marker.getElement();
                    if (!iconElem) return;
                    
                    const targetElem = iconElem.querySelector('div, img');
                    if (!targetElem) return;
                    
                    if (marker._customType === 'text') {
                        // Update text element
                        const color = marker._customColor || '#FFD700';
                        const shape = marker._customShape || 'rounded';
                        const borderRadius = shape === 'rounded' ? '8px' : '0px';
                        const text = marker._customValue || 'Sample Text';
                        
                        // Recreate the icon with new size
                        marker.setIcon(L.divIcon({
                            className: 'custom-text-marker',
                            html: `<div style="
                                background: ${color};
                                color: #003366;
                                padding: 8px 16px;
                                border-radius: ${borderRadius};
                                font-weight: 700;
                                box-shadow: 0 2px 8px rgba(0,0,0,0.10);
                                width: ${newWidth}px;
                                height: ${newHeight}px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                text-align: center;
                                user-select: none;
                                box-sizing: border-box;
                                overflow: hidden;
                                word-wrap: break-word;
                                line-height: 1.2;
                            ">${text}</div>`,
                            iconSize: [newWidth, newHeight],
                            iconAnchor: [newWidth/2, newHeight/2]
                        }));
                        
                        // Re-apply resize functionality and font adjustment
                        setTimeout(() => {
                            makeDivIconResizable(marker, 'text');
                            const newIconElem = marker.getElement().querySelector('div');
                            if (newIconElem) {
                                adjustFontToFitContainer(newIconElem, newWidth, newHeight);
                            }
                        }, 50);
                        
                    } else if (marker._customType === 'image') {
                        // Update image element
                        const color = marker._customColor || '#fff';
                        const shape = marker._customShape || 'rounded';
                        const borderRadius = shape === 'rounded' ? '8px' : '0px';
                        const src = marker._customValue || 'https://cdn-icons-png.flaticon.com/512/235/235861.png';
                        
                        // Recreate the icon with new size
                        marker.setIcon(L.divIcon({
                            className: 'custom-image-marker',
                            html: `<img src="${src}" alt="Custom" style="
                                width: ${newWidth}px; 
                                height: ${newHeight}px;
                                border-radius: ${borderRadius};
                                box-shadow: 0 2px 8px rgba(0,0,0,0.10);
                                background: ${color};
                                object-fit: cover;
                                user-select: none;
                            ">`,
                            iconSize: [newWidth, newHeight],
                            iconAnchor: [newWidth/2, newHeight/2]
                        }));
                        
                        // Re-apply resize functionality
                        setTimeout(() => makeDivIconResizable(marker, 'image'), 50);
                    }
                }
            });
        }
        // Handle map click in edit mode
        function handleMapClickInEditMode(e) {
            if (!editMode || !addType) return;
            if (addType === 'text') {
                addTextElement(e.latlng);
            } else if (addType === 'image') {
                const fileInput = document.getElementById('image-upload');
                if (fileInput.files.length > 0) {
                    addImageElementFromFile(e.latlng, fileInput.files[0]);
                } else {
                    addImageElementFromURL(e.latlng);
                }
            }
            addType = null;
            document.querySelectorAll('#edit-toolbar button').forEach(btn => {
                btn.classList.remove('ring-2', 'ring-yellow-400');
            });
        }

        // Add text element
        function addTextElement(latlng) {
            const text = prompt('Enter text to add to the map:') || 'Sample Text';
            if (!text) return;
            const color = prompt('Enter background color (CSS value or hex, e.g. #FFD700):', '#FFD700') || '#FFD700';
            const shape = prompt('Shape? Enter "rounded" or "rectangle":', 'rounded') || 'rounded';
            const tempSpan = document.createElement('span');
            tempSpan.style.cssText = `visibility: hidden; position: absolute; font-weight: 700; font-size: 16px; padding: 8px 16px; font-family: inherit;white-space: nowrap; box-sizing: border-box;`;
            tempSpan.textContent = text;
            document.body.appendChild(tempSpan);
            const width = Math.max(80, tempSpan.offsetWidth + 20);
            const height = Math.max(40, tempSpan.offsetHeight + 16);
            document.body.removeChild(tempSpan);
            const borderRadius = shape === 'rounded' ? '8px' : '0px';
            const elementId = 'text-' + (++elementIdCounter);
            const marker = L.marker(latlng, {
                icon: L.divIcon({
                    className: 'custom-text-marker',
                    html: `<div style="background: ${color};color: #003366;padding: 8px 16px;border-radius: ${borderRadius};font-weight: 700;box-shadow: 0 2px 8px rgba(0,0,0,0.10);font-size: 16px;width: ${width}px;height: ${height}px;display: flex;align-items: center;justify-content: center;text-align: center;user-select: none;box-sizing: border-box;overflow: hidden;word-wrap: break-word;line-height: 1.2;">${text}</div>`,
                    iconSize: [width, height],
                    iconAnchor: [width/2, height/2]
                })
            });
            marker._customType = 'text';
            marker._customValue = text;
            marker._customColor = color;
            marker._customShape = shape;
            marker._customSize = { width: width, height: height };
            marker._baseSize = { width: width, height: height };
            marker._elementId = elementId;
            marker.addTo(editLayerGroup);
            addEditableMarker(marker, 'text', text);
            makeDivIconResizable(marker, 'text');
            editableElements.push({
                id: elementId,
                type: 'text',
                marker: marker,
                latlng: latlng,
                content: text
            });
        }

        // Add image element from uploaded file
        function addImageElementFromFile(latlng, file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                createImageMarker(latlng, e.target.result);
            };
            reader.readAsDataURL(file);
        }

        // Add image element from URL
        function addImageElementFromURL(latlng) {
            let url = prompt('Paste image URL (or leave blank for default):');
            if (!url) {
                url = 'https://cdn-icons-png.flaticon.com/512/235/235861.png';
            }
            createImageMarker(latlng, url);
        }

        // Create image marker
        function createImageMarker(latlng, src) {
            const color = prompt('Enter background color for image (CSS value or hex, e.g. #fff):', '#fff') || '#fff';
            const shape = prompt('Shape? Enter "rounded" or "rectangle":', 'rounded') || 'rounded';
            const borderRadius = shape === 'rounded' ? '8px' : '0px';
            const elementId = 'image-' + (++elementIdCounter);
            const marker = L.marker(latlng, {
                icon: L.divIcon({
                    className: 'custom-image-marker',
                    html: `<img src="${src}" alt="Custom" style="width: 48px; height: 48px;border-radius: ${borderRadius};box-shadow: 0 2px 8px rgba(0,0,0,0.10);background: ${color};display: block;user-select: none;">`,
                    iconSize: [48, 48],
                    iconAnchor: [24, 24]
                })
            });
            marker._customType = 'image';
            marker._customValue = src;
            marker._customColor = color;
            marker._customShape = shape;
            marker._customSize = { width: 48, height: 48 };
            marker._baseSize = { width: 48, height: 48 };
            marker._elementId = elementId;
            marker.addTo(editLayerGroup);
            addEditableMarker(marker, 'image', src);
            makeDivIconResizable(marker, 'image');
            editableElements.push({
                id: elementId,
                type: 'image',
                marker: marker,
                latlng: latlng,
                content: src
            });
        }

        // Add editable marker functionality
        function addEditableMarker(marker, type, initialValue) {
            // Double-click event for popup
            marker.on('dblclick', function(e) {
                let popupContent = '';
                if (type === 'text') {
                    popupContent = `
                        <div style="background:#18181b;border:1px solid #27272a;border-radius:12px;padding:18px 14px;min-width:220px;box-shadow:0 4px 24px rgba(0,0,0,0.18);display:flex;flex-direction:column;gap:10px;">
                            <button onclick=\"window._editCustomMarker(${marker._leaflet_id},'text')\" style=\"margin-bottom:6px;width:100%;background:#2563eb;color:#fff;border:none;border-radius:8px;padding:10px;font-weight:600;cursor:pointer;transition:background 0.2s;\">✏️ Edit Text</button>
                            <button onclick=\"window._customizeBox(${marker._leaflet_id})\" style=\"margin-bottom:6px;width:100%;background:#22c55e;color:#fff;border:none;border-radius:8px;padding:10px;font-weight:600;cursor:pointer;transition:background 0.2s;\">🎨 Customize Box</button>
                            <button onclick=\"window._deleteCustomMarker(${marker._leaflet_id})\" style=\"width:100%;background:#ef4444;color:#fff;border:none;border-radius:8px;padding:10px;font-weight:600;cursor:pointer;transition:background 0.2s;\">🗑️ Delete</button>
                        </div>
                    `;
                } else if (type === 'image') {
                    popupContent = `
                        <div style="background:#18181b;border:1px solid #27272a;border-radius:12px;padding:18px 14px;min-width:220px;box-shadow:0 4px 24px rgba(0,0,0,0.18);display:flex;flex-direction:column;gap:10px;">
                            <button onclick=\"window._editCustomMarker(${marker._leaflet_id},'image')\" style=\"margin-bottom:6px;width:100%;background:#FFD700;color:#003366;border:none;border-radius:8px;padding:10px;font-weight:600;cursor:pointer;transition:background 0.2s;\">🖼️ Edit Image</button>
                            <button onclick=\"window._customizeBox(${marker._leaflet_id})\" style=\"margin-bottom:6px;width:100%;background:#22c55e;color:#fff;border:none;border-radius:8px;padding:10px;font-weight:600;cursor:pointer;transition:background 0.2s;\">🎨 Customize Box</button>
                            <button onclick=\"window._deleteCustomMarker(${marker._leaflet_id})\" style=\"width:100%;background:#ef4444;color:#fff;border:none;border-radius:8px;padding:10px;font-weight:600;cursor:pointer;transition:background 0.2s;\">🗑️ Delete</button>
                        </div>
                    `;
                }
                marker.bindPopup(popupContent).openPopup();
            });
            marker._customType = type;
            marker._customValue = initialValue;
        }

        // Make elements resizable and draggable
        function makeDivIconResizable(marker, type) {
            setTimeout(() => {
                const iconElem = marker.getElement().querySelector('div, img');
                if (!iconElem) return;
                let wrapper = iconElem.parentElement;
                wrapper.style.position = 'relative';
                wrapper.style.display = 'inline-block';
                let handle = document.createElement('div');
                handle.className = 'resize-handle';
                handle.title = 'Resize';
                handle.style.cssText = `position: absolute; right: -9px; bottom: -9px;width: 18px; height: 18px;background: rgba(255,215,0,0.9);border: 2px solid #003366;border-radius: 50%;cursor: nwse-resize;z-index: 1000;display: flex;align-items: center;justify-content: center;opacity: 0.8;transition: opacity 0.2s ease;`;
                handle.innerHTML = `<svg width="10" height="10" style="display:block;" viewBox="0 0 12 12"><path d="M2 10L10 2M7 10h3v-3" stroke="#003366" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`;
                wrapper.style.boxShadow = '0 0 0 1px rgba(255,215,0,0.6), 0 2px 4px rgba(0,0,0,0.1)';
                wrapper.style.border = '1px dashed rgba(255,215,0,0.8)';
                wrapper.style.transition = 'all 0.2s ease';
                wrapper.addEventListener('mouseenter', function() {
                    handle.style.opacity = '1';
                    wrapper.style.boxShadow = '0 0 0 2px rgba(255,215,0,0.8), 0 4px 8px rgba(0,0,0,0.15)';
                });
                wrapper.addEventListener('mouseleave', function() {
                    if (!resizing && !dragging) {
                        handle.style.opacity = '0.6';
                        wrapper.style.boxShadow = '0 0 0 1px rgba(255,215,0,0.6), 0 2px 4px rgba(0,0,0,0.1)';
                    }
                });
                let resizing = false;
                let startX, startY, startW, startH;
                handle.addEventListener('mousedown', function(e) {
                    e.stopPropagation();
                    e.preventDefault();
                    resizing = true;
                    startX = e.clientX;
                    startY = e.clientY;
                    startW = iconElem.offsetWidth;
                    startH = iconElem.offsetHeight;
                    document.body.style.userSelect = 'none';
                    handle.style.opacity = '1';
                    function onMouseMove(e) {
                        if (!resizing) return;
                        let dx = e.clientX - startX;
                        let dy = e.clientY - startY;
                        let newW = Math.max(60, Math.min(400, startW + dx));
                        let newH = Math.max(30, Math.min(200, startH + dy));
                        marker._customSize = { width: newW, height: newH };
                        const currentZoom = map.getZoom();
                        const initialZoom = window.initialZoomLevel || currentZoom;
                        const currentScale = Math.pow(2, currentZoom - initialZoom);
                        marker._baseSize = { width: newW / currentScale, height: newH / currentScale };
                        if (type === 'text') {
                            iconElem.style.width = newW + 'px';
                            iconElem.style.height = newH + 'px';
                            adjustFontToFitContainer(iconElem, newW, newH);
                        } else if (type === 'image') {
                            iconElem.style.width = newW + 'px';
                            iconElem.style.height = newH + 'px';
                        }
                    }
                    function onMouseUp() {
                        if (resizing) {
                            resizing = false;
                            document.body.style.userSelect = '';
                            document.removeEventListener('mousemove', onMouseMove);
                            document.removeEventListener('mouseup', onMouseUp);
                        }
                    }
                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);
                });
                let dragging = false;
                let dragStart = null;
                let mapStart = null;
                wrapper.addEventListener('mousedown', function(e) {
                    if (e.target === handle || e.target.closest('.resize-handle')) return;
                    e.stopPropagation();
                    e.preventDefault();
                    dragging = true;
                    dragStart = { x: e.clientX, y: e.clientY };
                    mapStart = marker.getLatLng();
                    document.body.style.cursor = 'move';
                    wrapper.style.opacity = '0.8';
                    function onDragMove(ev) {
                        if (!dragging) return;
                        let dx = ev.clientX - dragStart.x;
                        let dy = ev.clientY - dragStart.y;
                        const map = marker._map;
                        if (!map) return;
                        const startPoint = map.latLngToContainerPoint(mapStart);
                        const newPoint = L.point(startPoint.x + dx, startPoint.y + dy);
                        const newLatLng = map.containerPointToLatLng(newPoint);
                        marker.setLatLng(newLatLng);
                    }
                    function onDragUp() {
                        if (dragging) {
                            dragging = false;
                            document.body.style.cursor = '';
                            wrapper.style.opacity = '1';
                            document.removeEventListener('mousemove', onDragMove);
                            document.removeEventListener('mouseup', onDragUp);
                        }
                    }
                    document.addEventListener('mousemove', onDragMove);
                    document.addEventListener('mouseup', onDragUp);
                });
                if (!wrapper.querySelector('.resize-handle')) {
                    wrapper.appendChild(handle);
                }
                wrapper.addEventListener('mouseenter', function(e) {
                    if (e.target !== handle && !e.target.closest('.resize-handle')) {
                        wrapper.style.cursor = 'move';
                    }
                });
                wrapper.addEventListener('mouseleave', function(e) {
                    if (!dragging) {
                        wrapper.style.cursor = '';
                    }
                });
            }, 100);
        }

        // Auto-adjust font size to fit container
        function adjustFontToFitContainer(elem, containerWidth, containerHeight) {
            const text = elem.textContent || elem.innerText;
            if (!text) return;
            const paddingX = 32;
            const paddingY = 16;
            const availableWidth = containerWidth - paddingX;
            const availableHeight = containerHeight - paddingY;
            let fontSize = Math.min(24, Math.max(10, Math.floor(availableHeight * 0.6)));
            elem.style.fontSize = fontSize + 'px';
            const tempDiv = document.createElement('div');
            tempDiv.style.cssText = `position: absolute;visibility: hidden;font-family: ${window.getComputedStyle(elem).fontFamily};font-weight: ${window.getComputedStyle(elem).fontWeight};line-height: 1.2;white-space: nowrap;padding: 0;margin: 0;`;
            document.body.appendChild(tempDiv);
            let minSize = 8;
            let maxSize = 48;
            let optimalSize = fontSize;
            for (let i = 0; i < 10; i++) {
                tempDiv.style.fontSize = fontSize + 'px';
                tempDiv.textContent = text;
                const textWidth = tempDiv.offsetWidth;
                const textHeight = tempDiv.offsetHeight;
                if (textWidth <= availableWidth && textHeight <= availableHeight) {
                    optimalSize = fontSize;
                    minSize = fontSize;
                    fontSize = Math.ceil((fontSize + maxSize) / 2);
                } else {
                    maxSize = fontSize;
                    fontSize = Math.floor((minSize + fontSize) / 2);
                }
                if (maxSize - minSize <= 1) break;
            }
            document.body.removeChild(tempDiv);
            elem.style.fontSize = optimalSize + 'px';
            if (text.length > 20) {
                elem.style.whiteSpace = 'normal';
                elem.style.wordBreak = 'break-word';
                elem.style.lineHeight = '1.2';
            } else {
                elem.style.whiteSpace = 'nowrap';
            }
        }

        // Simplified font adjustment
        function adjustFontToFit(elem, minFont = 8, maxFont = 24) {
            const rect = elem.getBoundingClientRect();
            adjustFontToFitContainer(elem, rect.width, rect.height);
        }

        // Global functions for popup buttons
        window._editCustomMarker = function(id, type) {
            const marker = Object.values(editLayerGroup._layers).find(m => m._leaflet_id === id);
            if (!marker) return;
            if (type === 'text') {
                const newText = prompt('Edit text:', marker._customValue || '');
                if (newText !== null && newText !== undefined && newText !== '') {
                    const iconElem = marker.getElement().querySelector('div');
                    if (iconElem) {
                        iconElem.textContent = newText;
                        const currentWidth = iconElem.offsetWidth;
                        const currentHeight = iconElem.offsetHeight;
                        adjustFontToFitContainer(iconElem, currentWidth, currentHeight);
                    }
                    marker._customValue = newText;
                }
            } else if (type === 'image') {
                let url = prompt('Edit image URL:', marker._customValue || '');
                if (!url) {
                    url = 'https://cdn-icons-png.flaticon.com/512/235/235861.png';
                }
                const color = marker._customColor || '#fff';
                const shape = marker._customShape || 'rounded';
                const borderRadius = shape === 'rounded' ? '8px' : '0px';
                const currentSize = marker._customSize || { width: 48, height: 48 };
                marker.setIcon(L.divIcon({
                    className: 'custom-image-marker',
                    html: `<img src="${url}" alt="Custom" style="width: ${currentSize.width}px; height: ${currentSize.height}px;border-radius: ${borderRadius};box-shadow: 0 2px 8px rgba(0,0,0,0.10);background: ${color};object-fit: cover;user-select: none;">`,
                    iconSize: [currentSize.width, currentSize.height],
                    iconAnchor: [currentSize.width/2, currentSize.height/2]
                }));
                marker._customValue = url;
                const currentZoom = map.getZoom();
                const initialZoom = window.initialZoomLevel || currentZoom;
                const currentScale = Math.pow(1.4, currentZoom - initialZoom);
                marker._baseSize = { width: currentSize.width / currentScale, height: currentSize.height / currentScale };
                setTimeout(() => makeDivIconResizable(marker, 'image'), 100);
            }
            marker.closePopup();
        };

        window._customizeBox = function(id) {
            const marker = Object.values(editLayerGroup._layers).find(m => m._leaflet_id === id);
            if (!marker) return;
            const type = marker._customType;
            let color = marker._customColor || (type === 'text' ? '#FFD700' : '#fff');
            let shape = marker._customShape || 'rounded';
            color = prompt('Enter background color (CSS value or hex):', color) || color;
            shape = prompt('Shape? Enter "rounded" or "rectangle":', shape) || shape;
            const borderRadius = shape === 'rounded' ? '8px' : '0px';
            if (type === 'text') {
                const iconElem = marker.getElement().querySelector('div');
                if (iconElem) {
                    iconElem.style.background = color;
                    iconElem.style.borderRadius = borderRadius;
                }
            } else if (type === 'image') {
                const iconElem = marker.getElement().querySelector('img');
                if (iconElem) {
                    iconElem.style.background = color;
                    iconElem.style.borderRadius = borderRadius;
                }
            }
            marker._customColor = color;
            marker._customShape = shape;
        };

        window._deleteCustomMarker = function(id) {
            const marker = Object.values(editLayerGroup._layers).find(m => m._leaflet_id === id);
            if (marker) {
                editLayerGroup.removeLayer(marker);
                const index = editableElements.findIndex(el => el.marker === marker);
                if (index > -1) {
                    editableElements.splice(index, 1);
                }
            }
        };

        // Clear all editable elements
        function clearAllEditableElements() {
            if (confirm('Are you sure you want to delete all text and image elements?')) {
                if (editLayerGroup) {
                    editLayerGroup.clearLayers();
                }
                editableElements = [];
            }
        }

        // Show editable elements
        function showEditableElements() {
            editableElements.forEach(element => {
                if (element.marker) {
                    element.marker.setIcon(element.marker.getIcon());
                }
            });
        }

        // Hide edit controls
        function hideEditControls() {
            // Elements will automatically hide controls when edit mode is disabled
        }

        // Handle image upload
        function handleImageUpload(event) {
            const file = event.target.files[0];
            if (file) {
                console.log('Image selected:', file.name);
            }
        }


        // Save map data to storage manager
function saveMapDataToStorage(lat, lng, radius, stations) {
    try {
        const mapData = {
            searchCoordinates: {
                latitude: lat,
                longitude: lng,
                radius: radius
            },
            stations: stations.map(station => ({
                id: station.id,
                name: station.name,
                brand: station.brand,
                lat: station.lat,
                lng: station.lng,
                distance: station.distance,
                travelTime: station.travelTime,
                distanceSource: station.distanceSource,
                address: station.address,
                phone: station.phone,
                services: station.services,
                rating: station.rating,
                price: station.price,
                opening_hours: station.opening_hours,
                operator: station.operator,
                fuels: station.fuels
            })),
            totalStations: stations.length,
            brands: [...new Set(stations.map(s => s.brand))],
            psoStations: stations.filter(s => s.brand === 'PSO').length,
            competitorStations: stations.filter(s => s.brand !== 'PSO').length,
            averageDistance: stations.length > 0 ? (stations.reduce((sum, s) => sum + s.distance, 0) / stations.length).toFixed(2) : 0,
            searchRadius: radius,
            metadata: {
                searchTimestamp: new Date().toISOString(),
                apiSource: 'Overpass API + Multiple Routing Services',
                totalFound: stations.length,
                module: 'map'
            }
        };

        if (window.storageManager) {
            window.storageManager.setMapData(mapData);
            console.log('✅ Map data saved to storage manager:', mapData);
        } else {
            console.warn('⚠️ StorageManager not available, data not saved');
        }
    } catch (error) {
        console.error('❌ Error saving map data to storage:', error);
    }
}

        // Initialize map when page loads
        document.addEventListener('DOMContentLoaded', function() {
            initMap();
            
            // Try loading from storage first, then fall back to cookies
            setTimeout(() => {
                if (!loadMapDataFromStorage()) {
                    loadCoordinatesFromCookies();
                }
            }, 100); // Small delay to ensure storage manager is loaded
            
            // Add coordinate change listeners for auto-save
            setupCoordinateListeners();
        });

        // Setup coordinate change listeners
        function setupCoordinateListeners() {
            const latElement = document.getElementById('latitude');
            const lngElement = document.getElementById('longitude');
            const radiusElement = document.getElementById('radius');
            
            if (latElement) {
                latElement.addEventListener('input', saveCurrentCoordinatesToStorage);
            }
            if (lngElement) {
                lngElement.addEventListener('input', saveCurrentCoordinatesToStorage);
            }
            if (radiusElement) {
                radiusElement.addEventListener('input', saveCurrentCoordinatesToStorage);
            }
        }

        // Save current coordinates to storage
        function saveCurrentCoordinatesToStorage() {
            try {
                const lat = parseFloat(document.getElementById('latitude').value);
                const lng = parseFloat(document.getElementById('longitude').value);
                const radius = parseFloat(document.getElementById('radius').value);
                
                if (!isNaN(lat) && !isNaN(lng) && !isNaN(radius)) {
                    const coordData = {
                        searchCoordinates: {
                            latitude: lat,
                            longitude: lng,
                            radius: radius
                        },
                        metadata: {
                            lastUpdated: new Date().toISOString(),
                            module: 'map'
                        }
                    };
                    
                    if (window.storageManager) {
                        // Get existing map data and update coordinates
                        const existingData = window.storageManager.getMapData();
                        const updatedData = { ...existingData, ...coordData };
                        window.storageManager.setMapData(updatedData);
                    }
                }
            } catch (error) {
                console.error('❌ Error saving coordinates to storage:', error);
            }
        }
        // Configuration
        const APP_CONFIG = {
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

        // Utility functions
        const Utils = {
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

        // Station Fetcher Class
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
                        console.log('Using cached data');
                        return cached.data;
                    }
                }

                const query = this.buildOverpassQuery(lat, lng, radius);

                try {
                    console.log('Fetching data from Overpass API...');
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
                    [out:json][timeout:${APP_CONFIG.OVERPASS_TIMEOUT}];
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

                    const distance = Utils.calculateDistance(searchLat, searchLng, stationLat, stationLng);

                    // Filter by radius
                    if (distance > radius) {
                        console.log(`Station ${element.id} too far: ${distance.toFixed(2)}km > ${radius}km`);
                        return;
                    }

                    const tags = element.tags || {};

                    // STRICT FILTERING - Remove CNG and unknown stations
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

                    // Only allow these exact brands - reject everything else
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
                        address: Utils.formatAddress(tags),
                        phone: tags.phone || 'N/A',
                        services: services,
                        rating: 3.5 + Math.random() * 1.5, // Mock rating between 3.5-5
                        price: APP_CONFIG.FUEL_PRICES[brand] || 270.00,
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

            // Fallback mock data in case API fails
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
        // Initialize station fetcher
const stationFetcher = new StationFetcher();

// Store for distances calculated via Leaflet Routing Machine
let routingDistances = new Map();

// Initialize map
function initMap() {
    map = L.map('map').setView([25.3730, 68.3512], 15);

    // Layer Control
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    });

    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '© Esri'
    });

    const terrainLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenTopoMap'
    });

    // Add default layer
    osmLayer.addTo(map);

    // Layer control
    const baseLayers = {
        "Street Map": osmLayer,
        "Satellite": satelliteLayer,
        "Terrain": terrainLayer
    };

    L.control.layers(baseLayers).addTo(map);

    // Map click event
    map.on('click', function (e) {
        document.getElementById('latitude').value = e.latlng.lat.toFixed(6);
        document.getElementById('longitude').value = e.latlng.lng.toFixed(6);
    });
}

// Get accurate road distance using OpenRouteService API
function getRoadDistance(startLat, startLng, endLat, endLng) {
    return new Promise(async (resolve, reject) => {
        try {
            // Method 1: Try OpenRouteService (free, no API key required for basic usage)
            const orsUrl = `https://api.openrouteservice.org/v2/directions/driving-car?start=${startLng},${startLat}&end=${endLng},${endLat}`;
            
            try {
                const orsResponse = await fetch(orsUrl, {
                    headers: {
                        'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8'
                    }
                });
                
                if (orsResponse.ok) {
                    const orsData = await orsResponse.json();
                    if (orsData.features && orsData.features[0]) {
                        const route = orsData.features[0].properties.segments[0];
                        const distanceKm = route.distance / 1000;
                        const timeSeconds = route.duration;
                        
                        resolve({
                            distance: distanceKm,
                            time: timeSeconds,
                            source: 'OpenRouteService'
                        });
                        return;
                    }
                }
            } catch (orsError) {
                console.warn('OpenRouteService failed:', orsError.message);
            }

            // Method 2: Try GraphHopper (free tier available)
            try {
                const graphHopperUrl = `https://graphhopper.com/api/1/route?point=${startLat},${startLng}&point=${endLat},${endLng}&vehicle=car&locale=en&calc_points=false&type=json`;
                
                const ghResponse = await fetch(graphHopperUrl);
                if (ghResponse.ok) {
                    const ghData = await ghResponse.json();
                    if (ghData.paths && ghData.paths[0]) {
                        const path = ghData.paths[0];
                        const distanceKm = path.distance / 1000;
                        const timeSeconds = path.time / 1000;
                        
                        resolve({
                            distance: distanceKm,
                            time: timeSeconds,
                            source: 'GraphHopper'
                        });
                        return;
                    }
                }
            } catch (ghError) {
                console.warn('GraphHopper failed:', ghError.message);
            }

            // Method 3: Fallback to Google-style estimation (better than straight line)
            try {
                const straightDistance = Utils.calculateDistance(startLat, startLng, endLat, endLng);
                // Apply road factor (roads are typically 1.3-1.5x longer than straight line)
                const roadFactor = 1.4;
                const estimatedDistance = straightDistance * roadFactor;
                // Estimate time based on average speed (40 km/h in urban areas)
                const estimatedTime = (estimatedDistance / 40) * 3600;
                
                resolve({
                    distance: estimatedDistance,
                    time: estimatedTime,
                    source: 'Estimated (road factor)'
                });
            } catch (fallbackError) {
                reject(new Error(`All routing methods failed: ${fallbackError.message}`));
            }

        } catch (error) {
            reject(new Error(`Routing calculation failed: ${error.message}`));
        }
    });
}

// Batch process distances with multiple routing services
async function fetchDistancesWithRouting(searchLat, searchLng, stations) {
    console.log(`🗺️  Calculating road distances for ${stations.length} stations using multiple routing services...`);
    
    const results = [];
    const batchSize = 5; // Process 5 at a time to avoid rate limiting
    
    for (let i = 0; i < stations.length; i += batchSize) {
        const batch = stations.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (station, index) => {
            try {
                const result = await getRoadDistance(searchLat, searchLng, station.lat, station.lng);
                
                // Update station with accurate data
                station.distance = result.distance;
                station.travelTime = result.time;
                station.distanceSource = result.source;
                
                console.log(`✅ ${station.name}: ${result.distance.toFixed(2)}km (${Math.round(result.time/60)}min) via ${result.source}`);
                return station;
                
            } catch (error) {
                console.warn(`❌ Error calculating route for ${station.name}:`, error.message);
                // Keep original straight-line distance if routing fails
                station.distanceSource = 'Direct distance (fallback)';
                return station;
            }
        });
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Small delay between batches to be respectful to APIs
        if (i + batchSize < stations.length) {
            await new Promise(resolve => setTimeout(resolve, 1500));
        }
        
        // Update progress
        console.log(`📊 Progress: ${Math.min(i + batchSize, stations.length)}/${stations.length} stations processed`);
    }
    
    // Sort by accurate distance
    stations.sort((a, b) => a.distance - b.distance);
    
    console.log('🎉 All road distances calculated!');
    return stations;
}

function setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for(let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for(let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

// Load previous map data from storage
function loadMapDataFromStorage() {
    try {
        if (window.storageManager) {
            const mapData = window.storageManager.getMapData();
            if (mapData && mapData.stations && mapData.stations.length > 0) {
                console.log('📋 Loading previous map data from storage:', mapData);
                
                // Restore search coordinates
                if (mapData.searchCoordinates) {
                    document.getElementById('latitude').value = mapData.searchCoordinates.latitude;
                    document.getElementById('longitude').value = mapData.searchCoordinates.longitude;
                    document.getElementById('radius').value = mapData.searchCoordinates.radius;
                    
                    // Set map view
                    map.setView([mapData.searchCoordinates.latitude, mapData.searchCoordinates.longitude], 14);
                    
                    // Add search marker
                    const searchMarker = L.marker([mapData.searchCoordinates.latitude, mapData.searchCoordinates.longitude], {
                        icon: L.divIcon({
                            html: `
                                <div style="width: 32px; height: 32px;">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="#3b82f6" viewBox="0 0 24 24">
                                    <path fill-rule="evenodd" d="M12 2C8.686 2 6 4.686 6 8c0 4.97 6 13 6 13s6-8.03 6-13c0-3.314-2.686-6-6-6zm0 8a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
                                    </svg>
                                </div>
                            `,
                            className: 'custom-marker',
                            iconSize: [32, 32],
                            iconAnchor: [16, 32],
                        })
                    }).addTo(map);

                    // Add radius circle
                    radiusCircle = L.circle([mapData.searchCoordinates.latitude, mapData.searchCoordinates.longitude], {
                        color: '#10b981',
                        fillColor: '#34d399',
                        fillOpacity: 0.1,
                        weight: 2,
                        radius: mapData.searchCoordinates.radius * 1000
                    }).addTo(map);
                }
                
                // Restore stations
                displayStationResults(mapData.stations);
                updateStatistics(mapData.stations);
                
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error('❌ Error loading map data from storage:', error);
        return false;
    }
}

function loadCoordinatesFromCookies() {
    const savedLat = getCookie('map_latitude');
    const savedLng = getCookie('map_longitude');
    const savedRadius = getCookie('map_radius');
    
    if (savedLat && savedLng && savedRadius) {
        // Auto-fill the input fields
        document.getElementById('latitude').value = savedLat;
        document.getElementById('longitude').value = savedLng;
        document.getElementById('radius').value = savedRadius;
        
        console.log('Coordinates loaded from cookies:', { 
            lat: savedLat, 
            lng: savedLng, 
            radius: savedRadius 
        });
        
        
            }
}
// Search function (updated)
    async function searchStations() {
        const lat = parseFloat(document.getElementById('latitude').value);
        const lng = parseFloat(document.getElementById('longitude').value);
        const radius = parseFloat(document.getElementById('radius').value);

        if (isNaN(lat) || isNaN(lng) || isNaN(radius) || radius <= 0) {
            alert('Please enter valid coordinates and radius');
            return;
        }
        setCookie('map_latitude', lat, 7);
        setCookie('map_longitude', lng, 7);
        setCookie('map_radius', radius, 7);
        console.log('Coordinates saved to cookies:', { lat, lng, radius });
        
        // Show enhanced loading overlay
        showLoading();
        
        // console.log('XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
        try {
            console.log(`🔍 Searching for fuel stations within ${radius} km of (${lat.toFixed(6)}, ${lng.toFixed(6)})...`);
            // Clear previous markers
            clearMap();
            clearAllData();

            // Set map view to search location and zoom in
            map.setView([lat, lng], 14);

            // Add search marker
            const searchMarker = L.marker([lat, lng], {
                icon: L.divIcon({
                    html: `
    <div style="width: 32px; height: 32px;">
        <svg xmlns="http://www.w3.org/2000/svg" fill="#3b82f6" viewBox="0 0 24 24">
        <path fill-rule="evenodd" d="M12 2C8.686 2 6 4.686 6 8c0 4.97 6 13 6 13s6-8.03 6-13c0-3.314-2.686-6-6-6zm0 8a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/>
        </svg>
    </div>
    `,
                    className: 'custom-marker',
                    iconSize: [32, 32],
                    iconAnchor: [16, 32],
                })
            }).addTo(map);

            // Add radius circle
            radiusCircle = L.circle([lat, lng], {
                color: '#10b981',
                fillColor: '#34d399',
                fillOpacity: 0.1,
                weight: 2,
                radius: radius * 1000
            }).addTo(map);

            // Fetch stations
            const stations = await stationFetcher.fetchFuelStations(lat, lng, radius);
            
            // Show initial results
            displayStationResults(stations);
            
            // Update loading text for distance calculation phase
            // document.getElementById('loadingIndicator').querySelector('.text-white.font-semibold').textContent = 'Calculating Distances...';
            // // document.getElementById('loadingIndicator').querySelector('.text-gray-300.text-sm').textContent = 'Computing precise road distances using routing services';

            // Calculate accurate distances with multiple routing services
            await fetchDistancesWithRouting(lat, lng, stations);
            
            // Save map data to storage manager
            saveMapDataToStorage(lat, lng, radius, stations);
            
            // Re-display with accurate distances
            displayStationResults(stations);
            updateStatistics(stations);

        } catch (error) {
            document.getElementById('results-list').innerHTML = `
                <div class="error">
                    <i class="fas fa-exclamation-circle text-2xl mb-2"></i>
                    <p>Error searching for stations</p>
                </div>
            `;
        } finally {
            // Hide enhanced loading overlay
            hideLoading();
        }
    }

// Display station results
function displayStationResults(stations) {
    currentStations = stations;
    filteredStations = stations;

    if (stations.length === 0) {
        document.getElementById('results-list').innerHTML = `
            <div class="error">
                <i class="fas fa-exclamation-circle text-2xl mb-2"></i>
                <p>No fuel stations found</p>
            </div>
        `;
        return;
    }

    renderStationList(stations);
    addStationMarkers(stations);
}

// Render station list (updated)
function renderStationList(stations) {
    const searchLat = parseFloat(document.getElementById('latitude').value);
    const searchLng = parseFloat(document.getElementById('longitude').value);

    const html = stations.map(station => `
        <div class="station-card bg-gray-700 border border-gray-600 rounded-lg p-4">
            <div class="flex justify-between items-start mb-3">
                <div class="flex items-center">
                    <img src="${APP_CONFIG.BRAND_LOGOS[station.brand]}" alt="${station.brand}" class="w-8 h-8 object-contain mr-3 rounded-full bg-white p-1" />
                    <h4 class="text-lg font-bold text-white">${station.name}</h4>
                </div>
                <span class="px-3 py-1 rounded-full text-xs font-bold ${getBrandBadgeColor(station.brand)}">
                    ${station.brand}
                </span>
            </div>
            
            <div class="flex items-center text-gray-300 mb-2">
                <i class="fas fa-route mr-2 text-green-400"></i>
                <span>${station.distance.toFixed(2)} km</span>
                ${station.travelTime ? `
                    <span class="ml-2 text-xs text-blue-400">
                        (~${Math.round(station.travelTime/60)} min)
                    </span>
                ` : ''}
                ${station.distanceSource ? `
                    <span class="ml-2 text-xs px-2 py-1 rounded ${getDistanceSourceBadge(station.distanceSource)}">
                        ${station.distanceSource.includes('OpenRouteService') ? 'ORS' : 
                          station.distanceSource.includes('GraphHopper') ? 'GH' : 
                          station.distanceSource.includes('Estimated') ? 'EST' : 'ROAD'}
                    </span>
                ` : ''}
                <div class="flex items-center ml-4">
                    ${generateStarRating(station.rating)}
                    <span class="ml-1 text-sm">${station.rating.toFixed(1)}/5</span>
                </div>
            </div>

            <div class="flex items-center text-gray-300 mb-2">
                <i class="fas fa-map-signs mr-2 text-blue-400"></i>
                <span class="text-sm">${station.address}</span>
            </div>

            ${station.phone !== 'N/A' ? `
            <div class="flex items-center text-gray-300 mb-2">
                <i class="fas fa-phone mr-2 text-purple-400"></i>
                <span class="text-sm">${station.phone}</span>
            </div>
            ` : ''}
            
            <div class="flex items-center text-gray-300 mb-3">
                <i class="fas fa-rupee-sign mr-2 text-yellow-400"></i>
                <span>Rs. ${station.price}/L</span>
            </div>
            
            <div class="flex gap-2 flex-wrap mb-3">
                ${station.services ? station.services.map(service => `
                    <span class="px-2 py-1 bg-gray-600 text-gray-200 text-xs rounded">${service}</span>
                `).join('') : ''}
            </div>

            <button onclick="getDirections(${station.lat}, ${station.lng})" 
                    class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-all duration-300 flex items-center justify-center">
                <i class="fas fa-directions mr-2"></i>
                Get Directions (${station.distance.toFixed(2)} km)
            </button>
        </div>
    `).join('');

    document.getElementById('results-list').innerHTML = html;
}

// Get distance source badge styling
function getDistanceSourceBadge(source) {
    if (source.includes('OpenRouteService')) {
        return 'bg-green-600 text-white';
    } else if (source.includes('GraphHopper')) {
        return 'bg-blue-600 text-white';
    } else if (source.includes('Estimated')) {
        return 'bg-yellow-600 text-white';
    }
    return 'bg-gray-600 text-white';
}

// Get brand badge color
function getBrandBadgeColor(brand) {
    const colors = {
        'PSO': 'bg-green-600 text-white',
        'Shell': 'bg-yellow-500 text-black',
        'Total': 'bg-red-600 text-white',
        'Attock': 'bg-orange-600 text-white',
        'Hascol': 'bg-blue-600 text-white',
        'Caltex': 'bg-purple-600 text-white',
        'Byco': 'bg-pink-600 text-white'
    };
    return colors[brand] || 'bg-gray-600 text-white';
}

// Get directions function
function getDirections(stationLat, stationLng) {
    const searchLat = parseFloat(document.getElementById('latitude').value);
    const searchLng = parseFloat(document.getElementById('longitude').value);

    if (isNaN(searchLat) || isNaN(searchLng)) {
        alert('Please set search coordinates first');
        return;
    }

    // Open Google Maps with directions
    const url = `https://www.google.com/maps/dir/${searchLat},${searchLng}/${stationLat},${stationLng}`;
    window.open(url, '_blank');
}

// Generate star rating
function generateStarRating(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        stars += `<i class="fas fa-star ${i <= rating ? 'text-yellow-400' : 'text-gray-600'}"></i>`;
    }
    return stars;
}

// Add station markers to map (with straight lines + accurate distances)
function addStationMarkers(stations) {
    const searchLat = parseFloat(document.getElementById('latitude').value);
    const searchLng = parseFloat(document.getElementById('longitude').value);

    stations.forEach(station => {
        // Create marker with brand logo
        const logoUrl = APP_CONFIG.BRAND_LOGOS[station.brand];

        const marker = L.marker([station.lat, station.lng], {
            icon: L.divIcon({
                html: `
                    <div class="w-10 h-10 bg-white rounded-full border-2 border-gray-300 shadow-lg flex items-center justify-center overflow-hidden transform transition-transform hover:scale-110">
                        <img src="${logoUrl}" alt="${station.brand}" class="w-8 h-8 object-contain rounded-full" />
                    </div>
                `,
                className: 'custom-marker',
                iconSize: [40, 40],
                iconAnchor: [20, 20]
            })
        }).addTo(map);

        // Add straight connection line (visual)
        const isPSO = station.brand === 'PSO';
        addConnectionLine(searchLat, searchLng, station, isPSO);

        // Enhanced popup with routing data
        marker.bindPopup(`
            <div class="min-w-64 p-3 text-gray-800">
                <div class="flex items-center mb-2">
                    <img src="${logoUrl}" alt="${station.brand}" class="w-6 h-6 object-contain mr-2 rounded-full" />
                    <h4 class="text-lg font-bold ${isPSO ? 'text-green-600' : 'text-blue-600'}">${station.name}</h4>
                </div>
                <p class="text-gray-600 text-sm mb-2">${station.address}</p>
                <div class="space-y-2 text-sm">
                    <div class="flex items-center">
                        <i class="fas fa-route text-green-500 mr-2"></i>
                        <span class="font-semibold">${station.distance.toFixed(2)} km by road</span>
                        ${station.travelTime ? `
                            <span class="ml-2 text-blue-600">(~${Math.round(station.travelTime/60)}min)</span>
                        ` : ''}
                    </div>
                    <div class="flex items-center">
                        <i class="fas fa-rupee-sign text-blue-500 mr-2"></i>
                        <span class="font-semibold">Rs. ${station.price}/L</span>
                    </div>
                    ${station.phone !== 'N/A' ? `
                    <div class="flex items-center">
                        <i class="fas fa-phone text-gray-500 mr-2"></i>
                        <span>${station.phone}</span>
                    </div>
                    ` : ''}
                    <div class="flex items-center">
                        ${generateStarRating(station.rating)}
                        <span class="ml-2">${station.rating.toFixed(1)}/5</span>
                    </div>
                    ${station.distanceSource ? `
                    <div class="text-xs text-gray-500 mt-2">
                        📊 Distance via: ${station.distanceSource}
                    </div>
                    ` : ''}
                </div>
                <button onclick="getDirections(${station.lat}, ${station.lng})" class="w-full mt-2 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded text-sm font-medium transition-colors">
                    <i class="fas fa-directions mr-2"></i>Get Directions
                </button>
            </div>
        `);

        // Add accurate distance label
        addAccurateDistanceLabel(searchLat, searchLng, station);
    });

    // Fit map to show all stations
    if (stations.length > 0) {
        const group = new L.featureGroup(stations.map(station => L.marker([station.lat, station.lng])));
        map.fitBounds(group.getBounds().pad(0.1));
    }
}

// Add connection line (straight line for visual)
function addConnectionLine(searchLat, searchLng, station, isPSO) {
    if (!showLines) return;
    
    const latlngs = [[searchLat, searchLng], [station.lat, station.lng]];

    const line = L.polyline(latlngs, {
        color: isPSO ? '#10b981' : '#ef4444',
        weight: 3,
        opacity: 0.8,
        className: isPSO ? 'glow-line-green' : 'glow-line-red'
    });

    // Initialize connection lines group if it doesn't exist
    if (!connectionLinesGroup) {
        connectionLinesGroup = L.layerGroup().addTo(map);
    }
    
    connectionLinesGroup.addLayer(line);
}

// Add accurate distance label (shows routing service calculated distance)
function addAccurateDistanceLabel(searchLat, searchLng, station) {
    if (!showDistances) return;
    
    const midLat = (searchLat + station.lat) / 2;
    const midLng = (searchLng + station.lng) / 2;

    const distanceLabel = L.marker([midLat, midLng], {
        icon: L.divIcon({
            className: 'accurate-distance-label',
            html: `
                <div class="bg-gray-900/90 backdrop-blur-sm px-2 py-1 rounded-lg shadow-lg border border-gray-600 text-center text-white">
                    <div class="font-semibold text-xs">${station.distance.toFixed(1)}km</div>
                </div>
            `,
            iconSize: [50, 35],
            iconAnchor: [25, 17]
        }),
        interactive: false
    });
    
    // Initialize distance labels group if it doesn't exist
    if (!distanceLabelsGroup) {
        distanceLabelsGroup = L.layerGroup().addTo(map);
    }
    
    distanceLabelsGroup.addLayer(distanceLabel);
}

        // Get brand color for markers
        function getBrandColor(brand) {
            const colors = {
                'PSO': 'bg-green-500',
                'Shell': 'bg-yellow-500',
                'Total': 'bg-red-500',
                'Attock': 'bg-orange-500',
                'Hascol': 'bg-blue-500',
                'Caltex': 'bg-purple-500',
                'Byco': 'bg-pink-500',
                'Unknown': 'bg-gray-500'
            };
            return colors[brand] || 'bg-gray-500';
        }

        // Add connection line between search point and station
        function addConnectionLine(searchLat, searchLng, station, isPSO) {
            if (!showLines) return;
            
            const latlngs = [[searchLat, searchLng], [station.lat, station.lng]];

            const line = isPSO ? 
                // Green solid line for PSO stations
                L.polyline(latlngs, {
                    color: '#10b981',
                    weight: 4,
                    opacity: 0.9,
                    dashArray: null,
                    className: 'glow-line-green'
                }) :
                // Red dashed line for competitors
                L.polyline(latlngs, {
                    color: '#ef4444',
                    weight: 3,
                    opacity: 0.8,
                    dashArray: '10, 10',
                    className: 'glow-line-red'
                });

            // Initialize connection lines group if it doesn't exist
            if (!connectionLinesGroup) {
                connectionLinesGroup = L.layerGroup().addTo(map);
            }
            
            connectionLinesGroup.addLayer(line);
        }

        // Add distance label on the line
        function addDistanceLabel(searchLat, searchLng, station) {
            const midLat = (searchLat + station.lat) / 2;
            const midLng = (searchLng + station.lng) / 2;

            const distanceLabel = L.marker([midLat, midLng], {
                icon: L.divIcon({
                    className: 'distance-label',
                    html: `<span class="inline-block whitespace-nowrap text-xs font-semibold text-white bg-gray-900/90 backdrop-blur-sm px-2 py-1 rounded-lg shadow-md border border-gray-600">${station.distance.toFixed(1)}km</span>`,
                    iconSize: [45, 25],
                    iconAnchor: [22, 12]
                }),
                interactive: false
            }).addTo(map);
        }

        // Update statistics
        function updateStatistics(stations) {
            const psoCount = stations.filter(s => s.brand === 'PSO').length;
            const competitorCount = stations.length - psoCount;
            const coverage = stations.length > 0 ? Math.round((psoCount / stations.length) * 100) : 0;

            document.getElementById('pso-count').textContent = psoCount;
            document.getElementById('competitor-count').textContent = competitorCount;
            document.getElementById('total-count').textContent = stations.length;
            document.getElementById('coverage-percent').textContent = coverage + '%';
        }

        // Filter stations
        function filterStations(type) {
            // Update active filter button
            document.querySelectorAll('[id^="filter-"]').forEach(btn => {
                btn.classList.remove('bg-yellow-600', 'text-white');
                btn.classList.add('text-gray-300');
            });
            document.getElementById(`filter-${type}`).classList.add('bg-yellow-600', 'text-white');
            document.getElementById(`filter-${type}`).classList.remove('text-gray-300');

            // Filter stations
            let filtered = currentStations;
            if (type === 'pso') {
                filtered = currentStations.filter(s => s.brand === 'PSO');
            } else if (type === 'competitors') {
                filtered = currentStations.filter(s => s.brand !== 'PSO');
            }

            renderStationList(filtered);
        }

        // Clear map markers
        function clearMap() {
            map.eachLayer(layer => {
                if (layer instanceof L.Marker || layer instanceof L.Circle || layer instanceof L.Polyline) {
                    map.removeLayer(layer);
                }
            });
            
            // Clear and remove distance labels group
            if (distanceLabelsGroup) {
                distanceLabelsGroup.clearLayers();
                map.removeLayer(distanceLabelsGroup);
                distanceLabelsGroup = null;
            }
            
            // Clear and remove connection lines group
            if (connectionLinesGroup) {
                connectionLinesGroup.clearLayers();
                map.removeLayer(connectionLinesGroup);
                connectionLinesGroup = null;
            }
        }

        // Toggle distance labels visibility
        function toggleDistances() {
            showDistances = !showDistances;
            const toggleBtn = document.getElementById('distance-toggle-btn');
            const toggleText = document.getElementById('distance-toggle-text');
            
            if (showDistances) {
                // Show distances - redraw all station markers with distances
                if (currentStations && currentStations.length > 0) {
                    // Clear existing distance labels
                    if (distanceLabelsGroup) {
                        distanceLabelsGroup.clearLayers();
                    }
                    
                    // Redraw distance labels
                    const searchLat = parseFloat(document.getElementById('latitude').value);
                    const searchLng = parseFloat(document.getElementById('longitude').value);
                    
                    if (!isNaN(searchLat) && !isNaN(searchLng)) {
                        currentStations.forEach(station => {
                            addAccurateDistanceLabel(searchLat, searchLng, station);
                        });
                    }
                }
                
                if (toggleText) {
                    toggleText.textContent = 'Hide Distances';
                }
            } else {
                // Hide distances
                if (distanceLabelsGroup) {
                    distanceLabelsGroup.clearLayers();
                }
                
                if (toggleText) {
                    toggleText.textContent = 'Show Distances';
                }
            }
        }

        // Toggle connection lines visibility
        function toggleLines() {
            showLines = !showLines;
            const toggleBtn = document.getElementById('lines-toggle-btn');
            const toggleText = document.getElementById('lines-toggle-text');
            
            if (showLines) {
                // Show lines - redraw all connection lines
                if (currentStations && currentStations.length > 0) {
                    // Clear existing lines
                    if (connectionLinesGroup) {
                        connectionLinesGroup.clearLayers();
                    }
                    
                    // Redraw connection lines
                    const searchLat = parseFloat(document.getElementById('latitude').value);
                    const searchLng = parseFloat(document.getElementById('longitude').value);
                    
                    if (!isNaN(searchLat) && !isNaN(searchLng)) {
                        currentStations.forEach(station => {
                            const isPSO = station.brand === 'PSO';
                            addConnectionLine(searchLat, searchLng, station, isPSO);
                        });
                    }
                }
                
                if (toggleText) {
                    toggleText.textContent = 'Hide Lines';
                }
            } else {
                // Hide lines
                if (connectionLinesGroup) {
                    connectionLinesGroup.clearLayers();
                }
                
                if (toggleText) {
                    toggleText.textContent = 'Show Lines';
                }
            }
        }

        // Toggle fullscreen mode
        function toggleFullscreen() {
            const mapContainer = document.getElementById('map');
            const mapCard = mapContainer.closest('div[class*="bg-gray-800"]') || mapContainer.parentElement;

            if (!mapCard) {
                console.error('Could not find map container');
                return;
            }

            if (mapCard.classList.contains('fullscreen')) {
                // Exit fullscreen
                mapCard.classList.remove('fullscreen');
                mapCard.style.position = '';
                mapCard.style.top = '';
                mapCard.style.left = '';
                mapCard.style.width = '';
                mapCard.style.height = '';
                mapCard.style.zIndex = '';
                mapContainer.style.height = '500px';

                // Change button text back
                const btn = event?.target?.closest('button');
                if (btn) {
                    btn.innerHTML = '<i class="fas fa-expand mr-2"></i>Fullscreen';
                }
            } else {
                // Enter fullscreen
                mapCard.classList.add('fullscreen');
                mapCard.style.position = 'fixed';
                mapCard.style.top = '0';
                mapCard.style.left = '0';
                mapCard.style.width = '100vw';
                mapCard.style.height = '100vh';
                mapCard.style.zIndex = '9999';
                mapContainer.style.height = 'calc(100vh - 120px)';

                // Change button text
                const btn = event?.target?.closest('button');
                if (btn) {
                    btn.innerHTML = '<i class="fas fa-compress mr-2"></i>Exit Fullscreen';
                }
            }

            // Refresh map size
            setTimeout(() => {
                if (map && map.invalidateSize) {
                    map.invalidateSize();
                }
            }, 100);
        }

        // Export map as ultra-clean high-quality image - BEST APPROACH
        function exportMap(buttonElement) {
            try {
                // Get the button that triggered the export
                const exportBtn = buttonElement || document.querySelector('[onclick*="exportMap"]');
                if (!exportBtn) {
                    console.error('Export button not found');
                    alert('Export failed. Please try again.');
                    return;
                }

                const originalText = exportBtn.innerHTML;
                exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Preparing Clean Export...';
                exportBtn.disabled = true;

                // Check if map is initialized
                if (!map) {
                    console.error('Map not initialized');
                    alert('Map not ready. Please wait for the map to load.');
                    exportBtn.innerHTML = originalText;
                    exportBtn.disabled = false;
                    return;
                }

                console.log('🚀 Starting ultra-clean map export...');

                // Safety timeout for the entire export process
                const exportTimeout = setTimeout(() => {
                    console.error('⚠️ Export process timeout - forcing cleanup');
                    exportBtn.innerHTML = originalText;
                    exportBtn.disabled = false;
                    showExportErrorPopup('Export timed out. Please try again with a smaller map area.');
                }, 30000); // 30 second timeout

                // Use the most efficient clean export approach
                performUltraCleanExport();

                function performUltraCleanExport() {
                    // Clear the timeout since we're proceeding
                    clearTimeout(exportTimeout);
                    const mapElement = document.getElementById('map');
                    
                    exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Preparing Direct Capture...';

                    console.log('🔄 Using direct capture approach (no layer switching)...');

                    // Direct capture approach - don't switch layers, just capture what's currently visible
                    setTimeout(() => {
                        console.log('✅ Proceeding with direct capture of current map');
                        performActualCleanCapture();
                    }, 1000); // Short wait to ensure map is stable

                    function performActualCleanCapture() {
                        exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Capturing Ultra-Clean Image...';

                        // Hide ALL UI elements except fuel station markers
                        const elementsToHide = [
                            '.leaflet-control-container',
                            '.leaflet-control-zoom',
                            '.leaflet-control-attribution', 
                            '.leaflet-control-layers',
                            '.leaflet-popup',
                            '.leaflet-tooltip'
                        ];
                        
                        const hiddenElements = [];
                        elementsToHide.forEach(selector => {
                            const elements = document.querySelectorAll(selector);
                            elements.forEach(el => {
                                hiddenElements.push({element: el, originalDisplay: el.style.display});
                                el.style.display = 'none';
                            });
                        });

                        // Force map refresh
                        map.invalidateSize();

                        // Reduced wait time for faster export
                        setTimeout(() => {
                            attemptBestQualityCapture();
                        }, 500); // Reduced from 1500ms to 500ms

                        function attemptBestQualityCapture() {
                            const scale = 4; // Reduced scale from 8 to 4 for better compatibility and faster processing
                            const rect = mapElement.getBoundingClientRect();
                            
                            console.log(`📸 Capturing at ${scale}x quality: ${rect.width * scale}x${rect.height * scale}px`);

                            // Get current map bounds to ensure we capture the exact visible radius
                            const bounds = map.getBounds();
                            const center = map.getCenter();
                            const zoom = map.getZoom();
                            
                            console.log(`🎯 Map bounds: ${bounds.toBBoxString()}, Center: ${center.lat.toFixed(6)}, ${center.lng.toFixed(6)}, Zoom: ${zoom}`);

                            // Capture the map as-is without zoom changes for reliability
                            console.log('� Capturing current map view directly...');
                            
                            // Method 1: Try html2canvas with simplified settings for better reliability
                            html2canvas(mapElement, {
                                useCORS: true,
                                allowTaint: false,
                                backgroundColor: '#ffffff',
                                scale: scale,
                                width: rect.width,
                                height: rect.height,
                                scrollX: 0,
                                scrollY: 0,
                                logging: true, // Enable logging to debug issues
                                imageTimeout: 15000, // Reduced timeout
                                removeContainer: false,
                                foreignObjectRendering: false, // Disabled for compatibility
                                letterRendering: true,
                                onclone: function(clonedDoc) {
                                    console.log('🎨 Enhancing cloned map for high quality...');
                                    
                                    // Ensure perfect rendering in clone
                                    const clonedMap = clonedDoc.getElementById('map');
                                    if (clonedMap) {
                                        clonedMap.style.background = '#f8f9fa';
                                        clonedMap.style.position = 'relative';
                                        clonedMap.style.width = rect.width + 'px';
                                        clonedMap.style.height = rect.height + 'px';
                                    }
                                    
                                    // Enhance tile visibility
                                    const tiles = clonedDoc.querySelectorAll('.leaflet-tile');
                                    tiles.forEach(tile => {
                                        tile.style.opacity = '1';
                                        tile.style.visibility = 'visible';
                                        if (tile.complete && tile.naturalHeight !== 0) {
                                            console.log('✅ Tile loaded:', tile.src.substring(0, 50) + '...');
                                        }
                                    });

                                    // Ensure fuel station markers are visible
                                    const markers = clonedDoc.querySelectorAll('.custom-marker, .custom-search-marker');
                                    markers.forEach(marker => {
                                        marker.style.zIndex = '3000';
                                        marker.style.visibility = 'visible';
                                    });

                                    // Ensure distance labels are visible
                                    const distanceLabels = clonedDoc.querySelectorAll('.distance-label, .accurate-distance-label');
                                    distanceLabels.forEach(label => {
                                        label.style.visibility = 'visible';
                                        label.style.zIndex = '2000';
                                    });

                                    // Ensure connection lines are visible
                                    const lines = clonedDoc.querySelectorAll('.leaflet-interactive');
                                    lines.forEach(line => {
                                        line.style.visibility = 'visible';
                                    });
                                },
                                ignoreElements: function(element) {
                                    return element.classList && (
                                        element.classList.contains('leaflet-control-zoom') ||
                                        element.classList.contains('leaflet-control-attribution') ||
                                        element.classList.contains('leaflet-popup') ||
                                        element.classList.contains('leaflet-tooltip') ||
                                        element.classList.contains('leaflet-control-layers')
                                    );
                                }
                            }).then(canvas => {
                                console.log('✅ High quality capture successful!');
                                
                                // Check if canvas is empty (all white)
                                const ctx = canvas.getContext('2d');
                                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                                const pixels = imageData.data;
                                let isBlank = true;
                                
                                // Check if image has content (not all white)
                                for (let i = 0; i < pixels.length; i += 4) {
                                    if (pixels[i] !== 255 || pixels[i + 1] !== 255 || pixels[i + 2] !== 255) {
                                        isBlank = false;
                                        break;
                                    }
                                }
                                
                                if (isBlank) {
                                    console.error('❌ Captured image is blank (all white)');
                                    restoreOriginalMap();
                                    showExportErrorPopup('Captured image is blank. This may be due to tile loading issues. Please wait for the map to fully load and try again.');
                                    return;
                                }
                                
                                // Create high-quality PNG
                                const dataUrl = canvas.toDataURL('image/png', 1.0);
                                
                                console.log(`📊 Image captured successfully: ${canvas.width}x${canvas.height}px`);
                                
                                // Download the high quality image
                                const link = document.createElement('a');
                                const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
                                const currentZoomLevel = map.getZoom();
                                const radiusKm = document.getElementById('radius')?.value || '5';
                                
                                link.download = `fuel-stations-${scale}K-radius-${radiusKm}km-z${currentZoomLevel}-${timestamp}.png`;
                                link.href = dataUrl;
                                
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                
                                // Restore everything
                                restoreOriginalMap();
                                
                                // Calculate file size
                                const fileSizeMB = Math.round(dataUrl.length * 0.75 / 1024 / 1024 * 100) / 100;
                                const qualityDesc = scale === 4 ? '4K High' : `${scale}x High`;
                                
                                // Show success popup
                                showExportSuccessPopup({
                                    resolution: `${canvas.width}×${canvas.height}px (${qualityDesc} Quality)`,
                                    fileSize: `${fileSizeMB}MB (PNG)`,
                                    style: 'Current Map View - Exact Copy',
                                    quality: `${qualityDesc} (${scale}x) - High Quality & Zoomable`
                                });
                                
                                console.log('🎉 High quality export completed successfully!');
                                
                            }).catch(error => {
                                console.error('❌ High quality capture failed:', error);
                                restoreOriginalMap();
                                showExportErrorPopup('High quality capture failed: ' + error.message + '. Try refreshing the page and ensuring the map is fully loaded.');
                            });
                        }

                        function restoreOriginalMap() {
                            try {
                                // Restore hidden elements
                                hiddenElements.forEach(item => {
                                    item.element.style.display = item.originalDisplay;
                                });
                                
                                // Reset button
                                exportBtn.innerHTML = originalText;
                                exportBtn.disabled = false;
                                
                                console.log('🔄 Map interface restored to original state');
                                
                            } catch (restoreError) {
                                console.error('❌ Error restoring map:', restoreError);
                                exportBtn.innerHTML = originalText;
                                exportBtn.disabled = false;
                            }
                        }
                    }
                }

            } catch (error) {
                console.error('❌ Export error:', error);
                showExportErrorPopup('Export failed. Please try again.');
                const exportBtn = buttonElement || document.querySelector('[onclick*="exportMap"]');
                if (exportBtn) {
                    exportBtn.innerHTML = '<i class="fas fa-download mr-2"></i>Export Map';
                    exportBtn.disabled = false;
                }
            }
        }

        // Ultra-modern success popup for export completion
        function showExportSuccessPopup(details) {
            // Remove any existing popups
            const existingPopup = document.querySelector('.export-success-popup');
            if (existingPopup) {
                existingPopup.remove();
            }

            const popup = document.createElement('div');
            popup.className = 'export-success-popup';
            popup.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: linear-gradient(135deg, #10b981, #059669);
                color: white;
                padding: 30px;
                border-radius: 16px;
                box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
                z-index: 50000;
                min-width: 400px;
                text-align: center;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                animation: popupSlideIn 0.5s ease-out;
            `;
            
            popup.innerHTML = `
                <div style="margin-bottom: 20px;">
                    <i class="fas fa-check-circle" style="font-size: 48px; color: #ffffff; margin-bottom: 15px;"></i>
                    <h3 style="margin: 0 0 10px 0; font-size: 24px; font-weight: 600;">🎯 Ultra-High Quality Export Complete!</h3>
                    <p style="margin: 0; opacity: 0.9; font-size: 16px;">Crystal-clear zoomable map image downloaded</p>
                </div>
                
                <div style="background: rgba(255, 255, 255, 0.1); padding: 20px; border-radius: 12px; margin-bottom: 20px; text-align: left;">
                    <div style="display: grid; grid-template-columns: auto 1fr; gap: 10px; font-size: 14px;">
                        <span style="font-weight: 600; opacity: 0.9;">� Resolution:</span>
                        <span style="font-family: monospace; color: #fef3c7;">${details.resolution}</span>
                        
                        <span style="font-weight: 600; opacity: 0.9;">💾 File Size:</span>
                        <span style="font-family: monospace; color: #fef3c7;">${details.fileSize}</span>
                        
                        <span style="font-weight: 600; opacity: 0.9;">🎨 Style:</span>
                        <span style="color: #fef3c7;">${details.style}</span>
                        
                        <span style="font-weight: 600; opacity: 0.9;">✨ Quality:</span>
                        <span style="color: #a7f3d0; font-weight: 600;">${details.quality}</span>
                        
                        <span style="font-weight: 600; opacity: 0.9;">🎯 Features:</span>
                        <span style="color: #fef3c7; font-size: 13px;">Pixel-perfect • Zoomable • Print-ready</span>
                    </div>
                </div>
                
                <div style="background: rgba(16, 185, 129, 0.3); padding: 15px; border-radius: 10px; margin-bottom: 20px; border-left: 4px solid #10b981;">
                    <p style="margin: 0; font-size: 13px; opacity: 0.95; line-height: 1.4;">
                        <i class="fas fa-info-circle mr-1"></i>
                        <strong>Pro Tip:</strong> This ultra-high resolution image can be zoomed extensively without losing quality. Perfect for detailed analysis and presentations!
                    </p>
                </div>
                
                <button onclick="this.parentElement.remove()" 
                        style="background: rgba(255, 255, 255, 0.2); 
                               color: white; 
                               border: none; 
                               padding: 12px 24px; 
                               border-radius: 8px; 
                               cursor: pointer; 
                               font-size: 16px; 
                               font-weight: 500;
                               transition: all 0.3s ease;
                               backdrop-filter: blur(5px);"
                        onmouseover="this.style.background='rgba(255, 255, 255, 0.3)'"
                        onmouseout="this.style.background='rgba(255, 255, 255, 0.2)'">
                    <i class="fas fa-times mr-2"></i>Awesome!
                </button>
            `;

            // Add animation keyframes if not already added
            if (!document.querySelector('#popup-animations')) {
                const style = document.createElement('style');
                style.id = 'popup-animations';
                style.textContent = `
                    @keyframes popupSlideIn {
                        from {
                            opacity: 0;
                            transform: translate(-50%, -60%);
                            scale: 0.9;
                        }
                        to {
                            opacity: 1;
                            transform: translate(-50%, -50%);
                            scale: 1;
                        }
                    }
                `;
                document.head.appendChild(style);
            }

            document.body.appendChild(popup);

            // Auto close after 8 seconds
            setTimeout(() => {
                if (popup.parentElement) {
                    popup.style.animation = 'popupSlideIn 0.3s ease-in reverse';
                    setTimeout(() => popup.remove(), 300);
                }
            }, 8000);
        }

        // Ultra-modern error popup for export failures
        function showExportErrorPopup(message) {
            // Remove any existing popups
            const existingPopup = document.querySelector('.export-error-popup');
            if (existingPopup) {
                existingPopup.remove();
            }

            const popup = document.createElement('div');
            popup.className = 'export-error-popup';
            popup.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: linear-gradient(135deg, #ef4444, #dc2626);
                color: white;
                padding: 30px;
                border-radius: 16px;
                box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
                z-index: 50000;
                min-width: 400px;
                max-width: 500px;
                text-align: center;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                animation: popupSlideIn 0.5s ease-out;
            `;
            
            popup.innerHTML = `
                <div style="margin-bottom: 20px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #ffffff; margin-bottom: 15px;"></i>
                    <h3 style="margin: 0 0 10px 0; font-size: 24px; font-weight: 600;">Export Failed</h3>
                    <p style="margin: 0; opacity: 0.9; font-size: 16px; line-height: 1.5;">${message}</p>
                </div>
                
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button onclick="this.closest('.export-error-popup').remove()" 
                            style="background: rgba(255, 255, 255, 0.2); 
                                   color: white; 
                                   border: none; 
                                   padding: 12px 24px; 
                                   border-radius: 8px; 
                                   cursor: pointer; 
                                   font-size: 16px; 
                                   font-weight: 500;
                                   transition: all 0.3s ease;
                                   backdrop-filter: blur(5px);"
                            onmouseover="this.style.background='rgba(255, 255, 255, 0.3)'"
                            onmouseout="this.style.background='rgba(255, 255, 255, 0.2)'">
                        <i class="fas fa-times mr-2"></i>Close
                    </button>
                    
                    <button onclick="exportMap(); this.closest('.export-error-popup').remove();" 
                            style="background: rgba(255, 255, 255, 0.9); 
                                   color: #dc2626; 
                                   border: none; 
                                   padding: 12px 24px; 
                                   border-radius: 8px; 
                                   cursor: pointer; 
                                   font-size: 16px; 
                                   font-weight: 600;
                                   transition: all 0.3s ease;"
                            onmouseover="this.style.background='rgba(255, 255, 255, 1)'"
                            onmouseout="this.style.background='rgba(255, 255, 255, 0.9)'">
                        <i class="fas fa-redo mr-2"></i>Try Again
                    </button>
                </div>
            `;

            document.body.appendChild(popup);

            // Auto close after 10 seconds
            setTimeout(() => {
                if (popup.parentElement) {
                    popup.style.animation = 'popupSlideIn 0.3s ease-in reverse';
                    setTimeout(() => popup.remove(), 300);
                }
            }, 10000);
        }

        // Create high DPI canvas for crisp images
        function createHighDPICanvas(width, height, scale) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Set actual canvas size
            canvas.width = width;
            canvas.height = height;
            
            // Scale the canvas for high DPI displays
            canvas.style.width = (width / scale) + 'px';
            canvas.style.height = (height / scale) + 'px';
            
            // Scale the drawing context for crisp rendering
            ctx.scale(scale, scale);
            
            return canvas;
        }

        // Close export popup
        function closeExportPopup() {
            const popup = document.getElementById('export-popup');
            if (popup) {
                const popupContent = popup.querySelector('div > div');
                popupContent.classList.add('scale-95', 'opacity-0');
                popupContent.classList.remove('scale-100', 'opacity-100');
                
                setTimeout(() => {
                    popup.remove();
                }, 300);
            }
        }

        // Make closeExportPopup globally accessible
        window.closeExportPopup = closeExportPopup;

        // Export stations data as Excel
        function exportExcel() {
            try {
                // Use filtered stations instead of all current stations
                const stationsToExport = filteredStations && filteredStations.length > 0 ? filteredStations : currentStations;
                
                if (!stationsToExport || stationsToExport.length === 0) {
                    alert('No station data available to export. Please search for stations first.');
                    return;
                }

                const exportBtn = event.target.closest('button');
                const originalText = exportBtn.innerHTML;
                exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Exporting...';
                exportBtn.disabled = true;

                // Get search coordinates for reference
                const searchLat = parseFloat(document.getElementById('latitude').value);
                const searchLng = parseFloat(document.getElementById('longitude').value);

                // Prepare data for export with requested fields
                const exportData = stationsToExport.map((station, index) => ({
                    'S.No': index + 1,
                    'Station Name': station.name,
                    'Brand': station.brand,
                    'Latitude': station.lat.toFixed(6),
                    'Longitude': station.lng.toFixed(6),
                    'Distance from Pinpoint (km)': station.distance.toFixed(2),
                    'Travel Time (minutes)': station.travelTime ? Math.round(station.travelTime/60) : 'N/A',
                    'Distance Source': station.distanceSource || 'Direct distance',
                    'Contact/Phone': station.phone || 'N/A',
                    'Address/Location': station.address || 'N/A',
                    'Road/Area': station.address ? station.address.split(',')[0] : 'N/A',
                    'Rating': station.rating ? station.rating.toFixed(1) : 'N/A',
                    'Price (Rs/L)': station.price || 'N/A',
                    'Services': station.services ? station.services.join(', ') : 'N/A',
                    'Search Point Lat': searchLat.toFixed(6),
                    'Search Point Lng': searchLng.toFixed(6)
                }));

                // Create Excel workbook using SheetJS (XLSX)
                // If SheetJS is not loaded, fallback to CSV with .xlsx extension
                if (typeof XLSX !== 'undefined') {
                    // Use SheetJS to create proper Excel file
                    const ws = XLSX.utils.json_to_sheet(exportData);
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, "Fuel Stations");
                    
                    // Get active filter for filename
                    const activeFilter = document.querySelector('[id^="filter-"].bg-yellow-600');
                    const filterType = activeFilter ? activeFilter.id.replace('filter-', '') : 'all';
                    
                    const filename = `fuel-stations-${filterType}-${new Date().toISOString().split('T')[0]}.xlsx`;
                    XLSX.writeFile(wb, filename);
                } else {
                    // Fallback to CSV with enhanced format
                    console.log('XLSX library not found, using enhanced CSV format');
                    const headers = Object.keys(exportData[0]);
                    const csvContent = [
                        headers.join(','),
                        ...exportData.map(row => 
                            headers.map(header => {
                                const value = row[header];
                                // Escape values that contain commas or quotes
                                return typeof value === 'string' && (value.includes(',') || value.includes('"')) 
                                    ? `"${value.replace(/"/g, '""')}"` 
                                    : value;
                            }).join(',')
                        )
                    ].join('\n');

                    // Create and download file
                    const blob = new Blob([csvContent], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8;' });
                    const link = document.createElement('a');
                    
                    // Get active filter for filename
                    const activeFilter = document.querySelector('[id^="filter-"].bg-yellow-600');
                    const filterType = activeFilter ? activeFilter.id.replace('filter-', '') : 'all';
                    
                    link.href = URL.createObjectURL(blob);
                    link.download = `fuel-stations-${filterType}-${new Date().toISOString().split('T')[0]}.xlsx`;
                    link.click();

                    // Clean up
                    URL.revokeObjectURL(link.href);
                }
                
                // Reset button
                setTimeout(() => {
                    exportBtn.innerHTML = originalText;
                    exportBtn.disabled = false;
                }, 1000);

                // Show success popup instead of alert
                const activeFilter = document.querySelector('[id^="filter-"].bg-yellow-600');
                const filterType = activeFilter ? activeFilter.id.replace('filter-', '') : 'all';
                showExcelExportSuccessPopup({
                    count: stationsToExport.length,
                    filterType: filterType,
                    filename: `fuel-stations-${filterType}-${new Date().toISOString().split('T')[0]}.xlsx`,
                    fileFormat: 'Microsoft Excel (.xlsx)',
                    columns: Object.keys(exportData[0]).length
                });

            } catch (error) {
                console.error('Excel export error:', error);
                showExcelExportErrorPopup('Export failed. Please try again.');
                const exportBtn = event.target.closest('button');
                if (exportBtn) {
                    exportBtn.innerHTML = '<i class="fas fa-file-excel mr-2"></i>Export Excel';
                    exportBtn.disabled = false;
                }
            }
        }

        function showExcelExportSuccessPopup(details) {
            // Remove any existing popups
            const existingPopup = document.querySelector('.excel-export-success-popup');
            if (existingPopup) {
                existingPopup.remove();
            }

            const popup = document.createElement('div');
            popup.className = 'excel-export-success-popup';
            popup.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;W
                transform: translate(-50%, -50%);
                background: #10b981;
                color: white;
                padding: 20px;
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                z-index: 50000;
                min-width: 300px;
                max-width: 350px;
                text-align: center;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                animation: popupSlideIn 0.4s ease-out;
            `;
            
            popup.innerHTML = `
                <div style="margin-bottom: 15px;">
                    <i class="fas fa-check-circle" style="font-size: 32px; color: #ffffff; margin-bottom: 10px;"></i>
                    <h3 style="margin: 0 0 5px 0; font-size: 18px; font-weight: 600;">Excel Export Successful!</h3>
                    <p style="margin: 0; opacity: 0.9; font-size: 14px;">${details.count} ${details.filterType} stations exported</p>
                </div>
                
                <button onclick="this.closest('.excel-export-success-popup').remove()" 
                        style="background: rgba(255, 255, 255, 0.2); 
                               color: white; 
                               border: none; 
                               padding: 8px 20px; 
                               border-radius: 6px; 
                               cursor: pointer; 
                               font-size: 14px; 
                               font-weight: 500;
                               transition: all 0.3s ease;"
                        onmouseover="this.style.background='rgba(255, 255, 255, 0.3)'"
                        onmouseout="this.style.background='rgba(255, 255, 255, 0.2)'">
                    <i class="fas fa-check mr-1"></i>OK
                </button>
            `;

            document.body.appendChild(popup);

            // Auto close after 3 seconds
            setTimeout(() => {
                if (popup.parentElement) {
                    popup.style.animation = 'popupSlideIn 0.3s ease-in reverse';
                    setTimeout(() => popup.remove(), 300);
                }
            }, 3000);
        }

        // Show Excel export error popup
        function showExcelExportErrorPopup(message) {
            // Remove any existing popups
            const existingPopup = document.querySelector('.excel-export-error-popup');
            if (existingPopup) {
                existingPopup.remove();
            }

            const popup = document.createElement('div');
            popup.className = 'excel-export-error-popup';
            popup.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: linear-gradient(135deg, #dc2626, #b91c1c);
                color: white;
                padding: 35px;
                border-radius: 20px;
                box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
                z-index: 50000;
                min-width: 400px;
                max-width: 450px;
                text-align: center;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                animation: popupSlideIn 0.5s ease-out;
            `;
            
            popup.innerHTML = `
                <div style="margin-bottom: 25px;">
                    <div style="background: rgba(255, 255, 255, 0.2); width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 36px; color: #ffffff;"></i>
                    </div>
                    <h3 style="margin: 0 0 10px 0; font-size: 24px; font-weight: 600;">Export Failed</h3>
                    <p style="margin: 0; opacity: 0.9; font-size: 16px; line-height: 1.5;">${message}</p>
                </div>
                
                <div style="display: flex; gap: 15px; justify-content: center;">
                    <button onclick="this.closest('.excel-export-error-popup').remove()" 
                            style="background: rgba(255, 255, 255, 0.2); 
                                   color: white; 
                                   border: none; 
                                   padding: 15px 30px; 
                                   border-radius: 10px; 
                                   cursor: pointer; 
                                   font-size: 16px; 
                                   font-weight: 500;
                                   transition: all 0.3s ease;
                                   backdrop-filter: blur(5px);"
                            onmouseover="this.style.background='rgba(255, 255, 255, 0.3)'"
                            onmouseout="this.style.background='rgba(255, 255, 255, 0.2)'">
                        <i class="fas fa-times mr-2"></i>Close
                    </button>
                    
                    <button onclick="exportExcel(); this.closest('.excel-export-error-popup').remove();" 
                            style="background: rgba(255, 255, 255, 0.9); 
                                   color: #b91c1c; 
                                   border: none; 
                                   padding: 15px 30px; 
                                   border-radius: 10px; 
                                   cursor: pointer; 
                                   font-size: 16px; 
                                   font-weight: 600;
                                   transition: all 0.3s ease;"
                            onmouseover="this.style.background='rgba(255, 255, 255, 1)'"
                            onmouseout="this.style.background='rgba(255, 255, 255, 0.9)'">
                        <i class="fas fa-redo mr-2"></i>Try Again
                    </button>
                </div>
            `;

            document.body.appendChild(popup);

            // Auto close after 8 seconds
            setTimeout(() => {
                if (popup.parentElement) {
                    popup.style.animation = 'popupSlideIn 0.3s ease-in reverse';
                    setTimeout(() => popup.remove(), 300);
                }
            }, 8000);
        }

        // Export the original searchStations function for storage manager use
        window.searchStations = searchStations;

     