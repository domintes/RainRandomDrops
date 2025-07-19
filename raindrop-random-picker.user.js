// ==UserScript==
// @name         Rain Random Drops
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Pick random bookmarks from Raindrop.io collections
// @author       Domintes
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @connect      api.raindrop.io
// ==/UserScript==
(function() {
    'use strict';
    // Configuration
    const RAINDROP_API_BASE = 'https://api.raindrop.io/rest/v1';
    // Token: z localStorage lub pusty
    let ACCESS_TOKEN = GM_getValue('raindrop_token', '');
    // State management
    let currentBookmarks = [];
    let visitedBookmarks = GM_getValue('visited_bookmarks', []);
    let randomHistory = GM_getValue('random_history', []);
    let historyIndex = -1;
    let totalRandomized = GM_getValue('total_randomized', 0);
    let collections = [];
    let selectedCollectionId = GM_getValue('selected_collection', 0); // 0 = All bookmarks
    // UI Elements
    let widget, folderSelect, randomButton, prevButton, nextButton, 
        counterDisplay, visitedCheckbox, statusDisplay, tokenSection, tokenInput, saveTokenButton, tokenToggleArrow;
    // Create floating widget
    function createWidget() {
        widget = document.createElement('div');
        widget.id = 'raindrop-random-widget';
        widget.innerHTML = `
            <div class="widget-header">
                <a href="https://app.raindrop.io/my/0"><span>🌧️ Raindrop Random</span></a>
                <button id="refresh-collections" title="Odśwież kolekcje" style="margin-right:8px;">⟳</button>
                <button id="toggle-widget">−</button>
            </div>
            <div class="widget-content">
                <div class="main-section">
                    <select id="folder-select">
                        <option value="0">All Bookmarks</option>
                    </select>
                    <div class="controls">
                        <button id="prev-random">◀</button>
                        <button id="random-pick">🎲 Random</button>
                        <button id="next-random">▶</button>
                    </div>
                    <div class="stats">
                        <div class="counter">Randomized: <span id="counter">${totalRandomized}</span></div>
                        <label class="visited-label">
                            <input type="checkbox" id="visited-checkbox"> Visited
                        </label>
                    </div>
                    <div id="status-display">Ready to pick random bookmark</div>
                    <div id="token-toggle-arrow" style="text-align:center;cursor:pointer;font-size:18px;user-select:none;">▼ Show token form</div>
                    <div class="token-section" style="display:none;margin-top:10px;">
                        <input type="password" id="raindrop-token" placeholder="Raindrop.io Access Token" value="${ACCESS_TOKEN || ''}">
                        <button id="save-token">Save Token</button>
                        <div class="token-help">
                            <a href="https://app.raindrop.io/settings/integrations" target="_blank">Get your token here</a>
                        </div>
                    </div>
                    <div id="token-message" style="display:none;"></div>
                </div>
            </div>
        `;
        // Add CSS
        GM_addStyle(`
            #raindrop-random-widget {
                position: fixed;
                top: 20px;
                right: 20px;
                width: 300px;
                background: #fff;
                border: 2px solid #0066cc;
                border-radius: 10px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                z-index: 10000;
                font-family: Arial, sans-serif;
                font-size: 14px;
            }
            .widget-header {
                background: #0066cc;
                color: white;
                padding: 10px;
                border-radius: 8px 8px 0 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: move;
            }
            .widget-header button {
                background: none;
                border: none;
                color: white;
                font-size: 18px;
                cursor: pointer;
                padding: 0;
                width: 20px;
                height: 20px;
            }
            .widget-content {
                padding: 15px;
                color: black !important;
            }
            .token-section input {
                width: 100%;
                padding: 8px;
                margin-bottom: 10px;
                border: 1px solid #ddd;
                border-radius: 4px;
                box-sizing: border-box;
            }
            .token-section button {
                width: 100%;
                padding: 8px;
                background: #0066cc;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                margin-bottom: 10px;
            }
            .token-help {
                text-align: center;
                font-size: 12px;
            }
            .token-help a {
                color: #0066cc;
                text-decoration: none;
            }
            #folder-select {
                width: 100%;
                padding: 8px;
                margin-bottom: 15px;
                border: 1px solid #ddd;
                border-radius: 4px;
                box-sizing: border-box;
            }
            .controls {
                display: flex;
                gap: 5px;
                margin-bottom: 15px;
            }
            .controls button {
                flex: 1;
                padding: 10px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
            }
            #prev-random, #next-random {
                background: #f0f0f0;
                flex: 0 0 40px;
            }
            #random-pick {
                background: #28a745;
                color: white;
            }
            .controls button:hover {
                opacity: 0.8;
            }
            .controls button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            .stats {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
                font-size: 12px;
            }
            .counter {
                font-weight: bold;
            }
            .visited-label {
                display: flex;
                align-items: center;
                gap: 5px;
                cursor: pointer;
            }
            #status-display {
                background: #f8f9fa;
                padding: 10px;
                border-radius: 4px;
                font-size: 12px;
                text-align: center;
                border-left: 4px solid #0066cc;
            }
            .widget-minimized .widget-content {
                display: none;
            }
            .widget-minimized {
                width: auto;
            }
        `);
        document.body.appendChild(widget);
        // Get UI elements
        folderSelect = document.getElementById('folder-select');
        randomButton = document.getElementById('random-pick');
        prevButton = document.getElementById('prev-random');
        nextButton = document.getElementById('next-random');
        counterDisplay = document.getElementById('counter');
        visitedCheckbox = document.getElementById('visited-checkbox');
        statusDisplay = document.getElementById('status-display');
        tokenSection = widget.querySelector('.token-section');
        tokenInput = document.getElementById('raindrop-token');
        saveTokenButton = document.getElementById('save-token');
        tokenToggleArrow = document.getElementById('token-toggle-arrow');
        // Add event listeners
        setupEventListeners();
        // Refresh button
        document.getElementById('refresh-collections').addEventListener('click', function() {
            statusDisplay.textContent = 'Reloading collections...';
            loadCollections();
        });
        // Token toggle arrow
        tokenToggleArrow.addEventListener('click', function() {
            if (tokenSection.style.display === 'none') {
                tokenSection.style.display = 'block';
                tokenToggleArrow.textContent = '▲ Hide token form';
            } else {
                tokenSection.style.display = 'none';
                tokenToggleArrow.textContent = '▼ Show token form';
            }
        });
        // Save token
        saveTokenButton.addEventListener('click', saveToken);
        // Make widget draggable
        makeDraggable();
        // Load collections if token exists
        if (ACCESS_TOKEN) {
            loadCollections();
        }
    }
    function setupEventListeners() {
        // Toggle widget
        document.getElementById('toggle-widget').addEventListener('click', toggleWidget);
        // Main controls
        folderSelect.addEventListener('change', onCollectionChange);
        randomButton.addEventListener('click', pickRandomBookmark);
        prevButton.addEventListener('click', goToPrevious);
        nextButton.addEventListener('click', goToNext);
        visitedCheckbox.addEventListener('change', toggleVisited);
    }
    function showTokenMessage(msg, type = 'error', autoClose = false) {
        const el = document.getElementById('token-message');
        el.style.display = 'block';
        el.innerHTML = `<span>${msg}</span>` + (type === 'error' ? '<span id="close-token-msg" style="float:right;cursor:pointer;font-weight:bold;">[x]</span>' : '');
        el.style.margin = '10px 0';
        el.style.padding = '10px';
        el.style.borderRadius = '7px';
        el.style.fontWeight = 'bold';
        el.style.textAlign = 'center';
        el.style.color = 'white';
        if (type === 'error') {
            el.style.background = '#ED4337';
        } else {
            el.style.background = '#1b8b00';
        }
        if (type === 'error') {
            document.getElementById('close-token-msg').onclick = () => { el.style.display = 'none'; };
        }
        if (type === 'success' && autoClose) {
            setTimeout(() => { el.style.display = 'none'; }, 3500);
        }
    }

    function saveToken() {
        const token = tokenInput.value.trim();
        if (!token) {
            showTokenMessage('Please enter your Raindrop.io access token', 'error');
            return;
        }
        ACCESS_TOKEN = token;
        GM_setValue('raindrop_token', token);
        // Test the token
        statusDisplay.textContent = 'Testing token...';
        testToken();
    }

    async function testToken() {
        try {
            const response = await makeAPIRequest('/user');
            showTokenMessage(`Welcome ${response.item.fullName || 'User'}!`, 'success', true);
            statusDisplay.textContent = `Welcome ${response.item.fullName || 'User'}! Loading collections...`;
            tokenSection.style.display = 'none';
            tokenToggleArrow.textContent = '▼ Show token form';
            loadCollections();
        } catch (error) {
            showTokenMessage('Token test failed: ' + error.message, 'error');
            statusDisplay.textContent = 'Token test failed: ' + error.message;
            ACCESS_TOKEN = '';
            GM_setValue('raindrop_token', '');
        }
    }
    function toggleWidget() {
        const toggleBtn = document.getElementById('toggle-widget');
        if (widget.classList.contains('widget-minimized')) {
            widget.classList.remove('widget-minimized');
            toggleBtn.textContent = '−';
        } else {
            widget.classList.add('widget-minimized');
            toggleBtn.textContent = '+';
        }
    }
    function makeDraggable() {
        const header = widget.querySelector('.widget-header');
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;
        header.addEventListener('mousedown', dragStart);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);
        function dragStart(e) {
            if (e.target.tagName === 'BUTTON') return;
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
            if (e.target === header || header.contains(e.target)) {
                isDragging = true;
            }
        }
        function drag(e) {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
                xOffset = currentX;
                yOffset = currentY;
                widget.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
            }
        }
        function dragEnd() {
            initialX = currentX;
            initialY = currentY;
            isDragging = false;
        }
    }
    function makeAPIRequest(endpoint, method = 'GET', data = null) {
        return new Promise((resolve, reject) => {
            console.log('Making API request to:', `${RAINDROP_API_BASE}${endpoint}`);
            console.log('Using token:', ACCESS_TOKEN.substring(0, 8) + '...');
            
            GM_xmlhttpRequest({
                method: method,
                url: `${RAINDROP_API_BASE}${endpoint}`,
                headers: {
                    'Authorization': `Bearer ${ACCESS_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                data: data ? JSON.stringify(data) : null,
                onload: function(response) {
                    console.log('API Response status:', response.status);
                    console.log('API Response:', response.responseText);
                    
                    if (response.status >= 200 && response.status < 300) {
                        try {
                            resolve(JSON.parse(response.responseText));
                        } catch (e) {
                            resolve(response.responseText);
                        }
                    } else {
                        const errorMsg = `API Error ${response.status}: ${response.responseText}`;
                        console.error(errorMsg);
                        reject(new Error(errorMsg));
                    }
                },
                onerror: function(error) {
                    console.error('Network error:', error);
                    reject(error);
                }
            });
        });
    }
    async function loadCollections() {
        try {
            statusDisplay.textContent = 'Loading collections...';
            const response = await makeAPIRequest('/collections');
            if (!response || !Array.isArray(response.items)) {
                throw new Error('No collections found or API error');
            }
            collections = response.items;
            // Clear and populate folder select
            folderSelect.innerHTML = '<option value="0">All Bookmarks</option>';
            collections.forEach(collection => {
                const option = document.createElement('option');
                option.value = collection._id;
                option.textContent = `${collection.title} (${collection.count})`;
                folderSelect.appendChild(option);
            });
            // Set selected collection
            folderSelect.value = selectedCollectionId;
            statusDisplay.textContent = 'Collections loaded. Ready to pick random bookmark!';
            await loadBookmarks();
        } catch (error) {
            console.error('Error loading collections:', error);
            statusDisplay.textContent = `Error: ${error.message}`;
            showTokenMessage('Error loading collections: ' + error.message, 'error');
        }
    }
    async function loadBookmarks() {
        try {
            statusDisplay.textContent = 'Loading bookmarks...';
            const collectionId = selectedCollectionId === '0' ? '' : `/${selectedCollectionId}`;
            const response = await makeAPIRequest(`/raindrops${collectionId}?perpage=50`);
            // Filter out visited bookmarks
            currentBookmarks = (response.items || []).filter(bookmark => 
                !visitedBookmarks.includes(bookmark._id)
            );
            const totalBookmarks = response.items ? response.items.length : 0;
            const availableBookmarks = currentBookmarks.length;
            statusDisplay.textContent = `Loaded ${availableBookmarks}/${totalBookmarks} bookmarks (${totalBookmarks - availableBookmarks} visited)`;
            // Update button states
            updateButtonStates();
        } catch (error) {
            console.error('Error loading bookmarks:', error);
            statusDisplay.textContent = `Error loading bookmarks: ${error.message}`;
            
            // Show token section if auth failed
            if (error.message.includes('401') || error.message.includes('403')) {
                document.querySelector('.token-section').style.display = 'block';
                document.querySelector('.main-section').style.display = 'none';
            }
        }
    }
    function onCollectionChange() {
        selectedCollectionId = folderSelect.value;
        GM_setValue('selected_collection', selectedCollectionId);
        loadBookmarks();
    }
    function pickRandomBookmark() {
        if (currentBookmarks.length === 0) {
            statusDisplay.textContent = 'No unvisited bookmarks available!';
            return;
        }
        const randomIndex = Math.floor(Math.random() * currentBookmarks.length);
        const bookmark = currentBookmarks[randomIndex];
        // Add to history
        randomHistory.push(bookmark);
        historyIndex = randomHistory.length - 1;
        GM_setValue('random_history', randomHistory);
        // Update counter
        totalRandomized++;
        GM_setValue('total_randomized', totalRandomized);
        counterDisplay.textContent = totalRandomized;
        // Check if current bookmark is visited
        visitedCheckbox.checked = visitedBookmarks.includes(bookmark._id);
        // Open bookmark
        window.open(bookmark.link, '_blank');
        statusDisplay.textContent = `Opened: ${bookmark.title}`;
        updateButtonStates();
    }
    function goToPrevious() {
        if (historyIndex > 0) {
            historyIndex--;
            const bookmark = randomHistory[historyIndex];
            window.open(bookmark.link, '_blank');
            visitedCheckbox.checked = visitedBookmarks.includes(bookmark._id);
            statusDisplay.textContent = `Previous: ${bookmark.title}`;
            updateButtonStates();
        }
    }
    function goToNext() {
        if (historyIndex < randomHistory.length - 1) {
            historyIndex++;
            const bookmark = randomHistory[historyIndex];
            window.open(bookmark.link, '_blank');
            visitedCheckbox.checked = visitedBookmarks.includes(bookmark._id);
            statusDisplay.textContent = `Next: ${bookmark.title}`;
            updateButtonStates();
        }
    }
    function toggleVisited() {
        if (historyIndex >= 0 && historyIndex < randomHistory.length) {
            const bookmark = randomHistory[historyIndex];
            if (visitedCheckbox.checked) {
                // Mark as visited
                if (!visitedBookmarks.includes(bookmark._id)) {
                    visitedBookmarks.push(bookmark._id);
                    GM_setValue('visited_bookmarks', visitedBookmarks);
                    // Remove from current bookmarks
                    currentBookmarks = currentBookmarks.filter(b => b._id !== bookmark._id);
                    statusDisplay.textContent = `Marked "${bookmark.title}" as visited`;
                }
            } else {
                // Unmark as visited
                visitedBookmarks = visitedBookmarks.filter(id => id !== bookmark._id);
                GM_setValue('visited_bookmarks', visitedBookmarks);
                // Reload bookmarks to include this one again
                loadBookmarks();
                statusDisplay.textContent = `Unmarked "${bookmark.title}" as visited`;
            }
        }
    }
    function updateButtonStates() {
        prevButton.disabled = historyIndex <= 0;
        nextButton.disabled = historyIndex >= randomHistory.length - 1;
        randomButton.disabled = currentBookmarks.length === 0;
    }
    // Initialize when page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createWidget);
    } else {
        createWidget();
    }
})();
