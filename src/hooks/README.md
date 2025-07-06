# Hooks Architecture

Этот подход к организации кода основан на принципе **hooks** - небольших, переиспользуемых функций, которые инкапсулируют конкретную логику.

## Преимущества

1. **Изоляция логики** - каждый файл отвечает за одну задачу
2. **Переиспользование** - функции можно импортировать в разных местах
3. **Тестируемость** - каждый хук можно тестировать отдельно
4. **Читаемость** - легче найти нужную функцию
5. **Безопасность** - меньше шансов случайно удалить рабочий код

## Структура

```
src/
├── hooks/                    # Переиспользуемые функции
│   ├── useChromeApi.ts      # Работа с Chrome API
│   ├── useMessageHandler.ts # Обработка сообщений
│   ├── usePluginManager.ts  # Управление плагинами
│   └── useBackgroundScript.ts # Пример использования
├── utils/                   # Утилиты
│   ├── validation.ts        # Валидация данных
│   └── logging.ts          # Логирование
└── modules/                # Крупные модули (оставляем)
    ├── state-manager.ts
    ├── plugin-handler.ts
    └── ...
```

## Использование

### 1. Chrome API Hook

```typescript
import { getActiveTab, sendMessageToTab, storage } from '../hooks/useChromeApi';

// Получение активной вкладки
const activeTab = await getActiveTab();

// Отправка сообщения
await sendMessageToTab(tabId, { type: 'TEST' });

// Работа с storage
await storage.set({ key: 'value' });
const data = await storage.get('key');
```

### 2. Message Handler Hook

```typescript
import { ping, getPlugins, runPlugin } from '../hooks/useMessageHandler';

// Проверка связи
const isConnected = await ping();

// Получение плагинов
const response = await getPlugins(currentUrl);

// Запуск плагина
const result = await runPlugin('plugin-name', tabId);
```

### 3. Plugin Manager Hook

```typescript
import { 
    getAvailablePlugins, 
    togglePlugin, 
    setPluginAutoRun 
} from '../hooks/usePluginManager';

// Получение списка плагинов
const plugins = await getAvailablePlugins();

// Включение/выключение плагина
await togglePlugin('plugin-id', true);

// Установка автозапуска
await setPluginAutoRun('plugin-id', false);
```

### 4. Validation Utils

```typescript
import { 
    isValidTabId, 
    isValidPluginName, 
    isProtectedUrl 
} from '../utils/validation';

// Валидация ID вкладки
if (!isValidTabId(tabId)) {
    throw new Error('Invalid tab ID');
}

// Валидация имени плагина
if (!isValidPluginName(pluginName)) {
    throw new Error('Invalid plugin name');
}

// Проверка защищенного URL
if (isProtectedUrl(url)) {
    // Не показываем sidebar
}
```

### 5. Logging Utils

```typescript
import { 
    logInfo, 
    logError, 
    logWarn,
    backgroundLogger 
} from '../utils/logging';

// Быстрое логирование
logInfo('Операция выполнена');
logError('Произошла ошибка', error);

// Использование логгера с префиксом
backgroundLogger.info('Background script started');
backgroundLogger.error('Plugin failed', { pluginId, error });
```

## Интеграция с существующим кодом

### В background.ts

```typescript
import { initializeBackgroundScript, handleUIMessage } from './hooks/useBackgroundScript';
import { configureSidebarForTab } from './hooks/useBackgroundScript';

// Инициализация
await initializeBackgroundScript();

// Обработка сообщений
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    (async () => {
        if (message.source === 'app-host-api') {
            const response = await handleHostApiMessage(message, sender);
            sendResponse(response);
        } else {
            const response = await handleUIMessage(message, sender);
            sendResponse(response);
        }
    })();
    return true;
});

// Настройка sidebar для вкладок
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    await configureSidebarForTab(tab);
});
```

## Создание новых hooks

### Шаблон нового hook

```typescript
/**
 * src/hooks/useNewFeature.ts
 * 
 * Описание назначения hook
 */

import { sendMessageWithResponse } from './useMessageHandler';
import { isValidTabId } from '../utils/validation';
import { logInfo, logError } from '../utils/logging';

export interface NewFeatureData {
    // Типы данных
}

/**
 * Основная функция hook
 */
export async function useNewFeature(data: NewFeatureData): Promise<any> {
    // Валидация
    if (!isValidTabId(data.tabId)) {
        return { success: false, error: 'Invalid tab ID' };
    }

    try {
        logInfo('Выполнение операции', data);
        
        // Логика
        
        return { success: true, data: result };
    } catch (error) {
        logError('Ошибка операции', { data, error });
        return { success: false, error: (error as Error).message };
    }
}
```

## Лучшие практики

1. **Один файл - одна ответственность**
2. **Используйте TypeScript интерфейсы**
3. **Добавляйте валидацию входных данных**
4. **Логируйте важные операции**
5. **Обрабатывайте ошибки**
6. **Документируйте функции**
7. **Тестируйте каждый hook отдельно**

## Миграция существующего кода

1. **Выделите повторяющуюся логику** в hooks
2. **Замените прямые вызовы Chrome API** на useChromeApi
3. **Добавьте валидацию** с помощью validation utils
4. **Улучшите логирование** с помощью logging utils
5. **Постепенно рефакторьте** большие функции

## Преимущества для разработки

- **Меньше дублирования кода**
- **Легче отлаживать** - каждый hook можно тестировать отдельно
- **Проще добавлять новые функции** - используйте существующие hooks
- **Лучшая читаемость** - код организован по функциональности
- **Безопасность** - валидация и обработка ошибок централизованы 