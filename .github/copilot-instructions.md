<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Rain Random Drops - Browser Extension

This is a Chromium browser extension project for randomly picking bookmarks from Raindrop.io collections.

## Project Structure
- Uses Manifest v3 for modern Chrome extension architecture
- OAuth 2.0 authentication with Raindrop.io API
- Content script injection for UI overlay
- Background service worker for API communications
- Popup interface for settings and controls

## Key Technologies
- Chrome Extension APIs (storage, identity, commands)
- Raindrop.io REST API v1
- Modern JavaScript (ES6+)
- CSS3 for responsive UI design
- OAuth 2.0 authentication flow

## Development Guidelines
- Follow Chrome Extension best practices for Manifest v3
- Use chrome.storage.sync for persistent user settings
- Implement proper error handling for API calls
- Ensure responsive design for various screen sizes
- Follow security best practices for API token handling
