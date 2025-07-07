# Hooks Architecture

## Обзор

Hooks-архитектура представляет собой модульную систему организации кода, которая разделяет функциональность на специализированные, переиспользуемые компоненты. Каждый hook отвечает за определенную область функциональности и предоставляет чистый API для взаимодействия.

## Структура Hooks

### 🎯 **useChromeApi.ts** - Управление Chrome API
Централизованное управление всеми операциями с Chrome Extensions API.

**Основные функции:**
- `getActiveTab()` - получение активной вкладки
- `getTabById()` - получение вкладки по ID
- `sendMessageToTab()` - отправка сообщений на вкладку
- `manageSidebarForSite()` - управление сайдпанелью на основе совместимости
- `configureSidebarOptions()` - настройка опций сайдпанели
- `storage` - работа с chrome.storage

### 🧠 **useStateManager.ts** - Управление состоянием
Централизованное управление состоянием вкладок, чатов и плагинов.

**Основные функции:**
- `getOrCreateTabState()` - получение или создание состояния вкладки
- `setTabState()` - установка состояния вкладки
- `addChatMessage()` - добавление сообщения в чат
- `updateChatInput()` - обновление ввода в чате
- `clearChat()` - очистка чата
- `setActivePlugin()` - установка активного плагина
- `addRunningPlugin()` / `removeRunningPlugin()` - управление запущенными плагинами

### 🔌 **usePluginManager.ts** - Управление плагинами
Управление жизненным циклом плагинов и их совместимостью.

**Основные функции:**
- `getCompatibleSites()` - получение списка совместимых сайтов
- `isSiteCompatible()` - проверка совместимости сайта
- `getAvailablePlugins()` - получение доступных плагинов
- `runPlugin()` / `interruptPlugin()` - управление выполнением плагинов

### 🎮 **usePluginHandler.ts** - Обработка плагинов
Специализированная обработка команд плагинов.

**Основные функции:**
- `getPluginsList()` - получение списка плагинов для URL
- `runPluginCommand()` - запуск команды плагина
- `interruptPluginCommand()` - прерывание команды плагина
- `isPluginRunning()` - проверка состояния плагина
- `getRunningPlugins()` - получение списка запущенных плагинов

### 🎛️ **useSidebarController.ts** - Управление сайдпанелью
Специализированное управление сайдпанелью и её поведением.

**Основные функции:**
- `configureSidePanelForTab()` - настройка сайдпанели для вкладки
- `toggleSidebarDirectly()` - переключение сайдпанели
- `openSidebarForTab()` / `closeSidebarForTab()` - открытие/закрытие сайдпанели
- `getSidebarState()` - получение состояния сайдпанели
- `isProtectedUrl()` - проверка защищенных URL

### 📨 **useMessageHandler.ts** - Обработка сообщений
Централизованная обработка сообщений между компонентами.

**Основные функции:**
- `sendMessageWithResponse()` - отправка сообщения с ожиданием ответа
- `ping()` - проверка связи
- `getTabStates()` - получение состояний вкладок

### 🎪 **useBackgroundScript.ts** - Основная логика
Координация всех hooks и обработка сообщений в background script.

**Основные функции:**
- `initializeBackgroundScript()` - инициализация background script
- `handleUIMessage()` - обработка сообщений от UI
- `handleHostApiMessage()` - обработка сообщений от Host API
- `setupTabEventHandlers()` - настройка обработчиков событий вкладок

## Принципы Архитектуры

### 1. **Единственная ответственность**
Каждый hook отвечает за одну конкретную область функциональности.

### 2. **Чистые интерфейсы**
Каждый hook предоставляет четкий, документированный API.

### 3. **Переиспользование**
Hooks могут использоваться в разных частях приложения.

### 4. **Тестируемость**
Каждый hook можно тестировать изолированно.

### 5. **Логирование**
Централизованное логирование через `utils/logging.ts`.

### 6. **Валидация**
Централизованная валидация через `utils/validation.ts`.

## Поток Данных

```
Background Script
    ↓
useBackgroundScript (координация)
    ↓
useMessageHandler (маршрутизация)
    ↓
Специализированные hooks:
├── useChromeApi (Chrome API)
├── useStateManager (состояние)
├── usePluginManager (плагины)
├── usePluginHandler (команды плагинов)
└── useSidebarController (сайдпанель)
```

## Примеры Использования

### Управление состоянием вкладки
```typescript
import { getOrCreateTabState, addChatMessage } from './useStateManager';

// Получение состояния
const state = await getOrCreateTabState(tabId, url);

// Добавление сообщения
await addChatMessage(tabId, pluginName, {
    type: 'user',
    content: 'Hello world'
});
```

### Управление сайдпанелью
```typescript
import { manageSidebarForSite } from './useChromeApi';

// Автоматическое управление на основе совместимости
await manageSidebarForSite(tabId, url);
```

### Проверка совместимости плагинов
```typescript
import { isSiteCompatible } from './usePluginManager';

// Проверка совместимости
const compatible = isSiteCompatible(url);
if (compatible) {
    // Сайдпанель будет открыта
}
```

## Преимущества Hooks-архитектуры

### 🚀 **Производительность**
- Ленивая загрузка функциональности
- Оптимизированные обработчики событий
- Эффективное управление состоянием

### 🛡️ **Безопасность**
- Централизованная валидация
- Изолированные операции
- Контролируемый доступ к API

### 🔧 **Поддерживаемость**
- Четкое разделение ответственности
- Легкое добавление новых функций
- Простое тестирование

### 📈 **Масштабируемость**
- Модульная архитектура
- Переиспользуемые компоненты
- Гибкая система расширений

## Миграция с Legacy кода

### Замененные модули:
- `state-manager.ts` → `useStateManager.ts`
- `plugin-handler.ts` → `usePluginHandler.ts`
- `sidebar-controller.ts` → `useSidebarController.ts`

### Преимущества миграции:
- Лучшая организация кода
- Упрощенное тестирование
- Улучшенная читаемость
- Централизованное логирование

## Будущие улучшения

### Планируемые hooks:
- `useHostApi.ts` - управление Host API
- `usePluginSettings.ts` - управление настройками плагинов
- `useNotificationManager.ts` - управление уведомлениями
- `useAnalytics.ts` - аналитика и метрики

### Оптимизации:
- Кэширование результатов
- Ленивая инициализация
- Оптимизация памяти
- Улучшенная обработка ошибок 