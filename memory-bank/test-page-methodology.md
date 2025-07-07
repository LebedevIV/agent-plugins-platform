# Методика работы с тестовой страницей для Agent-Plugins-Platform

## Обзор

Тестовая страница необходима для отладки и тестирования browser extension Agent-Plugins-Platform, особенно для проверки:
- Загрузки content script
- Работы sidebar
- Выполнения плагинов
- Интеграции с Chrome API

## Архитектура решения

### 1. Тестовый сервер (test-server.js)

```javascript
const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    // Обработка запросов к тестовой странице
    if (req.url === '/test-page.html') {
        // Отдача HTML страницы
    } else if (req.url === '/style.css') {
        // Отдача CSS стилей
    }
});

server.listen(3000, () => {
    console.log('🚀 Тестовый сервер запущен на http://localhost:3000');
    console.log('📄 Тестовая страница: http://localhost:3000/test-page.html');
});
```

### 2. Тестовая страница (test-page.html)

Страница содержит:
- UI элементы для проверки статуса расширения
- Кнопки для тестирования API
- Интеграцию с content script через postMessage
- Прокси для Chrome API

## Ключевые проблемы и решения

### Проблема 1: Content Script не загружается

**Симптомы:**
- `window.APP_EXTENSION_LOADED` undefined
- Content script не обнаружен

**Причины:**
- Content Security Policy блокирует inline скрипты
- Manifest permissions не включают localhost
- Content script не инжектируется в страницу

**Решение:**
1. Добавить localhost в manifest permissions:
```json
{
  "content_scripts": [{
    "matches": ["*://localhost/*", "*://127.0.0.1/*"]
  }]
}
```

2. Использовать postMessage вместо inline скриптов:
```javascript
// В content script
window.postMessage({
    type: 'APP_EXTENSION_LOADED',
    data: { loaded: true }
}, '*');

// В тестовой странице
window.addEventListener('message', (event) => {
    if (event.data.type === 'APP_EXTENSION_LOADED') {
        // Content script загружен
    }
});
```

### Проблема 2: Chrome API недоступен на тестовой странице

**Симптомы:**
- `chrome.runtime.sendMessage` не определен
- Ошибки "chrome is not defined"

**Причина:**
- Chrome API доступен только в контексте расширения
- Тестовая страница работает в обычном контексте браузера

**Решение:**
Создать прокси в content script:

```javascript
// content.js
let currentTabId = null;

// Получаем tabId при инициализации
chrome.runtime.sendMessage({ type: 'GET_TAB_ID' }, (response) => {
    currentTabId = response.tabId;
});

// Прокси для Chrome API
window.addEventListener('message', (event) => {
    if (event.data.type === 'CHROME_API_CALL') {
        const { method, params } = event.data;
        
        // Добавляем tabId если отсутствует
        if (method === 'sidePanel.setOptions' && !params.tabId) {
            params.tabId = currentTabId;
        }
        
        // Выполняем вызов Chrome API
        chrome[method](params, (result) => {
            window.postMessage({
                type: 'CHROME_API_RESPONSE',
                id: event.data.id,
                result: result
            }, '*');
        });
    }
});
```

### Проблема 3: Sidebar не открывается автоматически

**Симптомы:**
- `sidePanel.open()` не работает
- Ошибка "Invalid tabId"

**Причины:**
- Chrome API требует user gesture для `sidePanel.open()`
- Автоматическое открытие заблокировано браузером

**Решение:**
Изменить логику toggle в background script:

```javascript
// background.ts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'TOGGLE_SIDEBAR') {
        const tabId = sender.tab?.id;
        
        if (message.action === 'open') {
            // Только включаем sidebar, не открываем автоматически
            chrome.sidePanel.setOptions({
                tabId: tabId,
                path: 'sidepanel.html',
                enabled: true
            });
        } else if (message.action === 'close') {
            chrome.sidePanel.setOptions({
                tabId: tabId,
                enabled: false
            });
        }
    }
});
```

### Проблема 4: Ошибки соединения при инициализации

**Симптомы:**
- "Could not establish connection. Receiving end does not exist."
- Ошибки при загрузке расширения

**Причина:**
- Background script может быть не готов при первом обращении
- Нормальное поведение при старте расширения

**Решение:**
Добавить обработку ошибок:

```javascript
chrome.runtime.sendMessage(message, (response) => {
    if (chrome.runtime.lastError) {
        // Игнорируем ошибки при инициализации
        if (chrome.runtime.lastError.message.includes('Receiving end does not exist')) {
            console.log('Background script еще не готов, игнорируем');
            return;
        }
    }
    // Обрабатываем успешный ответ
});
```

## Полная структура тестовой страницы

### HTML структура:
```html
<!DOCTYPE html>
<html>
<head>
    <title>Test Page - Agent Plugins Platform</title>
    <link rel="stylesheet" href="/style.css">
</head>
<body>
    <div class="container">
        <h1>Тестовая страница для Agent-Plugins-Platform</h1>
        
        <div class="status-section">
            <h2>Статус расширения</h2>
            <div id="extension-status">Проверяется...</div>
            <div id="content-script-status">Проверяется...</div>
            <div id="sidebar-status">Проверяется...</div>
        </div>
        
        <div class="controls-section">
            <h2>Тестовые кнопки</h2>
            <button id="test-api-btn">Тест API расширения</button>
            <button id="toggle-sidebar-btn">Переключить Sidebar</button>
            <button id="run-plugin-btn">Запустить плагин</button>
        </div>
        
        <div class="logs-section">
            <h2>Логи</h2>
            <div id="logs"></div>
        </div>
    </div>
    
    <script src="test-page.js"></script>
</body>
</html>
```

