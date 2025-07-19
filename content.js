// Content script for Rain Random Drops extension
class RainRandomDropsUI {
  constructor() {
    this.widget = null;
    this.isVisible = false;
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };
    
    this.init();
  }
  
  init() {
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'show-bookmark-popup') {
        this.showBookmarkPopup(message.bookmark);
      } else if (message.action === 'toggle-widget') {
        this.toggleWidget();
      }
    });
    
    // Listen for keyboard events
    document.addEventListener('keydown', (e) => {
      if (e.altKey && e.key === 'r') {
        e.preventDefault();
        this.toggleWidget();
      }
      
      if (e.key === 'Escape' && this.isVisible) {
        this.hideWidget();
      }
    });
    
    // Listen for clicks outside widget
    document.addEventListener('click', (e) => {
      if (this.widget && this.isVisible && !this.widget.contains(e.target)) {
        this.hideWidget();
      }
    });
  }
  
  createWidget() {
    if (this.widget) return;
    
    this.widget = document.createElement('div');
    this.widget.id = 'rain-random-drops-widget';
    this.widget.className = 'rain-widget';
    
    this.widget.innerHTML = `
      <div class="rain-widget-header">
        <div class="rain-widget-title">
          <span class="rain-icon">🌧️</span>
          <span>Rain Random Drops</span>
        </div>
        <div class="rain-widget-controls">
          <button id="rain-refresh-btn" title="Refresh Collections">⟳</button>
          <button id="rain-close-btn" title="Close">✕</button>
        </div>
      </div>
      
      <div class="rain-widget-content">
        <div class="rain-auth-section" id="rain-auth-section">
          <div class="rain-status" id="rain-status">Authenticating...</div>
          <button id="rain-auth-btn">Connect to Raindrop.io</button>
        </div>
        
        <div class="rain-main-section" id="rain-main-section" style="display: none;">
          <div class="rain-filters">
            <div class="rain-filter-group">
              <label>Collection:</label>
              <select id="rain-collection-select">
                <option value="0">All Bookmarks</option>
              </select>
            </div>
            
            <div class="rain-filter-group">
              <label>Tags:</label>
              <div class="rain-tags-container">
                <div class="rain-selected-tags" id="rain-selected-tags"></div>
                <input type="text" id="rain-tag-input" placeholder="Add tags..." autocomplete="off">
                <div class="rain-tag-suggestions" id="rain-tag-suggestions"></div>
              </div>
            </div>
            
            <div class="rain-filter-group">
              <label>Min bookmarks:</label>
              <input type="number" id="rain-min-count" min="0" value="0" style="width: 60px;">
            </div>
          </div>
          
          <div class="rain-controls">
            <button id="rain-prev-btn">◀</button>
            <button id="rain-random-btn">🎲 Random</button>
            <button id="rain-next-btn">▶</button>
          </div>
          
          <div class="rain-stats">
            <div class="rain-counter">Randomized: <span id="rain-counter">0</span></div>
            <label class="rain-visited-label">
              <input type="checkbox" id="rain-visited-checkbox">
              <span>Mark as visited</span>
            </label>
          </div>
          
          <div class="rain-status" id="rain-main-status">Ready to pick random bookmark</div>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.widget);
    this.setupEventListeners();
    this.authenticate();
  }
  
  setupEventListeners() {
    // Header controls
    this.widget.querySelector('#rain-close-btn').addEventListener('click', () => {
      this.hideWidget();
    });
    
    this.widget.querySelector('#rain-refresh-btn').addEventListener('click', () => {
      this.refreshCollections();
    });
    
    // Authentication
    this.widget.querySelector('#rain-auth-btn').addEventListener('click', () => {
      this.authenticate();
    });
    
    // Main controls
    this.widget.querySelector('#rain-random-btn').addEventListener('click', () => {
      this.pickRandomBookmark();
    });
    
    this.widget.querySelector('#rain-prev-btn').addEventListener('click', () => {
      this.goToPrevious();
    });
    
    this.widget.querySelector('#rain-next-btn').addEventListener('click', () => {
      this.goToNext();
    });
    
    // Filters
    this.widget.querySelector('#rain-collection-select').addEventListener('change', (e) => {
      this.onCollectionChange(e.target.value);
    });
    
    this.widget.querySelector('#rain-min-count').addEventListener('change', (e) => {
      this.onMinCountChange(parseInt(e.target.value) || 0);
    });
    
    // Tag input
    const tagInput = this.widget.querySelector('#rain-tag-input');
    tagInput.addEventListener('input', (e) => {
      this.onTagInput(e.target.value);
    });
    
    tagInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.addTag(e.target.value.trim());
        e.target.value = '';
      }
    });
    
    // Visited checkbox
    this.widget.querySelector('#rain-visited-checkbox').addEventListener('change', (e) => {
      this.toggleVisited(e.target.checked);
    });
    
    // Make draggable
    this.makeDraggable();
  }
  
  makeDraggable() {
    const header = this.widget.querySelector('.rain-widget-header .rain-widget-title');
    let initialX, initialY;
    
    header.style.cursor = 'move';
    
    header.addEventListener('mousedown', (e) => {
      if (e.target.closest('button')) return;
      
      this.isDragging = true;
      initialX = e.clientX - this.dragOffset.x;
      initialY = e.clientY - this.dragOffset.y;
      
      document.addEventListener('mousemove', this.handleDrag.bind(this));
      document.addEventListener('mouseup', this.handleDragEnd.bind(this));
    });
  }
  
  handleDrag(e) {
    if (!this.isDragging) return;
    
    this.dragOffset.x = e.clientX - initialX;
    this.dragOffset.y = e.clientY - initialY;
    
    this.widget.style.transform = `translate(${this.dragOffset.x}px, ${this.dragOffset.y}px)`;
  }
  
  handleDragEnd() {
    this.isDragging = false;
    document.removeEventListener('mousemove', this.handleDrag);
    document.removeEventListener('mouseup', this.handleDragEnd);
  }
  
  async authenticate() {
    const statusEl = this.widget.querySelector('#rain-status');
    statusEl.textContent = 'Connecting to Raindrop.io...';
    
    try {
      const response = await this.sendMessage({ action: 'authenticate' });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      statusEl.textContent = `Welcome ${response.user.fullName || 'User'}!`;
      
      // Show main section, hide auth section
      this.widget.querySelector('#rain-auth-section').style.display = 'none';
      this.widget.querySelector('#rain-main-section').style.display = 'block';
      
      // Load collections and tags
      await this.loadCollections();
      await this.loadTags();
      
    } catch (error) {
      console.error('Authentication failed:', error);
      statusEl.textContent = `Authentication failed: ${error.message}`;
    }
  }
  
  async loadCollections() {
    try {
      const response = await this.sendMessage({ action: 'get-collections' });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      const select = this.widget.querySelector('#rain-collection-select');
      select.innerHTML = '<option value="0">All Bookmarks</option>';
      
      (response.items || []).forEach(collection => {
        const option = document.createElement('option');
        option.value = collection._id;
        option.textContent = `${collection.title} (${collection.count})`;
        select.appendChild(option);
      });
      
    } catch (error) {
      console.error('Error loading collections:', error);
      this.showStatus(`Error loading collections: ${error.message}`, 'error');
    }
  }
  
  async loadTags() {
    try {
      const response = await this.sendMessage({ action: 'get-tags' });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      this.availableTags = response.items || [];
      
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  }
  
  async refreshCollections() {
    await this.loadCollections();
    await this.loadTags();
    this.showStatus('Collections refreshed!', 'success');
  }
  
  async pickRandomBookmark() {
    const btn = this.widget.querySelector('#rain-random-btn');
    const originalText = btn.textContent;
    btn.textContent = 'Picking...';
    btn.disabled = true;
    
    try {
      const response = await this.sendMessage({ action: 'pick-random' });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      this.widget.querySelector('#rain-counter').textContent = response.totalRandomized;
      this.showStatus(`Opened: ${response.bookmark.title}`, 'success');
      
    } catch (error) {
      console.error('Error picking random bookmark:', error);
      this.showStatus(`Error: ${error.message}`, 'error');
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  }
  
  onTagInput(value) {
    const suggestionsEl = this.widget.querySelector('#rain-tag-suggestions');
    
    if (!value.trim() || !this.availableTags) {
      suggestionsEl.style.display = 'none';
      return;
    }
    
    const filtered = this.availableTags.filter(tag => 
      tag._id.toLowerCase().includes(value.toLowerCase())
    ).slice(0, 5);
    
    if (filtered.length === 0) {
      suggestionsEl.style.display = 'none';
      return;
    }
    
    suggestionsEl.innerHTML = filtered.map(tag => 
      `<div class="rain-tag-suggestion" data-tag="${tag._id}">${tag._id} (${tag.count})</div>`
    ).join('');
    
    suggestionsEl.style.display = 'block';
    
    // Add click handlers
    suggestionsEl.querySelectorAll('.rain-tag-suggestion').forEach(el => {
      el.addEventListener('click', () => {
        this.addTag(el.dataset.tag);
        this.widget.querySelector('#rain-tag-input').value = '';
        suggestionsEl.style.display = 'none';
      });
    });
  }
  
  addTag(tag) {
    if (!tag) return;
    
    const selectedTagsEl = this.widget.querySelector('#rain-selected-tags');
    const existingTags = [...selectedTagsEl.querySelectorAll('.rain-selected-tag')].map(el => el.dataset.tag);
    
    if (existingTags.includes(tag)) return;
    
    const tagEl = document.createElement('span');
    tagEl.className = 'rain-selected-tag';
    tagEl.dataset.tag = tag;
    tagEl.innerHTML = `${tag} <button class="rain-remove-tag">×</button>`;
    
    tagEl.querySelector('.rain-remove-tag').addEventListener('click', () => {
      tagEl.remove();
      this.updateSelectedTags();
    });
    
    selectedTagsEl.appendChild(tagEl);
    this.updateSelectedTags();
  }
  
  updateSelectedTags() {
    const tags = [...this.widget.querySelectorAll('.rain-selected-tag')].map(el => el.dataset.tag);
    chrome.storage.sync.set({ selectedTags: tags });
  }
  
  onCollectionChange(collectionId) {
    chrome.storage.sync.set({ selectedCollectionId: collectionId });
  }
  
  onMinCountChange(minCount) {
    chrome.storage.sync.set({ minBookmarkCount: minCount });
  }
  
  showStatus(message, type = 'info') {
    const statusEl = this.widget.querySelector('#rain-main-status');
    statusEl.textContent = message;
    statusEl.className = `rain-status rain-status-${type}`;
    
    if (type === 'success') {
      setTimeout(() => {
        statusEl.className = 'rain-status';
      }, 3000);
    }
  }
  
  showBookmarkPopup(bookmark) {
    // Create temporary notification for picked bookmark
    const popup = document.createElement('div');
    popup.className = 'rain-bookmark-popup';
    popup.innerHTML = `
      <div class="rain-popup-content">
        <strong>Random Bookmark Picked:</strong><br>
        <span>${bookmark.title}</span>
      </div>
    `;
    
    document.body.appendChild(popup);
    
    setTimeout(() => {
      popup.remove();
    }, 3000);
  }
  
  toggleWidget() {
    if (this.isVisible) {
      this.hideWidget();
    } else {
      this.showWidget();
    }
  }
  
  showWidget() {
    if (!this.widget) {
      this.createWidget();
    }
    
    this.widget.style.display = 'block';
    this.isVisible = true;
    
    // Load saved state
    chrome.storage.sync.get([
      'selectedCollectionId',
      'minBookmarkCount',
      'selectedTags',
      'totalRandomized'
    ]).then(data => {
      if (data.selectedCollectionId) {
        const select = this.widget.querySelector('#rain-collection-select');
        if (select) select.value = data.selectedCollectionId;
      }
      
      if (data.minBookmarkCount) {
        const input = this.widget.querySelector('#rain-min-count');
        if (input) input.value = data.minBookmarkCount;
      }
      
      if (data.totalRandomized) {
        const counter = this.widget.querySelector('#rain-counter');
        if (counter) counter.textContent = data.totalRandomized;
      }
      
      if (data.selectedTags) {
        const selectedTagsEl = this.widget.querySelector('#rain-selected-tags');
        if (selectedTagsEl) {
          selectedTagsEl.innerHTML = '';
          data.selectedTags.forEach(tag => this.addTag(tag));
        }
      }
    });
  }
  
  hideWidget() {
    if (this.widget) {
      this.widget.style.display = 'none';
    }
    this.isVisible = false;
  }
  
  sendMessage(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, resolve);
    });
  }
  
  // Placeholder methods for history navigation
  async goToPrevious() {
    this.showStatus('Previous functionality not implemented yet', 'info');
  }
  
  async goToNext() {
    this.showStatus('Next functionality not implemented yet', 'info');
  }
  
  async toggleVisited(checked) {
    this.showStatus('Visit tracking functionality not implemented yet', 'info');
  }
}

// Initialize the UI
const rainRandomDropsUI = new RainRandomDropsUI();
