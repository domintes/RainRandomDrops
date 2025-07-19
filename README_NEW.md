# 🌧️ Rain Random Drops - Enhanced Chrome Extension

Random bookmarks picker for Raindrop.io with advanced features and local bookmark support.

## ✨ Features

### Core Features
- **Random Bookmark Selection** - Pick random bookmarks from your Raindrop.io collections
- **Local Bookmark Support** - Randomize bookmarks from your browser's bookmark manager
- **Authentication Timeout** - No more infinite login loops (20-second timeout)
- **Enhanced Error Handling** - Better error messages and recovery

### Advanced Filtering
- **Collection Filtering** - Hide collections below a specific bookmark count
- **Tag Filtering** - Filter bookmarks by tags with minimum count thresholds
- **Nested Collection Display** - Better visualization of nested collections
- **Smart Collection Sorting** - Collections sorted by count and title

### Watched System
- **Mark as Watched** - Mark bookmarks as "watched" to exclude them from random selection
- **Watched Collection** - Special collection showing only watched bookmarks
- **Easy Toggle** - Mark/unmark bookmarks with one click

### UI Improvements
- **Better Status Messages** - Clear feedback on all operations
- **Responsive Design** - Clean and modern interface
- **Keyboard Shortcuts** - Alt+R for random pick, Ctrl+Shift+R for popup
- **Navigation History** - Browse previously selected bookmarks

## 🚀 Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked" and select the extension folder
5. The extension icon should appear in your Chrome toolbar

## 🔧 Setup & Authentication

### Option 1: OAuth Authentication (Recommended)
1. Click the extension icon
2. Click "Connect to Raindrop.io"
3. Authenticate with your Raindrop.io account
4. Start using the extension!

### Option 2: Manual Token
1. Go to [Raindrop.io Settings > Integrations](https://app.raindrop.io/settings/integrations)
2. Generate a new access token
3. Copy the token
4. In the extension popup, paste it in the "Manual token" field
5. Click "Test Token"

## 📖 How to Use

### Random Bookmarks
1. **🎲 Random**: Pick a random bookmark from selected collection
2. **📚 Local Random**: Pick a random bookmark from browser bookmarks
3. **◀ Prev / Next ▶**: Navigate through previously selected bookmarks

### Filtering Options
- **Collection**: Choose which collection to randomize from
- **Tags**: Add specific tags to filter bookmarks
- **Min Count**: Hide collections/tags with fewer bookmarks
- **Hide Below Count**: Set minimum bookmark count to show collections

### Watched System
- **👁️ Mark Watched**: Mark current bookmark as watched
- **🔄 Unmark**: Remove watched status
- **Show "Watched" Collection**: Toggle special watched collection in dropdown

## 🔧 Settings Explained

### Hide Collections Below Count
Enter a number (e.g., 10) to hide collections with fewer bookmarks. This helps declutter the collection list.

### Min Bookmark Count
Set minimum number of bookmarks required for collections and tags to appear in filters.

### Watched Collection
When enabled, creates a special "👁️ Watched" collection containing all bookmarks you've marked as watched.

## ⌨️ Keyboard Shortcuts

- **Alt+R** - Pick random bookmark from last used collection
- **Ctrl+Shift+R** - Open extension popup

## 🔍 Troubleshooting

### Authentication Issues
- **Infinite login loop**: Fixed with 20-second timeout
- **Token expired**: Extension will automatically prompt for re-authentication
- **Manual token fails**: Check token validity at Raindrop.io settings

### No Bookmarks Found
- Check if collections have bookmarks
- Verify minimum count filters aren't too high
- Ensure you haven't marked all bookmarks as "watched"

### Extension Not Loading
- Check Chrome extensions page for error messages
- Ensure all files are present in extension folder
- Try reloading the extension

## 🛠️ Technical Details

### Permissions Used
- `storage` - Save settings and authentication tokens
- `activeTab` - Open selected bookmarks in tabs
- `identity` - OAuth authentication with Raindrop.io
- `bookmarks` - Access browser bookmarks for local randomization

### Files Structure
```
├── manifest.json         # Extension configuration
├── background.js         # Service worker (main logic)
├── popup.html/.js        # Extension popup interface
├── content.js            # Content script for page interactions
├── styles.css            # Styling
├── icons/                # Extension icons
└── README.md            # This file
```

### API Endpoints Used
- `GET /user` - Verify authentication
- `GET /collections` - Fetch collections
- `GET /tags` - Fetch available tags
- `GET /raindrops/{collection_id}` - Fetch bookmarks
- `GET /raindrop/{bookmark_id}` - Fetch individual bookmark

## 🔄 Changelog

### Version 1.1.0 (Current)
- ✅ Fixed infinite authentication loop with 20s timeout
- ✅ Added local bookmark randomization
- ✅ Implemented "Watched" bookmark system
- ✅ Enhanced collection filtering (hide below count)
- ✅ Better nested collection display
- ✅ Improved error handling and user feedback
- ✅ Fixed extension icons
- ✅ Added comprehensive timeout handling

### Version 1.0.0
- Basic random bookmark selection
- OAuth authentication
- Collection and tag filtering
- Keyboard shortcuts

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is open source. Feel free to use, modify, and distribute.

## 🔗 Links

- [Raindrop.io](https://raindrop.io/) - The bookmark manager this extension works with
- [Raindrop.io API Documentation](https://developer.raindrop.io/) - Official API docs
- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/) - Chrome extension development

---

**Made with ❤️ for the Raindrop.io community**
