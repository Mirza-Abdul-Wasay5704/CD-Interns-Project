let map;
        let radiusCircle;
        let focusModeButton;
        let currentStations = [];
        let filteredStations = [];

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


        // Initialize map when page loads
        document.addEventListener('DOMContentLoaded', function() {
            loadCoordinatesFromCookies();
            initMap();
        });


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
    map.on('click', function (e) {
        document.getElementById('latitude').value = e.latlng.lat.toFixed(6);
        document.getElementById('longitude').value = e.latlng.lng.toFixed(6);
    });
}

// Get accurate distance using Leaflet Routing Machine
function getDistanceWithLRM(startLat, startLng, endLat, endLng) {
    return new Promise((resolve, reject) => {
        // Create invisible routing control (no UI)
        const routingControl = L.Routing.control({
            waypoints: [
                L.latLng(startLat, startLng),
                L.latLng(endLat, endLng)
            ],
            createMarker: function() { return null; }, // No markers
            addWaypoints: false, // No dragging
            routeWhileDragging: false,
            show: false, // Hide the control panel
            router: L.Routing.osrmv1({
                serviceUrl: 'https://router.project-osrm.org/route/v1'
            })
        });

        // Listen for route calculation
        routingControl.on('routesfound', function(e) {
            const route = e.routes[0];
            const distanceKm = route.summary.totalDistance / 1000; // Convert to km
            const timeSeconds = route.summary.totalTime;
            
            // Remove the routing control (cleanup)
            routingControl.remove();
            
            resolve({
                distance: distanceKm,
                time: timeSeconds,
                source: 'Leaflet Routing Machine (OSRM)'
            });
        });

        // Handle routing errors
        routingControl.on('routingerror', function(e) {
            routingControl.remove();
            reject(new Error(`Routing failed: ${e.error.message || 'Unknown error'}`));
        });

        // Don't add to map visually, just calculate
        // routingControl.addTo(map); // Commented out to keep invisible
        
        // Trigger route calculation
        setTimeout(() => {
            if (!routingControl._routes || routingControl._routes.length === 0) {
                // Force route calculation if it didn't start automatically
                routingControl._route();
            }
        }, 100);
    });
}

// Batch process distances with Leaflet Routing Machine
async function fetchDistancesWithLRM(searchLat, searchLng, stations) {
    console.log(`🗺️  Calculating distances with Leaflet Routing Machine for ${stations.length} stations...`);
    
    const results = [];
    const batchSize = 3; // Process 3 at a time to avoid overwhelming OSRM
    
    for (let i = 0; i < stations.length; i += batchSize) {
        const batch = stations.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (station, index) => {
            try {
                const result = await getDistanceWithLRM(searchLat, searchLng, station.lat, station.lng);
                
                // Update station with accurate data
                station.distance = result.distance;
                station.travelTime = result.time;
                station.distanceSource = result.source;
                
                console.log(`✅ ${station.name}: ${result.distance.toFixed(2)}km (${Math.round(result.time/60)}min)`);
                return station;
                
            } catch (error) {
                console.warn(`❌ Error calculating route for ${station.name}:`, error.message);
                // Keep original distance if routing fails
                station.distanceSource = 'Direct (fallback)';
                return station;
            }
        });
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Small delay between batches to be respectful to OSRM
        if (i + batchSize < stations.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Update progress
        console.log(`📊 Progress: ${Math.min(i + batchSize, stations.length)}/${stations.length} stations processed`);
    }
    
    // Sort by accurate distance
    stations.sort((a, b) => a.distance - b.distance);
    
    console.log('🎉 All distances calculated with Leaflet Routing Machine!');
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
            
            // Update loading message
            document.getElementById('results-list').innerHTML = `
                <div class="loading">
                    <i class="fas fa-route fa-spin text-2xl mb-2"></i>
                    <p>Calculating precise road distances...</p>
                    <div class="text-sm text-gray-400 mt-2">
                        Using Leaflet Routing Machine + OSRM for accuracy
                    </div>
                </div>
            `;

            // Calculate accurate distances with Leaflet Routing Machine
            await fetchDistancesWithLRM(lat, lng, stations);
            
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
            searchBtn.disabled = false;
            searchBtn.innerHTML = '<i class="fas fa-search mr-2"></i>Search Stations';
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
                        LRM
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
    if (source.includes('Routing Machine')) {
        return 'bg-green-600 text-white';
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
    const latlngs = [[searchLat, searchLng], [station.lat, station.lng]];

    L.polyline(latlngs, {
        color: isPSO ? '#10b981' : '#ef4444',
        weight: 3,
        opacity: 0.8,
        className: isPSO ? 'glow-line-green' : 'glow-line-red'
    }).addTo(map);
}

// Add accurate distance label (shows LRM calculated distance)
function addAccurateDistanceLabel(searchLat, searchLng, station) {
    const midLat = (searchLat + station.lat) / 2;
    const midLng = (searchLng + station.lng) / 2;

    const distanceLabel = L.marker([midLat, midLng], {
        icon: L.divIcon({
            className: 'accurate-distance-label',
            html: `
                <div class="bg-white px-3 py-1 rounded-full shadow-lg border-2 border-gray-300 text-center">
                    <div class="font-bold text-gray-800 text-sm">${station.distance.toFixed(1)} km</div>
                    ${station.travelTime ? `
                        <div class="text-xs text-blue-600">~${Math.round(station.travelTime/60)}min</div>
                    ` : ''}
                   
                </div>
            `,
            iconSize: [80, 50],
            iconAnchor: [40, 25]
        }),
        interactive: false
    }).addTo(map);
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
            const latlngs = [[searchLat, searchLng], [station.lat, station.lng]];

            if (isPSO) {
                // Green solid line for PSO stations
                L.polyline(latlngs, {
                    color: '#10b981',
                    weight: 3,
                    opacity: 0.9,
                    className: 'glow-line-green'
                }).addTo(map);
            } else {
                // Red solid line for other stations
                L.polyline(latlngs, {
                    color: '#ef4444',
                    weight: 3,
                    opacity: 0.8,
                    className: 'glow-line-red'
                }).addTo(map);
            }
        }

        // Add distance label on the line
        function addDistanceLabel(searchLat, searchLng, station) {
            const midLat = (searchLat + station.lat) / 2;
            const midLng = (searchLng + station.lng) / 2;

            const distanceLabel = L.marker([midLat, midLng], {
                icon: L.divIcon({
                    className: 'distance-label',
                    html: `<span class="inline-block whitespace-nowrap text-xs font-bold text-gray-700 bg-white px-2 py-1 rounded-full shadow-md border">${station.distance.toFixed(1)} km</span>`,
                    iconSize: [50, 20],
                    iconAnchor: [25, 10]
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
        }

        // Toggle fullscreen mode
        function toggleFullscreen() {
            const mapContainer = document.getElementById('map');
            const mapCard = mapContainer.closest('.bg-gray-800');

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
                const btn = event.target.closest('button');
                btn.innerHTML = '<i class="fas fa-expand mr-2"></i>Fullscreen';
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
                const btn = event.target.closest('button');
                btn.innerHTML = '<i class="fas fa-compress mr-2"></i>Exit Fullscreen';
            }

            // Refresh map size
            setTimeout(() => {
                map.invalidateSize();
            }, 100);
        }

     