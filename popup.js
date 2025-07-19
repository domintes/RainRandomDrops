// Popup script for Rain Random Drops extension
document.addEventListener('DOMContentLoaded', async function() {
  // Get DOM elements
  const authSection = document.getElementById('auth-section');
  const mainSection = document.getElementById('main-section');
  const settingsSection = document.getElementById('settings-section');
  const authBtn = document.getElementById('auth-btn');
  const authStatus = document.getElementById('auth-status');
  const mainStatus = document.getElementById('main-status');
  
  // Manual token elements
  const manualTokenInput = document.getElementById('manual-token');
  const testTokenBtn = document.getElementById('test-token-btn');
  
  const totalRandomizedEl = document.getElementById('total-randomized');
  const totalCollectionsEl = document.getElementById('total-collections');
  const totalBookmarksEl = document.getElementById('total-bookmarks');
  
  const randomBtn = document.getElementById('random-btn');
  const localRandomBtn = document.getElementById('local-random-btn');
  const watchedBtn = document.getElementById('watched-btn');
  const unwatchBtn = document.getElementById('unwatch-btn');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  
  const collectionSelect = document.getElementById('collection-select');
  const tagInput = document.getElementById('tag-input');
  const selectedTagsEl = document.getElementById('selected-tags');
  const tagSuggestions = document.getElementById('tag-suggestions');
  const minCountInput = document.getElementById('min-count');
  const hideBelowCountInput = document.getElementById('hide-below-count');
  const showWatchedCollectionCheckbox = document.getElementById('show-watched-collection');
  const applyFiltersBtn = document.getElementById('apply-filters-btn');
  
  // State
  let availableTags = [];
  let isAuthenticated = false;
  
  // Initialize
  await init();
  
  async function init() {
    try {
      // Load saved data
      const data = await chrome.storage.sync.get([
        'accessToken',
        'selectedCollectionId',
        'selectedTags', 
        'minBookmarkCount',
        'hideCollectionsBelowCount',
        'showWatchedCollection',
        'totalRandomized',
        'randomHistory',
        'historyIndex'
      ]);
      
      // Update UI with saved data
      if (data.totalRandomized) {
        totalRandomizedEl.textContent = data.totalRandomized;
      }
      
      if (data.minBookmarkCount) {
        minCountInput.value = data.minBookmarkCount;
      }
      
      if (data.hideCollectionsBelowCount) {
        hideBelowCountInput.value = data.hideCollectionsBelowCount;
      }
      
      if (data.showWatchedCollection) {
        showWatchedCollectionCheckbox.checked = data.showWatchedCollection;
      }
      
      // Check authentication
      if (data.accessToken) {
        await checkAuthentication();
      }
      
      setupEventListeners();
      
    } catch (error) {
      console.error('Initialization failed:', error);
      showStatus('Initialization failed: ' + error.message, 'error');
    }
  }
  
  function setupEventListeners() {
    // Authentication
    authBtn.addEventListener('click', authenticate);
    testTokenBtn.addEventListener('click', testManualToken);
    
    // Main controls
    randomBtn.addEventListener('click', pickRandomBookmark);
    localRandomBtn.addEventListener('click', pickRandomLocalBookmark);
    watchedBtn.addEventListener('click', markCurrentWatched);
    unwatchBtn.addEventListener('click', unmarkCurrentWatched);
    prevBtn.addEventListener('click', goToPrevious);
    nextBtn.addEventListener('click', goToNext);
    
    // Filters
    collectionSelect.addEventListener('change', onCollectionChange);
    minCountInput.addEventListener('change', onMinCountChange);
    hideBelowCountInput.addEventListener('change', onHideBelowCountChange);
    showWatchedCollectionCheckbox.addEventListener('change', onShowWatchedChange);
    applyFiltersBtn.addEventListener('click', applyFilters);
    
    // Tag input
    tagInput.addEventListener('input', onTagInput);
    tagInput.addEventListener('keydown', onTagKeyDown);
    
    // Close tag suggestions when clicking elsewhere
    document.addEventListener('click', (e) => {
      if (!tagInput.contains(e.target) && !tagSuggestions.contains(e.target)) {
        tagSuggestions.style.display = 'none';
      }
    });
    
    // Handle Enter key for manual token
    manualTokenInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        testManualToken();
      }
    });
  }
  
  async function authenticate() {
    // Check if auth is already in progress
    const authData = await chrome.storage.sync.get(['authInProgress']);
    if (authData.authInProgress) {
      authStatus.textContent = 'Authentication already in progress. Please wait...';
      authStatus.className = 'status warning';
      return;
    }
    
    authBtn.disabled = true;
    authBtn.textContent = 'Connecting...';
    authStatus.textContent = 'Connecting to Raindrop.io...';
    authStatus.className = 'status info';
    
    // Set timeout to reset UI if authentication hangs
    const authTimeoutId = setTimeout(() => {
      authBtn.disabled = false;
      authBtn.textContent = 'Connect to Raindrop.io';
      authStatus.textContent = 'Authentication timeout. Please try again.';
      authStatus.className = 'status error';
    }, 25000); // 25 seconds timeout
    
    try {
      const response = await sendMessage({ action: 'authenticate' });
      
      clearTimeout(authTimeoutId);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      if (!response || !response.user || !response.user.fullName) {
        authStatus.textContent = 'Authentication failed: No user info returned.';
        authStatus.className = 'status error';
        isAuthenticated = false;
        return;
      }
      await handleAuthSuccess(response);
      
    } catch (error) {
      clearTimeout(authTimeoutId);
      console.error('Authentication failed:', error);
      authStatus.textContent = 'Authentication failed: ' + error.message;
      authStatus.className = 'status error';
    } finally {
      authBtn.disabled = false;
      authBtn.textContent = 'Connect to Raindrop.io';
    }
  }
  
  async function testManualToken() {
    const token = manualTokenInput.value.trim();
    
    if (!token) {
      authStatus.textContent = 'Please enter a token first';
      authStatus.className = 'status error';
      return;
    }
    
    testTokenBtn.disabled = true;
    testTokenBtn.textContent = 'Testing...';
    authStatus.textContent = 'Testing token...';
    authStatus.className = 'status info';
    
    try {
      const response = await sendMessage({ 
        action: 'test-token', 
        token: token 
      });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      await handleAuthSuccess(response);
      manualTokenInput.value = ''; // Clear the input
      
    } catch (error) {
      console.error('Token test failed:', error);
      authStatus.textContent = 'Token test failed: ' + error.message;
      authStatus.className = 'status error';
    } finally {
      testTokenBtn.disabled = false;
      testTokenBtn.textContent = 'Test Token';
    }
  }
  
  async function handleAuthSuccess(response) {
    if (!response || !response.user || !response.user.fullName) {
      authStatus.textContent = 'Authentication failed: No user info returned.';
      authStatus.className = 'status error';
      isAuthenticated = false;
      mainSection.classList.add('hidden');
      settingsSection.classList.add('hidden');
      return;
    }
    isAuthenticated = true;
    authStatus.textContent = `Welcome ${response.user.fullName || 'User'}! (${response.method})`;
    authStatus.className = 'status success';
    
    // Show main sections
    mainSection.classList.remove('hidden');
    settingsSection.classList.remove('hidden');
    
    // Load data
    await loadCollections();
    await loadTags();
    await loadSavedState();
  }
  
  async function checkAuthentication() {
    try {
      // Try to make a test API call
      const response = await sendMessage({ action: 'api-request', endpoint: '/user' });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      await handleAuthSuccess({ user: response.item, method: 'existing' });
      authSection.classList.add('hidden');
      
    } catch (error) {
      console.error('Authentication check failed:', error);
      authStatus.textContent = 'Please authenticate to continue';
      authStatus.className = 'status info';
    }
  }
  
  async function loadCollections() {
    try {
      const response = await sendMessage({ action: 'get-collections' });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Update collection select
      collectionSelect.innerHTML = '<option value="0">All Bookmarks</option>';
      
      (response.items || []).forEach(collection => {
        const option = document.createElement('option');
        option.value = collection._id;
        option.textContent = `${collection.title} (${collection.count})`;
        collectionSelect.appendChild(option);
      });
      
      totalCollectionsEl.textContent = response.items ? response.items.length : 0;
      
    } catch (error) {
      console.error('Error loading collections:', error);
      showStatus('Error loading collections: ' + error.message, 'error');
    }
  }
  
  async function loadTags() {
    try {
      const response = await sendMessage({ action: 'get-tags' });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      availableTags = response.items || [];
      
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  }
  
  async function loadSavedState() {
    try {
      const data = await chrome.storage.sync.get([
        'selectedCollectionId',
        'selectedTags',
        'randomHistory',
        'historyIndex'
      ]);
      
      // Set collection
      if (data.selectedCollectionId) {
        collectionSelect.value = data.selectedCollectionId;
      }
      
      // Set tags
      if (data.selectedTags) {
        selectedTagsEl.innerHTML = '';
        data.selectedTags.forEach(tag => addTagToUI(tag));
      }
      
      // Update navigation buttons
      updateNavigationButtons(data.randomHistory || [], data.historyIndex || -1);
      
      // Load bookmark count
      await updateBookmarkCount();
      
    } catch (error) {
      console.error('Error loading saved state:', error);
    }
  }
  
  async function updateBookmarkCount() {
    try {
      const data = await chrome.storage.sync.get([
        'selectedCollectionId',
        'selectedTags',
        'minBookmarkCount'
      ]);
      
      const response = await sendMessage({
        action: 'get-bookmarks',
        collectionId: data.selectedCollectionId || '0',
        tags: data.selectedTags || [],
        minCount: data.minBookmarkCount || 0
      });
      
      if (!response.error) {
        totalBookmarksEl.textContent = response.total || 0;
      }
      
    } catch (error) {
      console.error('Error updating bookmark count:', error);
    }
  }
  
  async function pickRandomBookmark() {
    const originalText = randomBtn.textContent;
    randomBtn.disabled = true;
    randomBtn.textContent = 'Picking...';
    
    try {
      const response = await sendMessage({ action: 'pick-random' });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      totalRandomizedEl.textContent = response.totalRandomized;
      showStatus(`Opened: ${response.bookmark.title}`, 'success');
      
      // Update navigation buttons
      const data = await chrome.storage.sync.get(['randomHistory', 'historyIndex']);
      updateNavigationButtons(data.randomHistory || [], data.historyIndex || -1);
      
    } catch (error) {
      console.error('Error picking random bookmark:', error);
      showStatus('Error: ' + error.message, 'error');
    } finally {
      randomBtn.disabled = false;
      randomBtn.textContent = originalText;
    }
  }
  
  function updateNavigationButtons(history, index) {
    prevBtn.disabled = index <= 0;
    nextBtn.disabled = index >= history.length - 1;
  }
  
  async function goToPrevious() {
    showStatus('Previous navigation not implemented yet', 'info');
  }
  
  async function goToNext() {
    showStatus('Next navigation not implemented yet', 'info');
  }
  
  function onCollectionChange() {
    chrome.storage.sync.set({ selectedCollectionId: collectionSelect.value });
    updateBookmarkCount();
  }
  
  function onMinCountChange() {
    const value = parseInt(minCountInput.value) || 0;
    chrome.storage.sync.set({ minBookmarkCount: value });
  }
  
  async function applyFilters() {
    applyFiltersBtn.disabled = true;
    applyFiltersBtn.textContent = 'Applying...';
    
    try {
      await loadCollections();
      await loadTags();
      await updateBookmarkCount();
      showStatus('Filters applied successfully!', 'success');
    } catch (error) {
      showStatus('Error applying filters: ' + error.message, 'error');
    } finally {
      applyFiltersBtn.disabled = false;
      applyFiltersBtn.textContent = 'Apply Filters';
    }
  }
  
  function onTagInput(e) {
    const value = e.target.value.trim();
    
    if (!value || !availableTags.length) {
      tagSuggestions.style.display = 'none';
      return;
    }
    
    const existingTags = getSelectedTags();
    const filtered = availableTags
      .filter(tag => 
        tag._id.toLowerCase().includes(value.toLowerCase()) &&
        !existingTags.includes(tag._id)
      )
      .slice(0, 5);
    
    if (filtered.length === 0) {
      tagSuggestions.style.display = 'none';
      return;
    }
    
    tagSuggestions.innerHTML = filtered
      .map(tag => `<div class="tag-suggestion" data-tag="${tag._id}">${tag._id} (${tag.count})</div>`)
      .join('');
    
    tagSuggestions.style.display = 'block';
    
    // Add click handlers
    tagSuggestions.querySelectorAll('.tag-suggestion').forEach(el => {
      el.addEventListener('click', () => {
        addTag(el.dataset.tag);
        tagInput.value = '';
        tagSuggestions.style.display = 'none';
      });
    });
  }
  
  function onTagKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const value = e.target.value.trim();
      if (value) {
        addTag(value);
        e.target.value = '';
        tagSuggestions.style.display = 'none';
      }
    }
  }
  
  function addTag(tag) {
    if (!tag || getSelectedTags().includes(tag)) return;
    
    addTagToUI(tag);
    updateSelectedTags();
    updateBookmarkCount();
  }
  
  function addTagToUI(tag) {
    const tagEl = document.createElement('span');
    tagEl.className = 'selected-tag';
    tagEl.dataset.tag = tag;
    tagEl.innerHTML = `${tag} <button class="remove-tag">×</button>`;
    
    tagEl.querySelector('.remove-tag').addEventListener('click', () => {
      tagEl.remove();
      updateSelectedTags();
      updateBookmarkCount();
    });
    
    selectedTagsEl.appendChild(tagEl);
  }
  
  function getSelectedTags() {
    return [...selectedTagsEl.querySelectorAll('.selected-tag')].map(el => el.dataset.tag);
  }
  
  function updateSelectedTags() {
    const tags = getSelectedTags();
    chrome.storage.sync.set({ selectedTags: tags });
  }
  
  // New functions for enhanced features
  async function pickRandomLocalBookmark() {
    try {
      randomBtn.disabled = true;
      localRandomBtn.disabled = true;
      localRandomBtn.textContent = 'Picking...';
      mainStatus.textContent = 'Picking random local bookmark...';
      mainStatus.className = 'status info';
      
      const response = await sendMessage({ action: 'pick-random-local' });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      mainStatus.textContent = `📚 Opened: ${response.bookmark.title}`;
      mainStatus.className = 'status success';
      
      // Update counter (local bookmarks don't count towards Raindrop counter)
      
    } catch (error) {
      console.error('Error picking random local bookmark:', error);
      mainStatus.textContent = 'Error: ' + error.message;
      mainStatus.className = 'status error';
    } finally {
      randomBtn.disabled = false;
      localRandomBtn.disabled = false;
      localRandomBtn.textContent = '📚 Local Random';
    }
  }
  
  async function markCurrentWatched() {
    try {
      const data = await chrome.storage.sync.get(['randomHistory', 'historyIndex']);
      const history = data.randomHistory || [];
      const index = data.historyIndex || -1;
      
      if (index < 0 || index >= history.length) {
        mainStatus.textContent = 'No bookmark to mark as watched';
        mainStatus.className = 'status error';
        return;
      }
      
      const currentBookmark = history[index];
      if (currentBookmark.type === 'local') {
        mainStatus.textContent = 'Cannot mark local bookmarks as watched';
        mainStatus.className = 'status error';
        return;
      }
      
      const response = await sendMessage({ 
        action: 'mark-watched', 
        bookmarkId: currentBookmark._id,
        watched: true
      });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      mainStatus.textContent = `👁️ Marked "${currentBookmark.title}" as watched`;
      mainStatus.className = 'status success';
      
      // Refresh collections to update watched count
      await loadCollections();
      
    } catch (error) {
      console.error('Error marking bookmark as watched:', error);
      mainStatus.textContent = 'Error: ' + error.message;
      mainStatus.className = 'status error';
    }
  }
  
  async function unmarkCurrentWatched() {
    try {
      const data = await chrome.storage.sync.get(['randomHistory', 'historyIndex']);
      const history = data.randomHistory || [];
      const index = data.historyIndex || -1;
      
      if (index < 0 || index >= history.length) {
        mainStatus.textContent = 'No bookmark to unmark';
        mainStatus.className = 'status error';
        return;
      }
      
      const currentBookmark = history[index];
      if (currentBookmark.type === 'local') {
        mainStatus.textContent = 'Cannot unmark local bookmarks';
        mainStatus.className = 'status error';
        return;
      }
      
      const response = await sendMessage({ 
        action: 'mark-watched', 
        bookmarkId: currentBookmark._id,
        watched: false
      });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      mainStatus.textContent = `🔄 Unmarked "${currentBookmark.title}" as watched`;
      mainStatus.className = 'status success';
      
      // Refresh collections to update watched count
      await loadCollections();
      
    } catch (error) {
      console.error('Error unmarking bookmark:', error);
      mainStatus.textContent = 'Error: ' + error.message;
      mainStatus.className = 'status error';
    }
  }
  
  async function onHideBelowCountChange() {
    const hideCount = parseInt(hideBelowCountInput.value) || 0;
    await chrome.storage.sync.set({ hideCollectionsBelowCount: hideCount });
    await loadCollections();
  }
  
  async function onShowWatchedChange() {
    const showWatched = showWatchedCollectionCheckbox.checked;
    await chrome.storage.sync.set({ showWatchedCollection: showWatched });
    await loadCollections();
  }
  
  function showStatus(message, type = 'info') {
    mainStatus.textContent = message;
    mainStatus.className = `status ${type}`;
    
    if (type === 'success') {
      setTimeout(() => {
        mainStatus.className = 'status info';
        mainStatus.textContent = 'Ready to pick random bookmark';
      }, 3000);
    }
  }
  
  function sendMessage(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, resolve);
    });
  }
});
