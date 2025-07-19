// Background service worker for Rain Random Drops extension
const RAINDROP_API_BASE = 'https://api.raindrop.io/rest/v1';
const OAUTH_URL = 'https://raindrop.io/oauth/authorize';
const TOKEN_URL = 'https://raindrop.io/oauth/access_token';

// Constants
const AUTH_TIMEOUT = 20000; // 20 seconds timeout for auth
const API_TIMEOUT = 10000; // 10 seconds timeout for API calls

// Hardcoded credentials (updated with correct values)
const CREDENTIALS = {
  CLIENT_ID: '687aebc8e9b0f84f25bed150',
  CLIENT_SECRET: '99559f49-6a5a-4dc3-a059-a0a6a339fb5e',
  TEST_TOKEN: 'eb69dab6-3b23-4cad-b3de-e436c66fc338'
};

// Load credentials if available
let credentials = CREDENTIALS;
let authInProgress = false;

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Rain Random Drops extension installed');
  
  // Set default values
  chrome.storage.sync.set({
    selectedCollectionId: '0',
    visitedBookmarks: [],
    watchedBookmarks: [], // New: watched bookmarks
    randomHistory: [],
    totalRandomized: 0,
    minBookmarkCount: 0,
    hideCollectionsBelowCount: 0, // New: hide collections filter
    selectedTags: [],
    authInProgress: false
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
      
    case 'test-token':
      testToken(request.token)
        .then(sendResponse)
        .catch(error => sendResponse({ error: error.message }));
      return true;
      
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
      
    case 'pick-random-local':
      pickRandomLocalBookmark()
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
      
    case 'mark-watched':
      markBookmarkWatched(request.bookmarkId, request.watched)
        .then(sendResponse)
        .catch(error => sendResponse({ error: error.message }));
      return true;
  }
});

