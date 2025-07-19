// Background service worker for Rain Random Drops extension
const RAINDROP_API_BASE = 'https://api.raindrop.io/rest/v1';
const OAUTH_URL = 'https://raindrop.io/oauth/authorize';
const TOKEN_URL = 'https://raindrop.io/oauth/access_token';

// Load credentials if available
let credentials = null;
try {
  // Try to load hardcoded credentials
  if (typeof CREDENTIALS !== 'undefined') {
    credentials = CREDENTIALS;
  }
} catch (e) {
  console.log('No hardcoded credentials found');
}

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Rain Random Drops extension installed');
  
  // Set default values
  chrome.storage.sync.set({
    selectedCollectionId: '0',
    visitedBookmarks: [],
    randomHistory: [],
    totalRandomized: 0,
    minBookmarkCount: 0,
    selectedTags: []
  });
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'random-bookmark') {
    await pickRandomBookmark();
  }
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'authenticate':
      handleAuthentication()
        .then(sendResponse)
        .catch(error => sendResponse({ error: error.message }));
      return true; // Keep message channel open for async response
      
    case 'api-request':
      makeAPIRequest(request.endpoint, request.method, request.data)
        .then(sendResponse)
        .catch(error => sendResponse({ error: error.message }));
      return true;
      
    case 'pick-random':
      pickRandomBookmark()
        .then(sendResponse)
        .catch(error => sendResponse({ error: error.message }));
      return true;
      
    case 'get-collections':
      getCollections()
        .then(sendResponse)
        .catch(error => sendResponse({ error: error.message }));
      return true;
      
    case 'get-tags':
      getTags()
        .then(sendResponse)
        .catch(error => sendResponse({ error: error.message }));
      return true;
      
    case 'get-bookmarks':
      getBookmarks(request.collectionId, request.tags, request.minCount)
        .then(sendResponse)
        .catch(error => sendResponse({ error: error.message }));
      return true;
  }
});

// OAuth Authentication
async function handleAuthentication() {
  try {
    // Check if we have hardcoded credentials
    if (credentials && credentials.TEST_TOKEN) {
      await chrome.storage.sync.set({ accessToken: credentials.TEST_TOKEN });
      const userInfo = await makeAPIRequest('/user');
      return { 
        success: true, 
        user: userInfo.item,
        method: 'hardcoded'
      };
    }
    
    // Otherwise use OAuth flow
    const authUrl = `${OAUTH_URL}?` + 
      `client_id=${credentials?.CLIENT_ID || 'YOUR_CLIENT_ID'}&` +
      `redirect_uri=${chrome.runtime.getURL('oauth.html')}&` +
      `response_type=code`;
    
    return new Promise((resolve, reject) => {
      chrome.identity.launchWebAuthFlow({
        url: authUrl,
        interactive: true
      }, async (responseUrl) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        
        try {
          const url = new URL(responseUrl);
          const code = url.searchParams.get('code');
          
          if (!code) {
            throw new Error('No authorization code received');
          }
          
          // Exchange code for token
          const tokenResponse = await fetch(TOKEN_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              client_id: credentials?.CLIENT_ID || 'YOUR_CLIENT_ID',
              client_secret: credentials?.CLIENT_SECRET || 'YOUR_CLIENT_SECRET',
              grant_type: 'authorization_code',
              code: code,
              redirect_uri: chrome.runtime.getURL('oauth.html')
            })
          });
          
          const tokenData = await tokenResponse.json();
          
          if (tokenData.access_token) {
            await chrome.storage.sync.set({ accessToken: tokenData.access_token });
            const userInfo = await makeAPIRequest('/user');
            resolve({ 
              success: true, 
              user: userInfo.item,
              method: 'oauth'
            });
          } else {
            throw new Error('Failed to get access token');
          }
        } catch (error) {
          reject(error);
        }
      });
    });
  } catch (error) {
    throw new Error(`Authentication failed: ${error.message}`);
  }
}

