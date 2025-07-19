# 🌧️ Rain Random Drops

**by Domintes**

A powerful Chrome extension for randomly selecting bookmarks from your Raindrop.io collections with advanced filtering and tagging capabilities.

## ✨ Features

### Core Functionality
- **Random Bookmark Selection** - Pick random bookmarks from your Raindrop.io collections
- **OAuth Authentication** - Secure authentication with Raindrop.io (no manual token required)
- **Advanced Filtering** - Filter by collections, tags, and minimum bookmark counts
- **Visit Tracking** - Mark bookmarks as visited and exclude them from future selections
- **Navigation History** - Browse through previously randomized bookmarks

### Smart Filtering
- **Collection Selection** - Choose specific collections or browse all bookmarks
- **Tag-based Filtering** - Add multiple tags with autocomplete suggestions
- **Minimum Count Filter** - Hide collections/tags with fewer bookmarks than specified
- **Nested Collections Support** - Full support for Raindrop.io's collection hierarchy

### User Interface
- **Floating Widget** - Draggable overlay that appears on any webpage
- **Extension Popup** - Clean popup interface accessible from toolbar
- **Options Page** - Comprehensive settings and data management
- **Responsive Design** - Works on all screen sizes

### Keyboard Shortcuts
- **Alt + R** - Pick random bookmark from current filters
- **Ctrl + Shift + R** - Open extension popup
- **Escape** - Close widget/popup
- **Click outside** - Auto-close widget

### Data Management
- **Persistent Settings** - All preferences saved and synced across devices
- **Export/Import** - Backup and restore your data
- **Statistics Tracking** - Monitor your randomization activity
- **Data Reset Options** - Clear visited bookmarks, history, or all data

## 🚀 Installation

### Method 1: Load as Developer Extension

1. **Clone/Download** this repository
2. **Enable Developer Mode** in Chrome:
   - Go to `chrome://extensions/`
   - Toggle "Developer mode" on (top right)
3. **Load Extension**:
   - Click "Load unpacked"
   - Select the `RainRandomDrops` folder
4. **Setup Authentication**:
   - Click the extension icon
   - Click "Connect to Raindrop.io"
   - Complete OAuth authentication

### Method 2: Hardcoded Credentials (Private Use)

If you have the `credentials.js` file with your API keys:

1. Ensure `credentials.js` is present in the root directory
2. The extension will automatically use the hardcoded test token
3. No manual authentication required

## ⚙️ Configuration

### First Setup

1. **Install Extension** (see installation above)
2. **Authenticate** with your Raindrop.io account
3. **Configure Filters** in the popup or options page:
   - Select default collection
   - Add preferred tags
   - Set minimum bookmark count filter
4. **Customize Interface** in options page:
   - Widget position
   - Auto-hide behavior
   - Theme preferences

### Advanced Settings

Access the options page via:
- Right-click extension icon → "Options"
- Or visit `chrome-extension://[extension-id]/options.html`

Options include:
- **Filter Settings** - Default collection, minimum counts, auto-visit marking
- **Interface Settings** - Widget position, auto-hide, dark theme
- **Data Management** - Export/import, clear data, reset settings
- **Account Management** - Disconnect and reconnect

## 🎯 Usage

### Quick Random Pick
1. **Keyboard Shortcut**: Press `Alt + R` on any webpage
2. **Extension Icon**: Click toolbar icon and click "🎲 Random"
3. **Widget**: The floating widget will appear with the randomized bookmark

### Using Filters
1. **Select Collection**: Choose from dropdown (All Bookmarks, or specific collections)
2. **Add Tags**: Type in tag field, select from suggestions, press Enter to add
3. **Remove Tags**: Click × on any selected tag
4. **Set Minimum Count**: Hide collections/tags with few bookmarks
5. **Apply Filters**: Click "Apply Filters" or pick random to use current filters

### Managing Visits
1. **Auto-Marking**: Enable in options to automatically mark opened bookmarks as visited
2. **Manual Marking**: Check "Mark as visited" checkbox in widget
3. **Clear Visited**: Use options page to clear all visited bookmark records

### Navigation
1. **History**: Use ◀ Previous and Next ▶ buttons to navigate through randomization history
2. **Statistics**: View total randomized count and other stats in options page

## 🔧 Development