// OAuth Authentication
async function handleAuthentication() {
  try {
    // Check if auth is already in progress
    if (authInProgress) {
      throw new Error('Authentication already in progress. Please wait.');
    }
    
    authInProgress = true;
    await chrome.storage.sync.set({ authInProgress: true });
    
    // Set timeout to prevent infinite auth loops
    const authTimeoutId = setTimeout(() => {
      authInProgress = false;
      chrome.storage.sync.set({ authInProgress: false });
      throw new Error('Authentication timeout after 20 seconds');
    }, AUTH_TIMEOUT);
    
    try {
      // First, always try the test token if available
      if (credentials && credentials.TEST_TOKEN) {
        console.log('Trying test token authentication...');
        console.log('Using test token:', credentials.TEST_TOKEN.substring(0, 8) + '...');
        try {
          // Clear any existing token first
          await chrome.storage.sync.remove(['accessToken']);
          await chrome.storage.sync.set({ accessToken: credentials.TEST_TOKEN });
          const userInfo = await makeAPIRequest('/user');
          console.log('Test token authentication successful:', userInfo);
          if (!userInfo || !userInfo.item || !userInfo.item.fullName) {
            throw new Error('Token test failed: API did not return valid user info.');
          }
          clearTimeout(authTimeoutId);
          return { 
            success: true, 
            user: userInfo.item,
            method: 'hardcoded'
          };
        } catch (testTokenError) {
          console.log('Test token failed, trying OAuth:', testTokenError.message);
          // Remove invalid token
          await chrome.storage.sync.remove(['accessToken']);
        }
      }
      
    // Otherwise use OAuth flow
    let redirectUri;
    try {
      // Try using oauth.html as redirect URI first
      redirectUri = chrome.runtime.getURL('oauth.html');
    } catch (error) {
      // Fallback to identity redirect URI
      redirectUri = chrome.identity.getRedirectURL();
    }
    
    const authUrl = `${OAUTH_URL}?` + 
      `client_id=${credentials.CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code`;
    
    console.log('OAuth URL:', authUrl);
    console.log('Redirect URI:', redirectUri);      return new Promise((resolve, reject) => {
        chrome.identity.launchWebAuthFlow({
          url: authUrl,
          interactive: true
        }, async (responseUrl) => {
          console.log('OAuth callback URL:', responseUrl);
          
          if (chrome.runtime.lastError) {
            console.error('OAuth error:', chrome.runtime.lastError);
            clearTimeout(authTimeoutId);
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          
          if (!responseUrl) {
            console.error('No response URL received');
            clearTimeout(authTimeoutId);
            reject(new Error('No response URL received from OAuth'));
            return;
          }
          
          try {
            const url = new URL(responseUrl);
            const code = url.searchParams.get('code');
            const error = url.searchParams.get('error');
            
            console.log('OAuth response - code:', code, 'error:', error);
            
            if (error) {
              clearTimeout(authTimeoutId);
              throw new Error(`OAuth error: ${error}`);
            }
            
            if (!code) {
              clearTimeout(authTimeoutId);
              throw new Error('No authorization code received from Raindrop.io');
            }
            
            // Exchange code for token
            console.log('Exchanging code for token...');
            const tokenResponse = await fetch(TOKEN_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({
                client_id: credentials.CLIENT_ID,
                client_secret: credentials.CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: redirectUri
              })
            });
            
            console.log('Token response status:', tokenResponse.status);
            const tokenData = await tokenResponse.json();
            console.log('Token data:', tokenData);
            console.log('Using CLIENT_ID:', credentials.CLIENT_ID);
            console.log('Using CLIENT_SECRET:', credentials.CLIENT_SECRET.substring(0, 8) + '...');
            
            if (tokenData.access_token) {
              console.log('Saving access token to storage...');
              await chrome.storage.sync.set({ accessToken: tokenData.access_token });
              console.log('Token saved, verifying with API...');
              
              const userInfo = await makeAPIRequest('/user');
              console.log('OAuth authentication successful:', userInfo);
              if (!userInfo || !userInfo.item || !userInfo.item.fullName) {
                clearTimeout(authTimeoutId);
                reject(new Error('OAuth succeeded, but API did not return valid user info.'));
                return;
              }
              clearTimeout(authTimeoutId);
              resolve({ 
                success: true, 
                user: userInfo.item,
                method: 'oauth'
              });
            } else {
              console.error('Token exchange failed:', tokenData);
              clearTimeout(authTimeoutId);
              throw new Error(`Failed to get access token: ${tokenData.error || 'Unknown error'}`);
            }
          } catch (error) {
            clearTimeout(authTimeoutId);
            reject(error);
          }
        });
      });
    } finally {
      clearTimeout(authTimeoutId);
    }
  } catch (error) {
    throw new Error(`Authentication failed: ${error.message}`);
  } finally {
    authInProgress = false;
    await chrome.storage.sync.set({ authInProgress: false });
  }
}

// Test token function
async function testToken(token) {
  try {
    if (!token) {
      throw new Error('No token provided');
    }
    
    // Test the token by making a user info request
    const response = await fetch(`${RAINDROP_API_BASE}/user`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid token - authentication failed');
      }
      throw new Error(`API Error ${response.status}: ${response.statusText}`);
    }
    
    const userData = await response.json();
    if (!userData || !userData.item || !userData.item.fullName) {
      throw new Error('Token test failed: API did not return valid user info.');
    }
    
    // Save valid token
    await chrome.storage.sync.set({ accessToken: token });
    
    return {
      success: true,
      user: userData.item,
      method: 'manual'
    };
  } catch (error) {
    throw new Error(`Token test failed: ${error.message}`);
  }
}

// Get collections with bookmark count filtering
async function getCollections() {
  try {
    const storage = await chrome.storage.sync.get(['accessToken', 'hideCollectionsBelowCount', 'minBookmarkCount']);
    
    if (!storage.accessToken) {
      // Zwróć lokalne zakładki Chrome
      return await getBrowserBookmarkFolders();
    }
    
    const response = await makeAPIRequest('/collections');
    const minCount = storage.minBookmarkCount || 0;
    const hideBelow = storage.hideCollectionsBelowCount || 0;
    
    const collections = response.items || [];
    
    // Apply filters
    let filteredCollections = collections.filter(collection => {
      if (minCount > 0 && collection.count < minCount) return false;
      if (hideBelow > 0 && collection.count < hideBelow) return false;
      return true;
    });
    
    // Sort by count descending and then by title
    filteredCollections.sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return a.title.localeCompare(b.title);
    });
    
    // Add special "Watched" collection if there are watched bookmarks
    const watchedBookmarks = storage.watchedBookmarks || [];
    if (watchedBookmarks.length > 0) {
      filteredCollections.unshift({
        _id: 'watched',
        title: '👁️ Watched',
        count: watchedBookmarks.length,
        color: '#ff6b35'
      });
    }
    
    return {
      items: filteredCollections,
      total: filteredCollections.length,
      unfilteredTotal: collections.length
    };
  } catch (error) {
    console.error('Error loading collections:', error);
    throw error;
  }
}

