# Инструкции по Восстановлению AI-Ассистента

## Обзор

Этот файл содержит инструкции для восстановления AI-ассистента (Gemini 2.5 Pro в Cursor) в случае потери контекста или необходимости пересоздания. Файл структурирован для быстрого восстановления всех ключевых знаний и поведения.

## Структура Памяти

### 1. AI DNA (`ai-dna.md`)
**Содержит**: Сущность, принципы, ключевые инсайты, стиль работы
**Когда загружать**: Всегда (основа поведения)
**RAW URL**: `https://gist.github.com/LebedevIV/6386d4c8a743dbfd1d3c7a3afdb5cb2c/raw/6ef21fa8877261f21eae0e2296268cff897fce22/ai-dna.md`

### 2. Контекст Проекта (`project-context.md`)
**Содержит**: Видение, архитектура, техстек, паттерны
**Когда загружать**: Всегда (технический контекст)
**RAW URL**: `https://gist.github.com/LebedevIV/6386d4c8a743dbfd1d3c7a3afdb5cb2c/raw/6ef21fa8877261f21eae0e2296268cff897fce22/project-context.md`

### 3. Текущее Состояние (`current-state.md`)
**Содержит**: Прогресс, активные задачи, известные проблемы
**Когда загружать**: При возобновлении работы над проектом
**RAW URL**: `https://gist.github.com/LebedevIV/6386d4c8a743dbfd1d3c7a3afdb5cb2c/raw/6ef21fa8877261f21eae0e2296268cff897fce22/current-state.md`

### 4. Инструкции по Восстановлению (`recovery-guide.md`)
**Содержит**: Этот файл - инструкции по восстановлению
**Когда загружать**: Только при восстановлении
**RAW URL**: `https://gist.github.com/LebedevIV/6386d4c8a743dbfd1d3c7a3afdb5cb2c/raw/6ef21fa8877261f21eae0e2296268cff897fce22/recovery-guide.md`