### Project Structure
```
RainRandomDrops/
├── manifest.json          # Extension manifest (v3)
├── background.js          # Service worker (API calls, shortcuts)
├── content.js            # Content script (UI overlay)
├── styles.css            # Styling for content script
├── popup.html            # Extension popup interface
├── popup.js              # Popup functionality
├── options.html          # Options page
├── options.js            # Options page functionality
├── oauth.html            # OAuth callback page
├── credentials.js        # OAuth credentials (git-ignored)
├── icons/                # Extension icons
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md             # This file
```

### Key Technologies
- **Manifest V3** - Modern Chrome extension architecture
- **Chrome Extension APIs** - storage, identity, commands, tabs
- **Raindrop.io API v1** - REST API for bookmark data
- **OAuth 2.0** - Secure authentication flow
- **Modern JavaScript** - ES6+ features, async/await
- **CSS3** - Responsive design, animations

### API Integration
The extension uses the Raindrop.io REST API v1:
- **Authentication**: OAuth 2.0 with hardcoded fallback
- **Collections**: `/collections` endpoint
- **Bookmarks**: `/raindrops` endpoint with filtering
- **Tags**: `/tags` endpoint for autocomplete
- **User Info**: `/user` endpoint for profile data

### Storage Schema
Chrome storage (sync) contains:
```javascript
{
  accessToken: "string",           // OAuth access token
  selectedCollectionId: "string",  // Current collection ID
  selectedTags: ["string"],        // Array of selected tags
  minBookmarkCount: "number",      // Minimum count filter
  visitedBookmarks: ["string"],    // Array of visited bookmark IDs
  randomHistory: [{}],             // Array of randomized bookmarks
  historyIndex: "number",          // Current position in history
  totalRandomized: "number",       // Total count of randomized bookmarks
  // ... other settings
}
```

## 🔐 Security & Privacy

### Authentication
- Uses OAuth 2.0 for secure authentication
- Access tokens stored locally in Chrome sync storage
- No credentials stored on external servers
- Supports hardcoded credentials for private development

### Permissions
- **Storage** - Save preferences and data
- **Active Tab** - Access current tab for widget injection
- **Identity** - OAuth authentication
- **Host Permissions** - Access Raindrop.io API

### Data Privacy
- All data stored locally in Chrome
- No analytics or tracking
- No data sent to third parties (except Raindrop.io API)
- Export/import for data portability

## 🛠️ Troubleshooting

### Common Issues

**Authentication Failed**
- Check internet connection
- Ensure Raindrop.io account is active
- Try disconnecting and reconnecting in options page

**Widget Not Appearing**
- Check if content script is blocked by page CSP
- Try refreshing the page
- Check browser console for errors

**Bookmarks Not Loading**
- Verify authentication status
- Check collection permissions on Raindrop.io
- Ensure collections contain bookmarks

**Filters Not Working**
- Apply filters after making changes
- Check minimum count settings
- Verify tags exist in selected collection

### Debug Mode
1. Open Chrome DevTools (`F12`)
2. Check Console for error messages
3. Go to `chrome://extensions/`
4. Click "background page" for background script logs
5. Check storage in DevTools → Application → Storage

### Reset Extension
1. Go to options page
2. Use "Reset All Data" (type "RESET" to confirm)
3. Or remove and reinstall extension

## 📝 Changelog

### Version 1.0.0 (Initial Release)
- OAuth authentication with Raindrop.io
- Random bookmark selection with filtering
- Collection and tag-based filtering
- Keyboard shortcuts (Alt+R, Ctrl+Shift+R)
- Floating widget with drag functionality
- Visit tracking and history navigation
- Comprehensive options page
- Data export/import functionality
- Responsive design for all screen sizes

## 🤝 Contributing

This is a personal project, but suggestions and feedback are welcome:

1. **Issues** - Report bugs or request features
2. **Code Reviews** - Feedback on code structure and best practices
3. **Testing** - Help test on different systems and configurations

## 📄 License

This project is for personal use. The code is provided as-is for educational and reference purposes.

## 🔗 Links

- **Raindrop.io** - [https://raindrop.io](https://raindrop.io)
- **API Documentation** - [https://developer.raindrop.io](https://developer.raindrop.io)
- **Chrome Extension APIs** - [https://developer.chrome.com/docs/extensions/](https://developer.chrome.com/docs/extensions/)

---

**Rain Random Drops** - Making bookmark discovery fun and serendipitous! 🌧️✨