### JavaScript логика:
```javascript
// test-page.js
let extensionLoaded = false;
let contentScriptLoaded = false;

// Ожидание загрузки content script
window.addEventListener('message', (event) => {
    if (event.data.type === 'APP_EXTENSION_LOADED') {
        contentScriptLoaded = true;
        updateStatus();
    }
});

// Прокси для Chrome API
function callChromeAPI(method, params = {}) {
    return new Promise((resolve, reject) => {
        const id = Date.now();
        
        const handler = (event) => {
            if (event.data.type === 'CHROME_API_RESPONSE' && event.data.id === id) {
                window.removeEventListener('message', handler);
                resolve(event.data.result);
            }
        };
        
        window.addEventListener('message', handler);
        
        window.postMessage({
            type: 'CHROME_API_CALL',
            id: id,
            method: method,
            params: params
        }, '*');
    });
}

// Обработчики кнопок
document.getElementById('toggle-sidebar-btn').addEventListener('click', async () => {
    try {
        await callChromeAPI('sidePanel.setOptions', {
            enabled: true,
            path: 'sidepanel.html'
        });
        log('Sidebar включен');
    } catch (error) {
        log('Ошибка: ' + error.message);
    }
});
```

## Процесс тестирования

### 1. Запуск тестового сервера:
```bash
node test-server.js
```

### 2. Проверка в браузере:
1. Открыть http://localhost:3000/test-page.html
2. Проверить статус расширения
3. Протестировать кнопки
4. Проверить логи

### 3. Отладка:
- Использовать DevTools для просмотра ошибок
- Проверить Console на наличие ошибок
- Мониторить Network tab для запросов

## Типичные проблемы и их решения

### Порт 3000 занят:
```bash
# Найти процесс
lsof -i :3000
# Убить процесс
kill -9 <PID>
```

### Content script не загружается:
1. Проверить manifest.json permissions
2. Перезагрузить расширение
3. Обновить страницу

### Sidebar не работает:
1. Проверить tabId в сообщениях
2. Убедиться что sidebar включен
3. Открыть sidebar вручную через браузер

### Плагины не запускаются:
1. Проверить структуру плагинов
2. Убедиться что Pyodide загружен
3. Проверить MCP bridge

## Лучшие практики

### 1. Изоляция тестов:
- Использовать отдельный порт для тестов
- Не смешивать с production кодом
- Очищать состояние между тестами

### 2. Логирование:
- Добавлять подробные логи
- Использовать разные уровни логирования
- Сохранять логи для анализа

### 3. Обработка ошибок:
- Всегда обрабатывать chrome.runtime.lastError
- Предоставлять понятные сообщения об ошибках
- Graceful degradation при сбоях

### 4. Производительность:
- Минимизировать количество API вызовов
- Кэшировать результаты где возможно
- Избегать блокирующих операций

## Интеграция с CI/CD

### Автоматизированное тестирование:
```javascript
// playwright.config.js
module.exports = {
    testDir: './tests',
    use: {
        baseURL: 'http://localhost:3000',
        headless: false
    },
    webServer: {
        command: 'node test-server.js',
        port: 3000,
        reuseExistingServer: !process.env.CI
    }
};
```

### Тестовые сценарии:
1. Загрузка content script
2. Работа sidebar
3. Выполнение плагинов
4. Обработка ошибок

## Заключение

Данная методика обеспечивает надежное тестирование browser extension в изолированной среде с полным контролем над всеми аспектами работы. Ключевые моменты:

1. **Изоляция**: Тестовая страница работает независимо от production
2. **Прокси**: Content script обеспечивает доступ к Chrome API
3. **Обработка ошибок**: Graceful handling всех возможных сбоев
4. **Логирование**: Подробная диагностика проблем
5. **Автоматизация**: Возможность интеграции с CI/CD

Эта методика может быть адаптирована для тестирования других browser extensions с аналогичной архитектурой.

---

## Резюме Изменений (v0.9.4)

### Созданные файлы:
- `memory-bank/test-page-methodology.md` - Полная документация методики
- `test-server.js` - HTTP сервер для тестовой страницы
- `test-page.html` - UI для проверки статуса расширения

### Обновленные файлы:
- `memory-bank/consolidated-context.md` - Добавлен раздел о тестовой странице
- `memory-bank/current-state.md` - Добавлен раздел о тестовой странице как завершенная функция
- `memory-bank/project-context.md` - Добавлен раздел "Тестирование и Отладка"
- `memory-bank/recovery-guide.md` - Добавлены проверки тестирования в чек-лист
- `MEMORY_BANK.md` - Добавлена ссылка на новый файл методики

### Ключевые достижения:
1. **Изолированная среда тестирования** - полный контроль над отладкой
2. **Решение проблем CSP** - использование postMessage вместо inline скриптов
3. **Прокси Chrome API** - доступ к Chrome API через content script
4. **Graceful error handling** - обработка всех типичных ошибок browser extension
5. **Полная документация** - методика зафиксирована для будущего использования

### Статус: ✅ Завершено и задокументировано 