// Make API request to Raindrop.io
async function makeAPIRequest(endpoint, method = 'GET', data = null) {
  const storage = await chrome.storage.sync.get(['accessToken']);
  const token = storage.accessToken;
  
  if (!token) {
    throw new Error('No access token available. Please authenticate first.');
  }
  
  const response = await fetch(`${RAINDROP_API_BASE}${endpoint}`, {
    method: method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: data ? JSON.stringify(data) : null
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      // Token expired, clear it
      await chrome.storage.sync.remove(['accessToken']);
      throw new Error('Authentication expired. Please re-authenticate.');
    }
    throw new Error(`API Error ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}

// Get collections with bookmark count filtering
async function getCollections() {
  try {
    const response = await makeAPIRequest('/collections');
    const storage = await chrome.storage.sync.get(['minBookmarkCount']);
    const minCount = storage.minBookmarkCount || 0;
    
    const collections = response.items || [];
    const filteredCollections = collections.filter(collection => 
      collection.count >= minCount
    );
    
    return {
      items: filteredCollections,
      total: filteredCollections.length
    };
  } catch (error) {
    console.error('Error loading collections:', error);
    throw error;
  }
}

// Get available tags
async function getTags() {
  try {
    const response = await makeAPIRequest('/tags');
    const storage = await chrome.storage.sync.get(['minBookmarkCount']);
    const minCount = storage.minBookmarkCount || 0;
    
    const tags = response.items || [];
    const filteredTags = tags.filter(tag => tag.count >= minCount);
    
    return {
      items: filteredTags,
      total: filteredTags.length
    };
  } catch (error) {
    console.error('Error loading tags:', error);
    throw error;
  }
}

// Get bookmarks from collection with filtering
async function getBookmarks(collectionId = '0', tags = [], minCount = 0) {
  try {
    let endpoint = '/raindrops';
    if (collectionId !== '0') {
      endpoint += `/${collectionId}`;
    }
    
    const params = new URLSearchParams({
      perpage: '50'
    });
    
    if (tags && tags.length > 0) {
      params.append('tags', tags.join(','));
    }
    
    const response = await makeAPIRequest(`${endpoint}?${params}`);
    const storage = await chrome.storage.sync.get(['visitedBookmarks']);
    const visitedBookmarks = storage.visitedBookmarks || [];
    
    // Filter out visited bookmarks and apply minimum count filter
    const bookmarks = (response.items || []).filter(bookmark => {
      const isNotVisited = !visitedBookmarks.includes(bookmark._id);
      // For individual bookmarks, we don't have a count property to filter by
      return isNotVisited;
    });
    
    return {
      items: bookmarks,
      total: bookmarks.length,
      totalWithVisited: response.items ? response.items.length : 0
    };
  } catch (error) {
    console.error('Error loading bookmarks:', error);
    throw error;
  }
}

// Pick random bookmark
async function pickRandomBookmark() {
  try {
    const storage = await chrome.storage.sync.get([
      'selectedCollectionId',
      'selectedTags',
      'minBookmarkCount',
      'visitedBookmarks',
      'randomHistory',
      'totalRandomized'
    ]);
    
    const bookmarksData = await getBookmarks(
      storage.selectedCollectionId || '0',
      storage.selectedTags || [],
      storage.minBookmarkCount || 0
    );
    
    if (bookmarksData.items.length === 0) {
      throw new Error('No unvisited bookmarks available!');
    }
    
    const randomIndex = Math.floor(Math.random() * bookmarksData.items.length);
    const bookmark = bookmarksData.items[randomIndex];
    
    // Update history and counter
    const randomHistory = storage.randomHistory || [];
    randomHistory.push(bookmark);
    const totalRandomized = (storage.totalRandomized || 0) + 1;
    
    await chrome.storage.sync.set({
      randomHistory: randomHistory,
      totalRandomized: totalRandomized,
      historyIndex: randomHistory.length - 1
    });
    
    // Open bookmark in new tab
    await chrome.tabs.create({ url: bookmark.link });
    
    // Show popup with current bookmark info
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'show-bookmark-popup',
        bookmark: bookmark
      });
    }
    
    return {
      success: true,
      bookmark: bookmark,
      totalRandomized: totalRandomized
    };
  } catch (error) {
    console.error('Error picking random bookmark:', error);
    throw error;
  }
}