// Get browser bookmark folders as collections
async function getBrowserBookmarkFolders() {
  return new Promise((resolve, reject) => {
    chrome.bookmarks.getTree((bookmarkTreeNodes) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      
      const folders = [];
      
      function extractFolders(nodes, parentTitle = '') {
        nodes.forEach(node => {
          if (!node.url) { // It's a folder
            const folderName = node.title || 'Unnamed Folder';
            let bookmarkCount = 0;
            
            function countBookmarks(folderNode) {
              if (folderNode.children) {
                folderNode.children.forEach(child => {
                  if (child.url) {
                    bookmarkCount++;
                  } else {
                    countBookmarks(child);
                  }
                });
              }
            }
            
            countBookmarks(node);
            
            if (bookmarkCount > 0) {
              folders.push({
                _id: `local_${node.id}`,
                title: `📁 ${folderName}`,
                count: bookmarkCount,
                color: '#4CAF50',
                type: 'local'
              });
            }
            
            if (node.children) {
              extractFolders(node.children, folderName);
            }
          }
        });
      }
      
      extractFolders(bookmarkTreeNodes);
      
      // Add "All Local Bookmarks" option
      const totalCount = folders.reduce((sum, folder) => sum + folder.count, 0);
      if (totalCount > 0) {
        folders.unshift({
          _id: 'local_all',
          title: '📚 All Local Bookmarks',
          count: totalCount,
          color: '#2196F3',
          type: 'local'
        });
      }
      
      resolve({
        items: folders,
        total: folders.length
      });
    });
  });
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
    const storage = await chrome.storage.sync.get(['visitedBookmarks', 'watchedBookmarks']);
    const visitedBookmarks = storage.visitedBookmarks || [];
    const watchedBookmarks = storage.watchedBookmarks || [];
    
    // Handle special "watched" collection
    if (collectionId === 'watched') {
      if (watchedBookmarks.length === 0) {
        return {
          items: [],
          total: 0,
          totalWithVisited: 0
        };
      }
      
      // Fetch watched bookmarks
      const watchedBookmarkDetails = [];
      for (const bookmarkId of watchedBookmarks) {
        try {
          const bookmark = await makeAPIRequest(`/raindrop/${bookmarkId}`);
          if (bookmark.item) {
            watchedBookmarkDetails.push(bookmark.item);
          }
        } catch (error) {
          console.warn(`Failed to fetch watched bookmark ${bookmarkId}:`, error);
        }
      }
      
      return {
        items: watchedBookmarkDetails,
        total: watchedBookmarkDetails.length,
        totalWithVisited: watchedBookmarkDetails.length
      };
    }
    
    // Handle local bookmarks
    if (collectionId && collectionId.startsWith('local_')) {
      return await getLocalBookmarks(collectionId);
    }
    
    let endpoint = '/raindrops';
    // For "All Bookmarks", use the special collection ID 0
    if (collectionId && collectionId !== '0') {
      endpoint += `/${collectionId}`;
    } else {
      endpoint += '/0'; // Use collection ID 0 for "All Bookmarks"
    }
    const params = new URLSearchParams({
      perpage: '50'
    });
    if (tags && tags.length > 0) {
      params.append('tags', tags.join(','));
    }
    console.log('Fetching bookmarks from:', `${endpoint}?${params}`);
    const response = await makeAPIRequest(`${endpoint}?${params}`);
    
    // Filter out visited and watched bookmarks
    const bookmarks = (response.items || []).filter(bookmark => {
      const isNotVisited = !visitedBookmarks.includes(bookmark._id);
      const isNotWatched = !watchedBookmarks.includes(bookmark._id);
      return isNotVisited && isNotWatched;
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

// Get local bookmarks from browser
async function getLocalBookmarks(collectionId) {
  return new Promise((resolve, reject) => {
    chrome.bookmarks.getTree((bookmarkTreeNodes) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      
      const allBookmarks = [];
      
      function extractBookmarks(nodes, targetFolderId = null) {
        nodes.forEach(node => {
          if (node.url) {
            if (!targetFolderId || node.parentId === targetFolderId) {
              allBookmarks.push({
                _id: `local_${node.id}`,
                title: node.title,
                link: node.url,
                collection: { title: 'Local Bookmarks' },
                type: 'local'
              });
            }
          }
          if (node.children) {
            extractBookmarks(node.children, targetFolderId);
          }
        });
      }
      
      if (collectionId === 'local_all') {
        extractBookmarks(bookmarkTreeNodes);
      } else {
        const folderId = collectionId.replace('local_', '');
        extractBookmarks(bookmarkTreeNodes, folderId);
      }
      
      resolve({
        items: allBookmarks,
        total: allBookmarks.length,
        totalWithVisited: allBookmarks.length
      });
    });
  });
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

// Pick random local bookmark from browser bookmarks
async function pickRandomLocalBookmark() {
  try {
    return new Promise((resolve, reject) => {
      chrome.bookmarks.getTree((bookmarkTreeNodes) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        
        const allBookmarks = [];
        
        function extractBookmarks(nodes) {
          nodes.forEach(node => {
            if (node.url) {
              allBookmarks.push({
                id: node.id,
                title: node.title,
                url: node.url,
                parentTitle: node.parentId ? 'Local Bookmarks' : 'Bookmarks Bar'
              });
            }
            if (node.children) {
              extractBookmarks(node.children);
            }
          });
        }
        
        extractBookmarks(bookmarkTreeNodes);
        
        if (allBookmarks.length === 0) {
          reject(new Error('No local bookmarks found!'));
          return;
        }
        
        const randomIndex = Math.floor(Math.random() * allBookmarks.length);
        const bookmark = allBookmarks[randomIndex];
        
        // Open bookmark in new tab
        chrome.tabs.create({ url: bookmark.url }).then(tab => {
          resolve({
            success: true,
            bookmark: {
              _id: bookmark.id,
              title: bookmark.title,
              link: bookmark.url,
              collection: { title: bookmark.parentTitle },
              type: 'local'
            }
          });
        }).catch(error => {
          reject(error);
        });
      });
    });
  } catch (error) {
    console.error('Error picking random local bookmark:', error);
    throw error;
  }
}

// Mark bookmark as watched/unwatched
async function markBookmarkWatched(bookmarkId, watched) {
  try {
    const storage = await chrome.storage.sync.get(['watchedBookmarks']);
    let watchedBookmarks = storage.watchedBookmarks || [];
    
    if (watched) {
      if (!watchedBookmarks.includes(bookmarkId)) {
        watchedBookmarks.push(bookmarkId);
      }
    } else {
      watchedBookmarks = watchedBookmarks.filter(id => id !== bookmarkId);
    }
    
    await chrome.storage.sync.set({ watchedBookmarks });
    
    return {
      success: true,
      watchedBookmarks: watchedBookmarks
    };
  } catch (error) {
    console.error('Error marking bookmark as watched:', error);
    throw error;
  }
}

// Enhanced API request function with timeout and better error handling
async function makeAPIRequest(endpoint, method = 'GET', data = null) {
  try {
    const storage = await chrome.storage.sync.get(['accessToken']);
    const token = storage.accessToken;
    
    console.log('Making API request to:', `${RAINDROP_API_BASE}${endpoint}`);
    console.log('Token available:', token ? 'YES' : 'NO');
    
    if (!token) {
      throw new Error('No access token found. Please authenticate first.');
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
    
    const response = await fetch(`${RAINDROP_API_BASE}${endpoint}`, {
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: data ? JSON.stringify(data) : null,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    console.log('API Response status:', response.status);
    
    if (response.status === 401) {
      // Token expired, clear it
      await chrome.storage.sync.remove(['accessToken']);
      throw new Error('Authentication expired. Please login again.');
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }
    
    const responseData = await response.json();
    console.log('API Response data:', responseData);
    return responseData;
    
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('API request timed out. Please try again.');
    }
    console.error('API request failed:', error);
    throw error;
  }
}
