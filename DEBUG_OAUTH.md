# 🔍 Debug OAuth Flow

## Sprawdź w konsoli Chrome:

1. **Otwórz DevTools** (F12)
2. **Idź do Console**
3. **Uruchom auth i sprawdź:**

```javascript
// Po OAuth, sprawdź czy token został zapisany
chrome.storage.sync.get(['accessToken'], (data) => {
  console.log('Stored token:', data.accessToken ? 'EXISTS' : 'MISSING');
  if (data.accessToken) {
    console.log('Token preview:', data.accessToken.substring(0, 10) + '...');
  }
});
```

4. **Sprawdź też inne dane:**
```javascript
chrome.storage.sync.get(null, (data) => {
  console.log('All stored data:', data);
});
```

## Co sprawdzić w logach:

1. ✅ "OAuth callback URL:" - powinien mieć kod
2. ✅ "Token response status: 200" - status OK 
3. ❓ "Token data:" - czy zawiera `access_token`?
4. ❓ "Saving access token to storage..." - czy się zapisuje?
5. ❓ "Token saved, verifying with API..." - czy weryfikacja przechodzi?

## Możliwe problemy:

1. **Token data nie zawiera access_token** - problem z Raindrop.io API
2. **Storage nie zapisuje** - problem z Chrome storage
3. **Token zapisuje się, ale inne części kodu go nie widzą** - timing issue

## Rozwiązanie:

Jeśli OAuth pokazuje "Authentication Complete" ale token nie działa:
- Użyj **manual token** z credentials.js: `eb69dab6-3b23-4cad-b3de-e436c66fc338`
