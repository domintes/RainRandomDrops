// Popup script for Rain Random Drops extension
document.addEventListener('DOMContentLoaded', async function() {
  // Get DOM elements
  const authSection = document.getElementById('auth-section');
  const mainSection = document.getElementById('main-section');
  const settingsSection = document.getElementById('settings-section');
  const authBtn = document.getElementById('auth-btn');
  const authStatus = document.getElementById('auth-status');
  const mainStatus = document.getElementById('main-status');
  
  const totalRandomizedEl = document.getElementById('total-randomized');
  const totalCollectionsEl = document.getElementById('total-collections');
  const totalBookmarksEl = document.getElementById('total-bookmarks');
  
  const randomBtn = document.getElementById('random-btn');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  
  const collectionSelect = document.getElementById('collection-select');
  const tagInput = document.getElementById('tag-input');
  const selectedTagsEl = document.getElementById('selected-tags');
  const tagSuggestions = document.getElementById('tag-suggestions');
  const minCountInput = document.getElementById('min-count');
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
    
    // Main controls
    randomBtn.addEventListener('click', pickRandomBookmark);
    prevBtn.addEventListener('click', goToPrevious);
    nextBtn.addEventListener('click', goToNext);
    
    // Filters
    collectionSelect.addEventListener('change', onCollectionChange);
    minCountInput.addEventListener('change', onMinCountChange);
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
  }
  
  async function authenticate() {
    authBtn.disabled = true;
    authBtn.textContent = 'Connecting...';
    authStatus.textContent = 'Connecting to Raindrop.io...';
    
    try {
      const response = await sendMessage({ action: 'authenticate' });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      isAuthenticated = true;
      authStatus.textContent = `Welcome ${response.user.fullName || 'User'}!`;
      authStatus.className = 'status success';
      
      // Show main sections
      mainSection.classList.remove('hidden');
      settingsSection.classList.remove('hidden');
      
      // Load data
      await loadCollections();
      await loadTags();
      await loadSavedState();
      
    } catch (error) {
      console.error('Authentication failed:', error);
      authStatus.textContent = 'Authentication failed: ' + error.message;
      authStatus.className = 'status error';
    } finally {
      authBtn.disabled = false;
      authBtn.textContent = 'Connect to Raindrop.io';
    }
  }
  
  async function checkAuthentication() {
    try {
      // Try to make a test API call
      const response = await sendMessage({ action: 'api-request', endpoint: '/user' });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      isAuthenticated = true;
      authSection.classList.add('hidden');
      mainSection.classList.remove('hidden');
      settingsSection.classList.remove('hidden');
      
      await loadCollections();
      await loadTags();
      await loadSavedState();
      
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
