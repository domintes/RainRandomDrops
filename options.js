// Options page script for Rain Random Drops extension
document.addEventListener('DOMContentLoaded', async function() {
  // Get DOM elements
  const statusMessage = document.getElementById('status-message');
  
  // Statistics elements
  const totalRandomizedEl = document.getElementById('total-randomized');
  const totalVisitedEl = document.getElementById('total-visited');
  const totalCollectionsEl = document.getElementById('total-collections');
  const availableBookmarksEl = document.getElementById('available-bookmarks');
  
  // Settings elements
  const defaultCollectionEl = document.getElementById('default-collection');
  const minBookmarkCountEl = document.getElementById('min-bookmark-count');
  const autoMarkVisitedEl = document.getElementById('auto-mark-visited');
  const showNotificationEl = document.getElementById('show-notification');
  const widgetPositionEl = document.getElementById('widget-position');
  const widgetAutoHideEl = document.getElementById('widget-auto-hide');
  const darkThemeEl = document.getElementById('dark-theme');
  
  // Action buttons
  const saveBtn = document.getElementById('save-btn');
  const resetBtn = document.getElementById('reset-btn');
  const exportDataBtn = document.getElementById('export-data-btn');
  const importDataBtn = document.getElementById('import-data-btn');
  const importFile = document.getElementById('import-file');
  const clearVisitedBtn = document.getElementById('clear-visited-btn');
  const clearHistoryBtn = document.getElementById('clear-history-btn');
  const resetAllBtn = document.getElementById('reset-all-btn');
  const disconnectBtn = document.getElementById('disconnect-btn');
  
  // Default settings
  const defaultSettings = {
    selectedCollectionId: '0',
    minBookmarkCount: 0,
    autoMarkVisited: false,
    showNotification: true,
    widgetPosition: 'top-right',
    widgetAutoHide: false,
    darkTheme: false
  };
  
  // Initialize
  await init();
  
  async function init() {
    try {
      await loadStatistics();
      await loadCollections();
      await loadSettings();
      setupEventListeners();
    } catch (error) {
      console.error('Initialization failed:', error);
      showStatus('Initialization failed: ' + error.message, 'error');
    }
  }
  
  function setupEventListeners() {
    saveBtn.addEventListener('click', saveSettings);
    resetBtn.addEventListener('click', resetToDefaults);
    exportDataBtn.addEventListener('click', exportData);
    importDataBtn.addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', importData);
    clearVisitedBtn.addEventListener('click', clearVisitedBookmarks);
    clearHistoryBtn.addEventListener('click', clearHistory);
    resetAllBtn.addEventListener('click', resetAllData);
    disconnectBtn.addEventListener('click', disconnectAccount);
  }
  
  async function loadStatistics() {
    try {
      const data = await chrome.storage.sync.get([
        'totalRandomized',
        'visitedBookmarks',
        'randomHistory'
      ]);
      
      totalRandomizedEl.textContent = data.totalRandomized || 0;
      totalVisitedEl.textContent = (data.visitedBookmarks || []).length;
      
      // Try to get collections and bookmarks count
      try {
        const collectionsResponse = await sendMessage({ action: 'get-collections' });
        if (!collectionsResponse.error) {
          totalCollectionsEl.textContent = (collectionsResponse.items || []).length;
        }
        
        const bookmarksResponse = await sendMessage({ 
          action: 'get-bookmarks',
          collectionId: '0',
          tags: [],
          minCount: 0
        });
        if (!bookmarksResponse.error) {
          availableBookmarksEl.textContent = bookmarksResponse.total || 0;
        }
      } catch (error) {
        console.log('Could not load collection/bookmark stats:', error.message);
      }
      
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  }
  
  async function loadCollections() {
    try {
      const response = await sendMessage({ action: 'get-collections' });
      
      if (response.error) {
        console.log('Could not load collections:', response.error);
        return;
      }
      
      defaultCollectionEl.innerHTML = '<option value="0">All Bookmarks</option>';
      
      (response.items || []).forEach(collection => {
        const option = document.createElement('option');
        option.value = collection._id;
        option.textContent = `${collection.title} (${collection.count})`;
        defaultCollectionEl.appendChild(option);
      });
      
    } catch (error) {
      console.error('Error loading collections:', error);
    }
  }
  
  async function loadSettings() {
    try {
      const data = await chrome.storage.sync.get([
        'selectedCollectionId',
        'minBookmarkCount',
        'autoMarkVisited',
        'showNotification',
        'widgetPosition',
        'widgetAutoHide',
        'darkTheme'
      ]);
      
      // Apply settings to UI
      defaultCollectionEl.value = data.selectedCollectionId || defaultSettings.selectedCollectionId;
      minBookmarkCountEl.value = data.minBookmarkCount || defaultSettings.minBookmarkCount;
      autoMarkVisitedEl.checked = data.autoMarkVisited || defaultSettings.autoMarkVisited;
      showNotificationEl.checked = data.showNotification !== undefined ? data.showNotification : defaultSettings.showNotification;
      widgetPositionEl.value = data.widgetPosition || defaultSettings.widgetPosition;
      widgetAutoHideEl.checked = data.widgetAutoHide || defaultSettings.widgetAutoHide;
      darkThemeEl.checked = data.darkTheme || defaultSettings.darkTheme;
      
    } catch (error) {
      console.error('Error loading settings:', error);
      showStatus('Error loading settings: ' + error.message, 'error');
    }
  }
  
  async function saveSettings() {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    
    try {
      const settings = {
        selectedCollectionId: defaultCollectionEl.value,
        minBookmarkCount: parseInt(minBookmarkCountEl.value) || 0,
        autoMarkVisited: autoMarkVisitedEl.checked,
        showNotification: showNotificationEl.checked,
        widgetPosition: widgetPositionEl.value,
        widgetAutoHide: widgetAutoHideEl.checked,
        darkTheme: darkThemeEl.checked
      };
      
      await chrome.storage.sync.set(settings);
      showStatus('Settings saved successfully!', 'success');
      
    } catch (error) {
      console.error('Error saving settings:', error);
      showStatus('Error saving settings: ' + error.message, 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Settings';
    }
  }
  
  async function resetToDefaults() {
    if (!confirm('Are you sure you want to reset all settings to defaults?')) {
      return;
    }
    
    try {
      await chrome.storage.sync.set(defaultSettings);
      await loadSettings();
      showStatus('Settings reset to defaults!', 'success');
    } catch (error) {
      console.error('Error resetting settings:', error);
      showStatus('Error resetting settings: ' + error.message, 'error');
    }
  }
  
  async function exportData() {
    exportDataBtn.disabled = true;
    exportDataBtn.textContent = 'Exporting...';
    
    try {
      const data = await chrome.storage.sync.get();
      
      const exportData = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        data: data
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rain-random-drops-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showStatus('Data exported successfully!', 'success');
      
    } catch (error) {
      console.error('Error exporting data:', error);
      showStatus('Error exporting data: ' + error.message, 'error');
    } finally {
      exportDataBtn.disabled = false;
      exportDataBtn.textContent = 'Export Data';
    }
  }
  
  async function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const importData = JSON.parse(text);
      
      if (!importData.data) {
        throw new Error('Invalid backup file format');
      }
      
      if (!confirm('This will overwrite all current data. Are you sure?')) {
        return;
      }
      
      await chrome.storage.sync.clear();
      await chrome.storage.sync.set(importData.data);
      
      await loadStatistics();
      await loadSettings();
      
      showStatus('Data imported successfully!', 'success');
      
    } catch (error) {
      console.error('Error importing data:', error);
      showStatus('Error importing data: ' + error.message, 'error');
    } finally {
      event.target.value = ''; // Reset file input
    }
  }
  
  async function clearVisitedBookmarks() {
    if (!confirm('Are you sure you want to clear all visited bookmark records?')) {
      return;
    }
    
    try {
      await chrome.storage.sync.set({ visitedBookmarks: [] });
      await loadStatistics();
      showStatus('Visited bookmarks cleared!', 'success');
    } catch (error) {
      console.error('Error clearing visited bookmarks:', error);
      showStatus('Error clearing visited bookmarks: ' + error.message, 'error');
    }
  }
  
  async function clearHistory() {
    if (!confirm('Are you sure you want to clear all randomization history?')) {
      return;
    }
    
    try {
      await chrome.storage.sync.set({ 
        randomHistory: [],
        historyIndex: -1
      });
      await loadStatistics();
      showStatus('History cleared!', 'success');
    } catch (error) {
      console.error('Error clearing history:', error);
      showStatus('Error clearing history: ' + error.message, 'error');
    }
  }
  
  async function resetAllData() {
    const confirmation = prompt(
      'This will delete ALL extension data permanently. Type "RESET" to confirm:'
    );
    
    if (confirmation !== 'RESET') {
      return;
    }
    
    try {
      await chrome.storage.sync.clear();
      await chrome.storage.sync.set(defaultSettings);
      await loadStatistics();
      await loadSettings();
      showStatus('All data has been reset!', 'success');
    } catch (error) {
      console.error('Error resetting all data:', error);
      showStatus('Error resetting all data: ' + error.message, 'error');
    }
  }
  
  async function disconnectAccount() {
    if (!confirm('Are you sure you want to disconnect your Raindrop.io account?')) {
      return;
    }
    
    try {
      await chrome.storage.sync.remove(['accessToken']);
      showStatus('Account disconnected! You will need to re-authenticate.', 'info');
    } catch (error) {
      console.error('Error disconnecting account:', error);
      showStatus('Error disconnecting account: ' + error.message, 'error');
    }
  }
  
  function showStatus(message, type = 'info') {
    statusMessage.textContent = message;
    statusMessage.className = `status ${type}`;
    statusMessage.classList.remove('hidden');
    
    // Auto-hide success messages
    if (type === 'success') {
      setTimeout(() => {
        statusMessage.classList.add('hidden');
      }, 5000);
    }
  }
  
  function sendMessage(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, resolve);
    });
  }
});
