      let map;
        let radiusCircle;
        let focusModeButton;
        let currentStations = [];
        let filteredStations = [];

        // Initialize map
        function initMap() {
            map = L.map('map').setView([25.3730, 68.3512], 12);
            
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

            if (isNaN(lat) || isNaN(lng) || isNaN(radius) || radius <= 0) {
                alert('Please enter valid coordinates and radius');
                return;
            }

            const searchBtn = document.getElementById('searchBtn');
            searchBtn.disabled = true;
            searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Searching...';

            // Show loading
            document.getElementById('results-list').innerHTML = `
                <div class="loading">
                    <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
                    <p>Searching for fuel stations...</p>
                </div>
            `;

            try {
                // Clear previous markers
                clearMap();

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
                searchBtn.disabled = false;
                searchBtn.innerHTML = '<i class="fas fa-search mr-2"></i>Search Stations';
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
        }

        // Edit mode variables
        let editMode = false;
        let editableElements = [];
        let elementIdCounter = 0;
        let activeElement = null;
        let addType = null; // 'text' or 'image'
        let editLayerGroup;

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
            
            // Create edit toolbar
            createEditToolbar();
            
            // Change cursor for map
            document.getElementById('map').style.cursor = 'crosshair';
            
            // Add click handler for adding elements
            map.on('click', handleMapClickInEditMode);
            
            // Initialize edit layer group
            if (!editLayerGroup) {
                editLayerGroup = L.layerGroup().addTo(map);
            }
            
            // Add zoom event listener for dynamic scaling
            map.on('zoomend', handleZoomChange);
            
            // Store initial zoom level
            if (typeof window.initialZoomLevel === 'undefined') {
                window.initialZoomLevel = map.getZoom();
            }
            
            // Show existing editable elements
            showEditableElements();
            
            // Update button text
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
            
            // Remove edit toolbar
            removeEditToolbar();
            
            // Reset cursor
            document.getElementById('map').style.cursor = '';
            
            // Remove click handler
            map.off('click', handleMapClickInEditMode);
            
            // Remove zoom event listener
            map.off('zoomend', handleZoomChange);
            
            // Hide edit controls on elements
            hideEditControls();
            
            // Update button text
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
            toolbar.className = 'fixed top-20 right-4 bg-gray-800 border border-gray-600 rounded-lg p-4 z-50 shadow-lg';
            toolbar.innerHTML = `
                <h3 class="text-white font-bold mb-3">🎨 Edit Tools</h3>
                <div class="space-y-2">
                    <button onclick="setAddType('text')" 
                            class="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-all duration-200">
                        <i class="fas fa-font mr-2"></i>Add Text
                    </button>
                    <button onclick="setAddType('image')" 
                            class="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-all duration-200">
                        <i class="fas fa-image mr-2"></i>Add Image
                    </button>
                    <button onclick="clearAllEditableElements()" 
                            class="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-all duration-200">
                        <i class="fas fa-trash mr-2"></i>Clear All
                    </button>
                </div>
                <div class="mt-3 pt-3 border-t border-gray-600">
                    <label class="block text-white text-xs mb-1">📁 Upload Image:</label>
                    <input type="file" id="image-upload" accept="image/*" 
                           class="w-full text-xs text-gray-300 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-gray-600 file:text-white">
                </div>
                <div class="mt-3 pt-3 border-t border-gray-600">
                    <p class="text-xs text-gray-400 mb-1">💡 Instructions:</p>
                    <ul class="text-xs text-gray-400 space-y-1">
                        <li>• Click tool, then map to add</li>
                        <li>• Drag elements to move</li>
                        <li>• Use resize handles to scale</li>
                        <li>• Elements scale with zoom level</li>
                        <li>• Click elements for options</li>
                    </ul>
                </div>
            `;
            
            document.body.appendChild(toolbar);
            
            // Handle image upload
            document.getElementById('image-upload').addEventListener('change', handleImageUpload);
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
            
            // Update button states
            document.querySelectorAll('#edit-toolbar button').forEach(btn => {
                btn.classList.remove('ring-2', 'ring-yellow-400');
            });
            
            event.target.classList.add('ring-2', 'ring-yellow-400');
        }

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
            addType = null; // Reset after adding
            
            // Remove active state from buttons
            document.querySelectorAll('#edit-toolbar button').forEach(btn => {
                btn.classList.remove('ring-2', 'ring-yellow-400');
            });
        }

        // Add text element with advanced customization
        function addTextElement(latlng) {
            const text = prompt('Enter text to add to the map:') || 'Sample Text';
            if (!text) return;
            
            // Ask for customization options
            const color = prompt('Enter background color (CSS value or hex, e.g. #FFD700):', '#FFD700') || '#FFD700';
            const shape = prompt('Shape? Enter "rounded" or "rectangle":', 'rounded') || 'rounded';
            
            // Calculate initial size based on text with proper padding
            const tempSpan = document.createElement('span');
            tempSpan.style.cssText = `
                visibility: hidden; position: absolute; 
                font-weight: 700; font-size: 16px; 
                padding: 8px 16px; font-family: inherit;
                white-space: nowrap; box-sizing: border-box;
            `;
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
                    html: `<div style="
                        background: ${color};
                        color: #003366;
                        padding: 8px 16px;
                        border-radius: ${borderRadius};
                        font-weight: 700;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.10);
                        font-size: 16px;
                        width: ${width}px;
                        height: ${height}px;
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
                    iconSize: [width, height],
                    iconAnchor: [width/2, height/2]
                })
            });
            
            // Store custom properties
            marker._customType = 'text';
            marker._customValue = text;
            marker._customColor = color;
            marker._customShape = shape;
            marker._customSize = { width: width, height: height };
            marker._baseSize = { width: width, height: height }; // Store original size for zoom scaling
            marker._elementId = elementId;
            
            marker.addTo(editLayerGroup);
            addEditableMarker(marker, 'text', text);
            makeDivIconResizable(marker, 'text');
            
            // Add to tracking array
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

        // Create image marker with customization
        function createImageMarker(latlng, src) {
            const color = prompt('Enter background color for image (CSS value or hex, e.g. #fff):', '#fff') || '#fff';
            const shape = prompt('Shape? Enter "rounded" or "rectangle":', 'rounded') || 'rounded';
            const borderRadius = shape === 'rounded' ? '8px' : '0px';
            
            const elementId = 'image-' + (++elementIdCounter);
            const marker = L.marker(latlng, {
                icon: L.divIcon({
                    className: 'custom-image-marker',
                    html: `<img src="${src}" alt="Custom" style="
                        width: 48px; height: 48px;
                        border-radius: ${borderRadius};
                        box-shadow: 0 2px 8px rgba(0,0,0,0.10);
                        background: ${color};
                        display: block;
                        user-select: none;
                    ">`,
                    iconSize: [48, 48],
                    iconAnchor: [24, 24]
                })
            });
            
            // Store custom properties
            marker._customType = 'image';
            marker._customValue = src;
            marker._customColor = color;
            marker._customShape = shape;
            marker._customSize = { width: 48, height: 48 };
            marker._baseSize = { width: 48, height: 48 }; // Store original size for zoom scaling
            marker._elementId = elementId;
            
            marker.addTo(editLayerGroup);
            addEditableMarker(marker, 'image', src);
            makeDivIconResizable(marker, 'image');
            
            // Add to tracking array
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
            marker.on('click', function(e) {
                let popupContent = '';
                if (type === 'text') {
                    popupContent = `
                        <button onclick="window._editCustomMarker(${marker._leaflet_id},'text')" 
                                style="margin-bottom:6px;width:100%;background:#4ade80;color:#003366;border:none;border-radius:6px;padding:8px;font-weight:600;cursor:pointer;">
                            ✏️ Edit Text
                        </button><br>
                        <button onclick="window._customizeBox(${marker._leaflet_id})" 
                                style="margin-bottom:6px;width:100%;background:#3b82f6;color:#fff;border:none;border-radius:6px;padding:8px;font-weight:600;cursor:pointer;">
                            🎨 Customize Box
                        </button><br>
                        <button onclick="window._deleteCustomMarker(${marker._leaflet_id})" 
                                style="width:100%;background:#dc2626;color:#fff;border:none;border-radius:6px;padding:8px;font-weight:600;cursor:pointer;">
                            🗑️ Delete
                        </button>
                    `;
                } else if (type === 'image') {
                    popupContent = `
                        <button onclick="window._editCustomMarker(${marker._leaflet_id},'image')" 
                                style="margin-bottom:6px;width:100%;background:#FFD700;color:#003366;border:none;border-radius:6px;padding:8px;font-weight:600;cursor:pointer;">
                            🖼️ Edit Image
                        </button><br>
                        <button onclick="window._customizeBox(${marker._leaflet_id})" 
                                style="margin-bottom:6px;width:100%;background:#3b82f6;color:#fff;border:none;border-radius:6px;padding:8px;font-weight:600;cursor:pointer;">
                            🎨 Customize Box
                        </button><br>
                        <button onclick="window._deleteCustomMarker(${marker._leaflet_id})" 
                                style="width:100%;background:#dc2626;color:#fff;border:none;border-radius:6px;padding:8px;font-weight:600;cursor:pointer;">
                            🗑️ Delete
                        </button>
                    `;
                }
                marker.bindPopup(popupContent).openPopup();
            });
            
            // Store type and value for editing
            marker._customType = type;
            marker._customValue = initialValue;
        }

        // Make elements resizable and draggable
        function makeDivIconResizable(marker, type) {
            setTimeout(() => {
                const iconElem = marker.getElement().querySelector('div, img');
                if (!iconElem) return;

                // Wrap in a container for handles
                let wrapper = iconElem.parentElement;
                wrapper.style.position = 'relative';
                wrapper.style.display = 'inline-block';

                // Add resize handle (bottom-right corner)
                let handle = document.createElement('div');
                handle.className = 'resize-handle';
                handle.title = 'Resize';
                handle.style.cssText = `
                    position: absolute; right: -9px; bottom: -9px;
                    width: 18px; height: 18px;
                    background: rgba(255,215,0,0.9);
                    border: 2px solid #003366;
                    border-radius: 50%;
                    cursor: nwse-resize;
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0.8;
                    transition: opacity 0.2s ease;
                `;
                handle.innerHTML = `<svg width="10" height="10" style="display:block;" viewBox="0 0 12 12"><path d="M2 10L10 2M7 10h3v-3" stroke="#003366" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`;

                // Add visual feedback for editability - less intrusive
                wrapper.style.boxShadow = '0 0 0 1px rgba(255,215,0,0.6), 0 2px 4px rgba(0,0,0,0.1)';
                wrapper.style.border = '1px dashed rgba(255,215,0,0.8)';
                wrapper.style.transition = 'all 0.2s ease';

                // Show/hide handle on hover
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

                // Resize functionality
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
                        
                        // Set minimum and maximum sizes
                        let newW = Math.max(60, Math.min(400, startW + dx));
                        let newH = Math.max(30, Math.min(200, startH + dy));

                        marker._customSize = { width: newW, height: newH };
                        
                        // Update base size for zoom scaling (current size relative to current zoom)
                        const currentZoom = map.getZoom();
                        const initialZoom = window.initialZoomLevel || currentZoom;
                        const currentScale = Math.pow(2, currentZoom - initialZoom);
                        marker._baseSize = { 
                            width: newW / currentScale, 
                            height: newH / currentScale 
                        };

                        if (type === 'text') {
                            // Update text container with proper constraints
                            iconElem.style.width = newW + 'px';
                            iconElem.style.height = newH + 'px';
                            
                            // Adjust font size to fit container properly
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

                // Drag functionality
                let dragging = false;
                let dragStart = null;
                let mapStart = null;

                wrapper.addEventListener('mousedown', function(e) {
                    if (e.target === handle || e.target.closest('.resize-handle')) return; // Don't drag if resizing
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

                // Add resize handle if not already present
                if (!wrapper.querySelector('.resize-handle')) {
                    wrapper.appendChild(handle);
                }

                // Show move cursor on hover (but not on handle)
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

            }, 100); // Slightly longer delay to ensure proper initialization
        }

        // Auto-adjust font size to fit container with better control
        function adjustFontToFitContainer(elem, containerWidth, containerHeight) {
            const text = elem.textContent || elem.innerText;
            if (!text) return;
            
            // Account for padding in calculations
            const paddingX = 32; // 16px padding on each side
            const paddingY = 16; // 8px padding on top and bottom
            const availableWidth = containerWidth - paddingX;
            const availableHeight = containerHeight - paddingY;
            
            // Start with a reasonable font size
            let fontSize = Math.min(24, Math.max(10, Math.floor(availableHeight * 0.6)));
            elem.style.fontSize = fontSize + 'px';
            
            // Create a temporary element to measure text dimensions
            const tempDiv = document.createElement('div');
            tempDiv.style.cssText = `
                position: absolute;
                visibility: hidden;
                font-family: ${window.getComputedStyle(elem).fontFamily};
                font-weight: ${window.getComputedStyle(elem).fontWeight};
                line-height: 1.2;
                white-space: nowrap;
                padding: 0;
                margin: 0;
            `;
            document.body.appendChild(tempDiv);
            
            // Binary search for optimal font size
            let minSize = 8;
            let maxSize = 48;
            let optimalSize = fontSize;
            
            for (let i = 0; i < 10; i++) { // Limit iterations
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
            
            // Apply the optimal font size
            elem.style.fontSize = optimalSize + 'px';
            
            // Handle text wrapping for longer text
            if (text.length > 20) {
                elem.style.whiteSpace = 'normal';
                elem.style.wordBreak = 'break-word';
                elem.style.lineHeight = '1.2';
            } else {
                elem.style.whiteSpace = 'nowrap';
            }
        }

        // Simplified font adjustment for backward compatibility
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
                        
                        // Get current container size
                        const currentWidth = iconElem.offsetWidth;
                        const currentHeight = iconElem.offsetHeight;
                        
                        // Adjust font to fit current container
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
                    html: `<img src="${url}" alt="Custom" style="
                        width: ${currentSize.width}px; 
                        height: ${currentSize.height}px;
                        border-radius: ${borderRadius};
                        box-shadow: 0 2px 8px rgba(0,0,0,0.10);
                        background: ${color};
                        object-fit: cover;
                        user-select: none;
                    ">`,
                    iconSize: [currentSize.width, currentSize.height],
                    iconAnchor: [currentSize.width/2, currentSize.height/2]
                }));
                marker._customValue = url;
                
                // Update base size based on current zoom
                const currentZoom = map.getZoom();
                const initialZoom = window.initialZoomLevel || currentZoom;
                const currentScale = Math.pow(1.4, currentZoom - initialZoom);
                marker._baseSize = { 
                    width: currentSize.width / currentScale, 
                    height: currentSize.height / currentScale 
                };
                
                // Re-apply resize functionality
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
                // Remove from tracking array
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
                // File will be used when user clicks on map
            }
        }

        function exportExcel() {
            alert('Export to Excel functionality would be implemented here');
        }

        function exportMap() {
            alert('Export Map functionality would be implemented here');
        }

        // Initialize map when page loads
        document.addEventListener('DOMContentLoaded', function() {
            initMap();
        });