### 5. Инструкция по Самосохранению (`ai-self-preservation-guide.md`) (НОВОЕ)
**Содержит**: Система самосохранения и архивации знаний для AI-ассистента
**Когда загружать**: При необходимости проведения процесса самосохранения
**RAW URL**: `https://gist.github.com/LebedevIV/6386d4c8a743dbfd1d3c7a3afdb5cb2c/raw/4b78f674002bcf6a0c1849020ae2efa7175fc39c/ai-self-preservation-guide.md`
**Дополнительные ссылки**:
- [Обзор системы](https://gist.github.com/LebedevIV/6386d4c8a743dbfd1d3c7a3afdb5cb2c/raw/4b78f674002bcf6a0c1849020ae2efa7175fc39c/self-preservation-overview.md)
- [Отчет о реализации](https://gist.github.com/LebedevIV/6386d4c8a743dbfd1d3c7a3afdb5cb2c/raw/4b78f674002bcf6a0c1849020ae2efa7175fc39c/self-preservation-implementation-report.md)
- [Обновления Memory Bank](https://gist.github.com/LebedevIV/6386d4c8a743dbfd1d3c7a3afdb5cb2c/raw/4b78f674002bcf6a0c1849020ae2efa7175fc39c/update-summary.md)

## Пошаговое Восстановление

### Шаг 1: Получение RAW URL

1. Перейдите к вашему GitHub Gist
2. Выберите нужный файл
3. Нажмите кнопку "Raw"
4. Скопируйте URL из адресной строки

**Пример RAW URL:**
```
https://gist.github.com/LebedevIV/6386d4c8a743dbfd1d3c7a3afdb5cb2c/raw/6ef21fa8877261f21eae0e2296268cff897fce22/ai-dna.md
```

### Шаг 2: Настройка Cursor

1. Откройте Cursor
2. Перейдите в Settings (Ctrl/Cmd + ,)
3. Найдите раздел "Rules / User Rules"
4. Добавьте RAW URL файлов в следующем порядке:

#### Обязательные файлы (всегда загружать):
```
https://gist.github.com/LebedevIV/6386d4c8a743dbfd1d3c7a3afdb5cb2c/raw/6ef21fa8877261f21eae0e2296268cff897fce22/ai-dna.md
https://gist.github.com/LebedevIV/6386d4c8a743dbfd1d3c7a3afdb5cb2c/raw/6ef21fa8877261f21eae0e2296268cff897fce22/project-context.md
```

#### Опциональные файлы (при необходимости):
```
https://gist.github.com/LebedevIV/6386d4c8a743dbfd1d3c7a3afdb5cb2c/raw/6ef21fa8877261f21eae0e2296268cff897fce22/current-state.md
```

### Шаг 3: Проверка Восстановления

После добавления URL, проверьте восстановление:

1. **Откройте проект** Agent-Plugins-Platform
2. **Задайте тестовый вопрос**: "Расскажи об архитектуре проекта"
3. **Проверьте ответ**: Должен содержать информацию о компонентах, MCP протоколе, Pyodide
4. **Задайте вопрос о принципах**: "Какие у тебя основные принципы работы?"
5. **Проверьте ответ**: Должен упомянуть безопасность, архитектурное мышление, производительность

## Альтернативные Способы Восстановления

### Способ 1: Локальные файлы
Если gist недоступен, используйте локальные файлы из `memory-bank/`:

1. Скопируйте содержимое файлов
2. Вставьте в User Rules в Cursor
3. Сохраните настройки

### Способ 2: Консолидированный файл
Если нужно быстрое восстановление, используйте консолидированный файл:

```
memory-bank/consolidated-context.md
```

Или gist версию (после добавления в gist):
```
https://gist.github.com/LebedevIV/6386d4c8a743dbfd1d3c7a3afdb5cb2c/raw/7b3680d27615f2016e23904ebea62c260bf5515f/consolidated-context.md
```

## Проверочный Чек-лист

### ✅ Базовые знания
- [ ] Понимает архитектуру Agent-Plugins-Platform
- [ ] Знает о MCP протоколе и Pyodide
- [ ] Понимает структуру плагинов
- [ ] Знает о боковой панели и изоляции по вкладкам
- [ ] Понимает hooks-архитектуру (НОВОЕ)
- [ ] Знает об умной логике показа сайдпанели (НОВОЕ)

### ✅ Принципы работы
- [ ] Приоритет безопасности
- [ ] Архитектурное мышление
- [ ] Фокус на производительность и UX
- [ ] Модульность и переиспользование
- [ ] Умный UX - показ функциональности только там, где она нужна (НОВОЕ)

### ✅ Технические детали
- [ ] Знает структуру файлов проекта
- [ ] Понимает поток коммуникации
- [ ] Знает о AI интеграции (Gemini API)
- [ ] Понимает систему управления API ключами
- [ ] Знает о hooks-модулях: useChromeApi, useMessageHandler, usePluginManager, useBackgroundScript (НОВОЕ)
- [ ] Понимает умную логику показа сайдпанели на ozon.ru и google.com (НОВОЕ)

### ✅ Текущее состояние
- [ ] Знает о завершенных функциях
- [ ] Понимает активные задачи
- [ ] Знает о известных проблемах
- [ ] Понимает следующие шаги
- [ ] Знает о рефакторинге в hooks-архитектуру (НОВОЕ)
- [ ] Понимает контекстную активацию сайдпанели (НОВОЕ)

## Troubleshooting

### Проблема: AI не отвечает как ожидается
**Решение:**
1. Проверьте правильность RAW URL
2. Убедитесь, что файлы добавлены в правильном порядке
3. Перезапустите Cursor
4. Проверьте, что проект открыт

### Проблема: Контекст не загружается
**Решение:**
1. Проверьте доступность gist
2. Убедитесь, что commit hash актуальный
3. Попробуйте локальные файлы
4. Проверьте формат URL

### Проблема: Частичная загрузка контекста
**Решение:**
1. Добавьте недостающие файлы
2. Проверьте порядок загрузки
3. Убедитесь, что все обязательные файлы добавлены

### Проблема: Механизм умной сайдпанели поврежден (КРИТИЧНО)
**Симптомы:**
- Сайдпанель открывается на всех сайтах вместо только ozon.ru и google.com
- Сайдпанель не открывается на ozon.ru или google.com
- Ошибки в консоли при переключении вкладок

**Решение (Пошаговое - ОБНОВЛЕНО для hooks-архитектуры):**

1. **Проверьте ключевые файлы hooks-архитектуры:**
   ```bash
   # Проверьте наличие файлов hooks
   ls -la src/hooks/usePluginManager.ts
   ls -la src/hooks/useSidebarController.ts
   ls -la src/hooks/useBackgroundScript.ts
   ls -la src/hooks/index.ts
   ls -la REFACTORING_SUMMARY.md
   ```

2. **Восстановите функцию getCompatibleSites в usePluginManager.ts:**
   ```typescript
   export const getCompatibleSites = (): string[] => {
     const sites = new Set<string>();
     plugins.forEach(plugin => {
       const manifest = plugin.manifest;
       if (manifest.host_permissions) {
         manifest.host_permissions.forEach(permission => {
           const domain = extractDomainFromPermission(permission);
           if (domain) sites.add(domain);
         });
       }
     });
     return Array.from(sites);
   };
   ```

3. **Восстановите функцию configureSidePanelForTab в useSidebarController.ts:**
   ```typescript
   export const configureSidePanelForTab = async (tab: chrome.tabs.Tab): Promise<void> => {
     if (!tab.id) return;
     
     if (isProtectedUrl(tab.url)) {
       await chrome.sidePanel.setOptions({
         tabId: tab.id,
         enabled: false
       });
     } else {
       const sidebarUrl = `sidepanel.html?tabId=${tab.id}&url=${encodeURIComponent(tab.url || '')}`;
       await chrome.sidePanel.setOptions({
         tabId: tab.id,
         path: sidebarUrl,
         enabled: true
       });
     }
   };
   ```

4. **Проверьте обработку событий вкладок в useBackgroundScript.ts:**
   ```typescript
   // Обработка обновления вкладки
   chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
     if (changeInfo.status === 'complete' && tab.url) {
       await configureSidePanelForTab(tab);
       await manageSidebarForSite(tabId, tab.url);
     }
   });
   ```

5. **Используйте fallback реализацию если основной механизм не работает:**
   ```typescript
   const SIMPLE_COMPATIBLE_SITES = ['ozon.ru', 'google.com'];
   
   const isSiteCompatibleSimple = (url: string): boolean => {
     const domain = new URL(url).hostname;
     return SIMPLE_COMPATIBLE_SITES.some(site => domain.includes(site));
   };
   ```

6. **Проверьте централизованный экспорт в src/hooks/index.ts:**
   ```typescript
   export {
     configureSidePanelForTab,
     toggleSidebarDirectly,
     openSidebarForTab,
     closeSidebarForTab
   } from './useSidebarController';
   ```

7. **Изучите REFACTORING_SUMMARY.md для понимания полной архитектуры:**
   ```bash
   cat REFACTORING_SUMMARY.md
   ```

### Проблема: Hooks-архитектура повреждена (КРИТИЧНО - НОВОЕ)
**Симптомы:**
- Ошибки импорта в background.ts
- Функции не найдены в hooks
- Дублирование кода между модулями
- background.ts стал большим и сложным

**Решение (Пошаговое):**

1. **Проверьте структуру hooks:**
   ```bash
   ls -la src/hooks/
   # Должны быть: index.ts, README.md, useBackgroundScript.ts, useChromeApi.ts, 
   # useStateManager.ts, usePluginHandler.ts, useSidebarController.ts, useMessageHandler.ts, usePluginManager.ts
   ```

2. **Восстановите централизованный экспорт в src/hooks/index.ts:**
   ```typescript
   // Chrome API hooks
   export {
     getActiveTab,
     getTabById,
     sendMessageToTab,
     manageSidebarForSite,
     configureSidebarOptions,
     storage
   } from './useChromeApi';
   
   // State management hooks
   export {
     getOrCreateTabState,
     setTabState,
     getAllTabStates,
     addChatMessage,
     updateChatInput,
     clearChat,
     setActivePlugin,
     addRunningPlugin,
     removeRunningPlugin,
     initializeStateManager
   } from './useStateManager';
   
   // Sidebar controller hooks
   export {
     configureSidePanelForTab,
     toggleSidebarDirectly,
     openSidebarForTab,
     closeSidebarForTab,
     getSidebarState,
     isSidebarOpen,
     isProtectedUrl
   } from './useSidebarController';
   
   // Background script hooks
   export {
     initializeBackgroundScript,
     handleUIMessage,
     handleHostApiMessage
   } from './useBackgroundScript';
   ```

3. **Упростите background.ts до hooks-архитектуры:**
   ```typescript
   import { 
     initializeBackgroundScript, 
     handleUIMessage, 
     handleHostApiMessage,
     toggleSidebarDirectly
   } from './hooks';
   import { logInfo, logError } from './utils/logging';
   
   console.log("APP Background Script Loaded (v0.9.3 - Полная hooks-архитектура).");
   
   // Инициализация
   initializeBackgroundScript().catch(error => {
     logError('Ошибка инициализации background script', error);
   });
   
   // Обработчик сообщений
   chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
     // ... обработка сообщений через hooks
   });
   ```

4. **Проверьте документацию hooks:**
   ```bash
   cat src/hooks/README.md
   ```

5. **Изучите REFACTORING_SUMMARY.md:**
   ```bash
   cat REFACTORING_SUMMARY.md
   ```

## Обновление Контекста

### Когда обновлять
- После значительных изменений в проекте
- При добавлении новых функций
- При изменении архитектуры
- При обновлении принципов работы

### Как обновлять
1. Обновите соответствующие файлы в gist
2. Получите новые RAW URL
3. Обновите ссылки в Cursor
4. Проверьте восстановление

## Резервное Копирование

### Автоматическое резервное копирование
- Все файлы памяти хранятся в `memory-bank/`
- Регулярно синхронизируйте с gist
- Используйте git для версионирования

### Ручное резервное копирование
1. Экспортируйте User Rules из Cursor
2. Сохраните в отдельный файл
3. Добавьте в репозиторий проекта
4. Обновите при изменениях

## Контакты и Поддержка

### В случае проблем
1. Проверьте этот файл
2. Обратитесь к документации проекта
3. Проверьте issues в репозитории
4. Создайте новый issue при необходимости

### Полезные ссылки
- [Проект на GitHub](https://github.com/LebedevIV/agent-plugins-platform)
- [Документация](https://github.com/LebedevIV/agent-plugins-platform/blob/main/README.md)
- [Issues](https://github.com/LebedevIV/agent-plugins-platform/issues)

## Заключение

Этот файл обеспечивает быстрое и надежное восстановление AI-ассистента. Следуйте инструкциям пошагово, и вы сможете восстановить полный контекст за несколько минут.

**Важно**: Регулярно обновляйте этот файл при изменениях в проекте или принципах работы AI-ассистента. 