# 🔧 Raindrop.io App Configuration

## Problem z Authentication

Błędy w konsoli pokazują:
```
Token data: {result: false, status: 400, errorMessage: 'client_id or client_secret is invalid'}
```

## ✅ Rozwiązanie

### Krok 1: Zaktualizuj Dane w Kodzie
Poprawiłem już dane w `background.js`:
- ✅ CLIENT_ID: `687aebc8e9b0f84f25bed150`
- ✅ CLIENT_SECRET: `99559f49-6a5a-4dc3-a059-a0a6a339fb5e` (poprawiony)
- ✅ TEST_TOKEN: `eb69dab6-3b23-4cad-b3de-e436c66fc338` (poprawiony)

### Krok 2: Konfiguracja Aplikacji w Raindrop.io

1. **Idź do** [Raindrop.io Settings > Integrations](https://app.raindrop.io/settings/integrations)
2. **Znajdź swoją aplikację** (lub stwórz nową)
3. **Ustaw Redirect URIs:**

Dodaj WSZYSTKIE te URIs (Chrome może używać różnych):
```
https://damajjfomglgghhajibfpaabbapcobpe.ch40m1umapp.qjz9zk/
chrome-extension://damajjfomglgghhajibfpaabbapcobpe/oauth.html
http://oauth.html
https://localhost:3000
```

**Uwaga:** `damajjfomglgghhajibfpaabbapcobpe` to ID twojego rozszerzenia Chrome - może być różne!

### Krok 3: Sprawdź ID Rozszerzenia

1. Idź do `chrome://extensions/`
2. Znajdź "Rain Random Drops"
3. Skopiuj **ID rozszerzenia** (długi ciąg znaków)
4. Dodaj do Raindrop.io redirect URIs:
   ```
   chrome-extension://[TWOJE_ID_ROZSZERZENIA]/oauth.html
   https://[TWOJE_ID_ROZSZERZENIA].chromiumapp.org/
   ```

### Krok 4: Testowanie

Po aktualizacji danych powinno działać z **Test Token** bezpośrednio:
```
eb69dab6-3b23-4cad-b3de-e436c66fc338
```

### Krok 5: Debugging

W konsoli Chrome (`F12` > Console) sprawdź:
```javascript
// Sprawdź czy token jest zapisany
chrome.storage.sync.get(['accessToken'], (data) => console.log(data));

// Sprawdź ID rozszerzenia
chrome.runtime.id
```

## 🚨 Ważne

1. **ID rozszerzenia** może się zmienić przy każdym przeładowaniu w trybie developer
2. **Wszystkie redirect URIs** muszą być dodane w Raindrop.io
3. **Test token** powinien działać od razu po poprawie w kodzie

## ✅ Po Naprawie

Rozszerzenie powinno:
1. ✅ Używać poprawnego test tokenu
2. ✅ Wyświetlać "Welcome [username]!" po autoryzacji
3. ✅ Ładować kolekcje bez błędów
4. ✅ OAuth też będzie działać z poprawnymi danymi
