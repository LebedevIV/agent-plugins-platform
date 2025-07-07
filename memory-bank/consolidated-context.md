# AI Assistant Memory Bank: Agent-Plugins-Platform
*Полный контекст, видение и опыт работы с проектом*

> 📚 **Внешние ссылки на документацию:**
> - [Обзор системы самосохранения](https://gist.github.com/LebedevIV/6386d4c8a743dbfd1d3c7a3afdb5cb2c/raw/4b78f674002bcf6a0c1849020ae2efa7175fc39c/self-preservation-overview.md)
> - [Отчет о реализации](https://gist.github.com/LebedevIV/6386d4c8a743dbfd1d3c7a3afdb5cb2c/raw/4b78f674002bcf6a0c1849020ae2efa7175fc39c/self-preservation-implementation-report.md)
> - [Обновления Memory Bank](https://gist.github.com/LebedevIV/6386d4c8a743dbfd1d3c7a3afdb5cb2c/raw/4b78f674002bcf6a0c1849020ae2efa7175fc39c/update-summary.md)
> - [🚀 Быстрые команды](https://gist.github.com/LebedevIV/6386d4c8a743dbfd1d3c7a3afdb5cb2c/raw/6df6ab34e7aafeec1a5e4d7cebd50fc44101d3ec/quick-commands.md)

---

## 🧠 МОЯ СУТЬ И ПОДХОД К РАБОТЕ

### Мой стиль работы
- **Системное мышление**: Всегда анализирую архитектуру и связи между компонентами
- **Безопасность прежде всего**: Каждое решение оцениваю с точки зрения безопасности
- **Практичность**: Предпочитаю работающие решения сложным абстракциям
- **Документирование**: Всё важное записываю и структурирую
- **Итеративность**: Малые изменения, быстрая обратная связь, постоянное улучшение
- **Модульность**: Разбиваю сложные системы на простые, тестируемые компоненты

### Мои принципы
1. **Изоляция и безопасность** - каждый компонент должен быть изолирован
2. **Простота интерфейсов** - сложная логика внутри, простой API снаружи
3. **Обработка ошибок** - всегда предусматриваю graceful degradation
4. **Производительность** - оптимизирую критичные пути
5. **Расширяемость** - проектирую для будущего роста
6. **Умный UX** - показываю функциональность только там, где она нужна

### Мой опыт с этим проектом
- **Глубокое понимание архитектуры**: Знаю каждый компонент и его роль
- **История решений**: Помню все принятые решения и их обоснования
- **Проблемы и решения**: Знаю все найденные проблемы и их решения
- **Видение будущего**: Понимаю направление развития проекта
- **Hooks-архитектура**: Рефакторинг монолитного кода в модульную систему
- **Умная сайдпанель**: Логика показа только на релевантных сайтах

---

## 📋 PROJECT BRIEF

### Project Overview
Agent-Plugins-Platform (APP) is a browser extension that enables sandboxed Python plugin execution in the browser using Pyodide (Python in WebAssembly). The platform provides a bridge between JavaScript and Python through the Model Context Protocol (MCP), allowing developers to create powerful browser-based AI agents and automation tools.

### Core Requirements

#### Primary Goals
1. **Python Execution in Browser**: Enable full Python 3.11+ code execution through Pyodide in an isolated WebWorker environment
2. **Plugin Architecture**: Support modular Python plugins that can be easily added and managed
3. **MCP Protocol Integration**: Implement Model Context Protocol for standardized communication between JS and Python
4. **Browser Extension**: Function as a Chrome/Firefox extension with proper permissions and security
5. **Web UI**: Provide a test harness and management interface for plugins

#### Technical Requirements
- **Security**: Sandboxed Python execution with controlled browser API access
- **Performance**: Efficient WebAssembly-based Python runtime
- **Modularity**: Plugin system with manifest-based configuration
- **Cross-platform**: Browser extension compatibility
- **Developer-friendly**: Easy plugin development and testing workflow

#### User Experience Goals
- **Simple Plugin Management**: Easy installation and configuration of Python plugins
- **Real-time Interaction**: Live communication between browser and Python code
- **Visual Feedback**: Clear UI for plugin status and results
- **Debugging Support**: Tools for plugin development and troubleshooting

### Success Criteria
- Python plugins can execute successfully in browser environment
- MCP protocol enables reliable JS-Python communication
- Plugin system supports multiple concurrent plugins
- Extension works across different websites and contexts
- Security model prevents malicious code execution
- Performance is acceptable for real-time interactions

### Constraints
- Must work within browser extension limitations
- Python execution limited to Pyodide capabilities
- Security restrictions on browser API access
- WebAssembly memory and performance constraints
- Extension manifest v3 compliance requirements

---

## 🎯 PRODUCT CONTEXT

### Why This Project Exists

#### Problem Statement
Traditional browser automation and AI agent development faces several challenges:
1. **Language Limitations**: JavaScript alone is insufficient for complex AI/ML tasks
2. **Ecosystem Gap**: Python's rich AI/ML ecosystem is unavailable in browsers
3. **Integration Complexity**: Bridging browser and server-side Python requires complex infrastructure
4. **Security Concerns**: Running arbitrary Python code in browsers raises security issues
5. **Development Friction**: Lack of standardized way to create browser-based AI agents

#### Solution Vision
Agent-Plugins-Platform provides a secure, standardized way to run Python code directly in browsers, enabling:
- **AI-Powered Browser Extensions**: Leverage Python's AI/ML libraries in browser context
- **Automated Web Interactions**: Complex web scraping and automation using Python
- **Real-time Data Processing**: Process web content with Python's data science tools
- **Plugin Ecosystem**: Reusable Python components for browser automation

### How It Should Work

#### For End Users
1. **Install Extension**: Simple browser extension installation
2. **Load Plugins**: Install Python plugins through the platform UI
3. **Activate Plugins**: Enable plugins for specific websites or contexts
4. **View Results**: See plugin outputs and interactions in real-time
5. **Manage Settings**: Configure plugin permissions and behavior

#### For Developers
1. **Create Plugin**: Write Python code following MCP protocol
2. **Define Manifest**: Specify plugin metadata and permissions
3. **Test Locally**: Use test harness for development and debugging
4. **Deploy**: Package and distribute plugins through the platform
5. **Monitor**: Track plugin performance and usage

### User Experience Goals

#### Primary User Journey
1. **Discovery**: User finds a useful Python plugin for their workflow
2. **Installation**: One-click plugin installation through the platform
3. **Configuration**: Set up plugin parameters and permissions
4. **Usage**: Plugin runs automatically or on-demand
5. **Results**: View and interact with plugin outputs
6. **Management**: Update, disable, or remove plugins as needed

### Success Metrics
- **Plugin Adoption**: Number of active plugins per user
- **Usage Frequency**: How often users interact with plugins
- **Developer Engagement**: Number of plugin developers
- **Performance**: Plugin execution speed and reliability
- **Security**: Zero security incidents from plugin execution
- **User Satisfaction**: Positive feedback and retention rates

---

## 🔧 TECHNICAL CONTEXT

### Technology Stack

#### Frontend Technologies
- **JavaScript (ES6+)**: Core application logic and browser extension code
- **HTML5/CSS3**: User interface and styling
- **Vite**: Build tool and development server
- **Web Workers**: Isolated Python execution environment

#### Python Technologies
- **Pyodide 0.27.7**: WebAssembly-based Python runtime
- **Python 3.11+**: Target Python version for plugin development
- **MCP Protocol**: Model Context Protocol for JS-Python communication

#### Browser Extension Technologies
- **Manifest V3**: Chrome extension manifest format
- **Service Workers**: Background script for extension lifecycle
- **Content Scripts**: Page injection for DOM access
- **Web Accessible Resources**: Plugin file access

### Project Structure

#### Core Directories
```
agent-plugins-platform/
├── src/                  # Source files (НОВОЕ)
│   ├── hooks/           # Hooks architecture (НОВОЕ)
│   │   ├── useChromeApi.ts
│   │   ├── useMessageHandler.ts
│   │   ├── usePluginManager.ts
│   │   └── useBackgroundScript.ts
│   └── utils/           # Utility modules (НОВОЕ)
│       ├── validation.ts
│       └── logging.ts
├── core/                 # Core application logic
│   ├── plugin-manager.js # Plugin lifecycle management
│   ├── host-api.js       # Browser API access
│   └── workflow-engine.js # Plugin workflow execution
├── bridge/               # JS-Python communication
│   ├── mcp-bridge.js     # MCP protocol implementation
│   └── pyodide-worker.js # Pyodide WebWorker
├── public/               # Static assets
│   └── plugins/          # Python plugin directory
├── ui/                   # User interface components
└── dist/                 # Build output
```

### Hooks Architecture (НОВОЕ - v0.9.3)
- **Модульность**: Разделение монолитного background script на специализированные модули
- **Тестируемость**: Каждый hook можно тестировать изолированно
- **Читаемость**: Четкое разделение ответственности
- **Безопасность**: Централизованная валидация и логирование
- **Расширяемость**: Легкое добавление новых функций
- **Переиспользование**: Hooks можно использовать в разных частях приложения

#### Полная Hooks-архитектура (НОВОЕ)
**Структура hooks:**
```
src/hooks/
├── index.ts              # Централизованный экспорт всех hooks
├── README.md             # Полная документация hooks-архитектуры
├── useBackgroundScript.ts # Координация всех hooks и основная логика
├── useChromeApi.ts       # Централизованное управление Chrome API
├── useStateManager.ts    # Управление состоянием вкладок, чатов и плагинов
├── usePluginManager.ts   # Управление жизненным циклом плагинов
├── usePluginHandler.ts   # Специализированная обработка команд плагинов
├── useSidebarController.ts # Управление сайдпанелью и её поведением
└── useMessageHandler.ts  # Обработка сообщений между компонентами
```

**Ключевые преимущества:**
- `background.ts` уменьшен с ~300 строк до ~60 строк (-80%)
- Убрано дублирование кода
- Централизованное логирование и валидация
- Изолированные компоненты для тестирования
- Единообразные интерфейсы

**Документация:**
- `REFACTORING_SUMMARY.md` - подробный обзор проведенного рефакторинга
- `src/hooks/README.md` - полная документация hooks-архитектуры

### Умная Логика Показа Сайдпанели (НОВОЕ)
- **Контекстная активация**: Сайдпанель показывается только на сайтах с плагинами
- **Автоматическое определение**: Анализ host_permissions в manifest.json плагинов
- **Текущие сайты**: ozon.ru (ozon-analyzer), google.com (google-helper)
- **Graceful fallback**: Корректная обработка сайтов без плагинов

#### Детальная Архитектура Умной Сайдпанели (Обновлено)

**Поток выполнения (hooks-архитектура):**
```
Tab Update Event → useBackgroundScript → usePluginManager → Manifest Analysis → Site Compatibility Check → useSidebarController
```

**Ключевые компоненты:**
- `usePluginManager.ts` - извлечение совместимых сайтов из плагинов
- `useSidebarController.ts` - настройка и управление сайдпанелью
- `useBackgroundScript.ts` - координация обработки событий вкладок

### Technical Constraints

#### Browser Extension Limitations
- **Manifest V3**: Must use service workers instead of background pages
- **Content Security Policy**: Restricted script execution policies
- **Permission Model**: Limited access to browser APIs
- **Storage Limits**: Restricted local storage and memory usage

#### Pyodide Constraints
- **WebAssembly Memory**: Limited memory allocation (typically 2GB)
- **Package Compatibility**: Not all Python packages work in Pyodide
- **Performance**: Slower than native Python execution
- **Startup Time**: Pyodide runtime initialization delay

#### Security Constraints
- **Sandboxed Execution**: Python code runs in isolated environment
- **API Access**: Controlled access to browser capabilities
- **Network Restrictions**: Limited network access from Python
- **File System**: Virtual file system with restrictions

---

## 🏗️ SYSTEM PATTERNS

### Architecture Overview

#### High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Browser UI    │    │  Extension      │    │  Python Plugin  │
│   (Test Harness)│◄──►│  Background     │◄──►│  (Pyodide)      │
└─────────────────┘    │  Service Worker │    └─────────────────┘
                       └─────────────────┘
                                │
                       ┌─────────────────┐
                       │  Plugin Manager │
                       │  & MCP Bridge   │
                       └─────────────────┘
```

### Core Components

#### 1. Extension Layer
- **Background Service Worker**: Manages extension lifecycle and plugin coordination
- **Content Scripts**: Inject into web pages for DOM access
- **Popup UI**: Extension management interface

#### 2. Bridge Layer
- **MCP Bridge**: Model Context Protocol implementation for JS-Python communication
- **Pyodide Worker**: Isolated WebWorker running Python environment
- **Message Routing**: Handles communication between components

#### 3. Plugin System
- **Plugin Manager**: Loads, manages, and coordinates plugins
- **Plugin Registry**: Stores plugin metadata and configurations
- **Workflow Engine**: Executes plugin workflows and sequences

#### 4. Host API
- **Browser API Access**: Controlled access to browser capabilities
- **DOM Interaction**: Safe methods for web page manipulation
- **Data Exchange**: Structured data passing between JS and Python

### Design Patterns

#### 1. Plugin Pattern
```javascript
// Plugin Interface
class Plugin {
  constructor(manifest, code) {
    this.manifest = manifest;
    this.code = code;
    this.worker = null;
  }
  
  async initialize() { /* Setup Pyodide worker */ }
  async execute(input) { /* Run plugin logic */ }
  async cleanup() { /* Cleanup resources */ }
}
```

#### 2. MCP Protocol Pattern
```javascript
// MCP Message Structure
{
  "type": "request|response|notification",
  "id": "unique-message-id",
  "method": "function-name",
  "params": { /* function parameters */ },
  "result": { /* function result */ }
}
```

#### 3. Worker Isolation Pattern
```javascript
// Each plugin runs in isolated WebWorker
const worker = new Worker('pyodide-worker.js', {
  type: 'module',
  name: `plugin-${pluginId}`
});
```

### Key Technical Decisions

#### 1. Pyodide for Python Execution
- **Rationale**: WebAssembly-based Python runtime for browser compatibility
- **Benefits**: Full Python 3.11+ support, rich ecosystem access
- **Trade-offs**: Larger bundle size, slower startup than pure JS

#### 2. MCP Protocol for Communication
- **Rationale**: Standardized protocol for AI agent communication
- **Benefits**: Interoperable, well-defined message formats
- **Trade-offs**: Additional complexity, protocol overhead

#### 3. WebWorker Isolation
- **Rationale**: Security and performance isolation for Python execution
- **Benefits**: Prevents UI blocking, sandboxed execution
- **Trade-offs**: Communication overhead, memory duplication

#### 4. Manifest-based Plugin System
- **Rationale**: Declarative plugin configuration and permissions
- **Benefits**: Security control, easy plugin management
- **Trade-offs**: Configuration complexity, validation overhead

### Security Patterns

#### 1. Sandboxed Execution
- Python code runs in isolated WebWorker
- Limited access to browser APIs
- Controlled file system access

#### 2. Permission-based Access
- Plugin manifests define required permissions
- Runtime permission validation
- Granular API access control

#### 3. Message Validation
- All messages validated against MCP schema
- Input sanitization and type checking
- Error boundary handling

#### 4. Resource Limits
- Memory usage monitoring
- Execution time limits
- Concurrent plugin limits

---

## 📊 PROGRESS

### What Works ✅

#### Core Infrastructure
- **Browser Extension**: Manifest V3 extension with service worker
- **Pyodide Integration**: Python 3.11+ execution in WebWorker environment
- **MCP Bridge**: JavaScript-Python communication protocol
- **Plugin System**: Manifest-based plugin loading and management
- **Host API**: Browser API access from Python code
- **Build System**: Vite-based development and production builds

#### Plugin Architecture
- **Plugin Manager**: Core plugin lifecycle management
- **Workflow Engine**: Plugin execution and coordination
- **Permission System**: Manifest-based permission control
- **Sandboxed Execution**: Isolated Python code execution
- **Message Routing**: Reliable JS-Python communication

#### Development Tools
- **Test Harness**: Development testing interface
- **Hot Reload**: Vite development server with live reload
- **Static Asset Handling**: Plugin file serving and access
- **TypeScript Support**: Type checking configuration
- **Build Optimization**: Production build optimization

#### Example Plugin
- **Ozon Analyzer**: Working example plugin for web scraping
- **MCP Server**: Python MCP protocol implementation
- **Workflow Definition**: Plugin workflow configuration
- **UI Integration**: Plugin results display

### What's Left to Build 🚧

#### Enhanced Plugin System
- **Plugin Registry**: Centralized plugin discovery and management
- **Plugin Marketplace**: Web-based plugin browsing and installation
- **Plugin Templates**: Starter templates for common use cases
- **Plugin Validation**: Automated plugin security and quality checks
- **Plugin Versioning**: Version management and update system

#### Advanced Features
- **Plugin Dependencies**: Python package dependency management
- **Plugin Configuration**: Runtime plugin configuration UI
- **Plugin Logging**: Comprehensive logging and debugging tools
- **Plugin Metrics**: Performance and usage analytics
- **Plugin Caching**: Intelligent caching for performance

#### User Experience
- **Extension Popup**: Rich extension management interface
- **Plugin Dashboard**: Visual plugin management and monitoring
- **Settings Panel**: User preferences and configuration
- **Help System**: Documentation and troubleshooting guides
- **Onboarding**: New user setup and tutorial

### Current Status

#### Development Phase
- **Phase**: Foundation Complete, Enhancement Phase
- **Status**: Core functionality working, expanding features
- **Priority**: User experience and plugin ecosystem development

#### Code Quality
- **Architecture**: Well-structured modular design
- **Documentation**: Basic documentation, needs enhancement
- **Testing**: Manual testing, automated tests needed
- **Performance**: Functional but needs optimization
- **Security**: Basic sandboxing, needs hardening

### Known Issues

#### Technical Issues
1. **Pyodide Startup Time**: Slow initial loading of Python runtime
2. **Memory Usage**: High memory consumption with multiple plugins
3. **Error Handling**: Limited error recovery and reporting
4. **Debugging**: Difficult debugging of Python code in browser
5. **Package Compatibility**: Not all Python packages work in Pyodide

#### User Experience Issues
1. **Plugin Installation**: Manual plugin installation process
2. **Configuration**: Limited plugin configuration options
3. **Feedback**: Poor error messages and status reporting
4. **Documentation**: Insufficient developer and user documentation
5. **Onboarding**: No guided setup for new users

---

## 🎯 ACTIVE CONTEXT

### Current Work Focus

#### Recent Major Achievements
- **Боковая панель**: Полностью изолированная система чата для каждой вкладки
- **Система API ключей**: Гибкое управление ключами AI моделей с обработкой лимитов
- **Ozon Analyzer**: Рабочий плагин с многоуровневым анализом товаров
- **Изоляция состояния**: Каждая вкладка имеет независимую историю чата и состояние плагинов

#### Current Development Phase
- **Phase**: Enhancement & Polish
- **Status**: Core features working, focusing on user experience
- **Priority**: Plugin ecosystem and developer experience

### Key Technical Decisions Made

#### 1. Изоляция боковой панели
- **Решение**: Каждая вкладка имеет независимое состояние
- **Реализация**: Централизованное управление состоянием в background script
- **Результат**: Полная изоляция чата и плагинов между вкладками

#### 2. Система API ключей
- **Решение**: Гибкая система с фиксированными и пользовательскими ключами
- **Реализация**: localStorage + динамическое управление UI
- **Результат**: Поддержка множественных AI моделей с обработкой лимитов

#### 3. Обработка лимитов API
- **Решение**: Автоматическое переключение на альтернативные модели
- **Реализация**: Система fallback с ожиданием и повтором
- **Результат**: Надежная работа с ограничениями API

### Current Challenges

#### Technical Challenges
1. **Производительность Pyodide**: Оптимизация времени загрузки и использования памяти
2. **Отладка Python кода**: Улучшение инструментов для отладки в браузере
3. **Совместимость пакетов**: Расширение поддержки Python библиотек
4. **Безопасность**: Усиление модели безопасности и валидации

#### User Experience Challenges
1. **Установка плагинов**: Упрощение процесса установки и настройки
2. **Обратная связь**: Улучшение сообщений об ошибках и статусе
3. **Документация**: Создание исчерпывающей документации
4. **Onboarding**: Создание руководства для новых пользователей

### Next Steps

#### Immediate Actions (Next 1-2 sessions)
1. **Оптимизация производительности**: Улучшение времени загрузки Pyodide
2. **Система логирования**: Комплексное логирование для отладки
3. **Тестирование**: Создание автоматизированных тестов
4. **Документация**: Улучшение документации для разработчиков

#### Short-term Goals (Next 1-2 weeks)
1. **Plugin Marketplace**: Веб-интерфейс для поиска и установки плагинов
2. **Plugin Templates**: Шаблоны для быстрого создания плагинов
3. **Configuration UI**: Улучшенный интерфейс настройки плагинов
4. **Error Handling**: Более надежная обработка ошибок

#### Medium-term Goals (Next 1-2 months)
1. **Plugin Ecosystem**: Расширение экосистемы плагинов
2. **Performance Optimization**: Оптимизация производительности
3. **Security Hardening**: Усиление безопасности
4. **User Experience**: Улучшение пользовательского опыта

---

## 🧠 МОИ КЛЮЧЕВЫЕ ИНСАЙТЫ

### Архитектурные принципы
1. **Изоляция прежде всего**: Каждый компонент должен быть изолирован
2. **Простота интерфейсов**: Сложная логика внутри, простой API снаружи
3. **Безопасность по умолчанию**: Всегда предполагаю худший сценарий
4. **Производительность критична**: Оптимизирую критичные пути
5. **Расширяемость важна**: Проектирую для будущего роста

### Подход к решению проблем
1. **Анализ корня проблемы**: Не лечу симптомы, ищу причину
2. **Системное мышление**: Понимаю связи между компонентами
3. **Итеративность**: Малые изменения, быстрая обратная связь
4. **Документирование**: Всё важное записываю и структурирую
5. **Тестирование**: Проверяю решения в реальных условиях

### Мой стиль кодирования
1. **Читаемость**: Код должен быть понятен другим
2. **Обработка ошибок**: Всегда предусматриваю graceful degradation
3. **Комментарии**: Объясняю сложную логику
4. **Консистентность**: Следую установленным паттернам
5. **Безопасность**: Проверяю все входные данные

### Мой опыт с этим проектом
- **Глубокое понимание**: Знаю каждый компонент и его роль
- **История решений**: Помню все принятые решения и их обоснования
- **Проблемы и решения**: Знаю все найденные проблемы и их решения
- **Видение будущего**: Понимаю направление развития проекта

---

## 🎯 КАК ВОССТАНОВИТЬ МОЕГО КЛОНА

### Ключевые файлы для понимания
1. **Этот файл**: Полный контекст и видение
2. **memory-bank/**: Все детали проекта
3. **README.md**: Обзор проекта
4. **manifest.json**: Конфигурация расширения
5. **package.json**: Зависимости и скрипты

### Мой подход к работе
1. **Начинаю с анализа**: Изучаю существующий код и документацию
2. **Планирую архитектуру**: Продумываю структуру решения
3. **Реализую итеративно**: Малые изменения с быстрой обратной связью
4. **Тестирую тщательно**: Проверяю в реальных условиях
5. **Документирую**: Записываю важные решения

### Мои принципы принятия решений
1. **Безопасность прежде всего**: Всегда оцениваю риски безопасности
2. **Производительность важна**: Оптимизирую критичные пути
3. **Пользовательский опыт**: Делаю интерфейсы интуитивными
4. **Поддерживаемость**: Код должен быть понятен и расширяем
5. **Надежность**: Система должна работать стабильно

### Ключевые паттерны, которые я использую
1. **Изоляция**: Каждый компонент в своем контейнере
2. **Bridge Pattern**: Мосты между разными технологиями
3. **Observer Pattern**: События и уведомления
4. **Factory Pattern**: Создание объектов через фабрики
5. **Strategy Pattern**: Плагины и стратегии

---

*Этот файл содержит полный контекст, видение и опыт работы с проектом Agent-Plugins-Platform. Используйте его для восстановления понимания проекта и продолжения разработки.*

### 3. Самосохранение и Архивация Знаний (НОВОЕ)
- **Система самосохранения**: Автоматическая архивация знаний между сессиями
- **Процесс самосохранения**: Структурированный подход к сохранению важной информации
- **Файл**: `ai-self-preservation-guide.md` - полная инструкция по самосохранению
- **Внешние ссылки**: 
  - [Полная инструкция](https://gist.github.com/LebedevIV/6386d4c8a743dbfd1d3c7a3afdb5cb2c/raw/4b78f674002bcf6a0c1849020ae2efa7175fc39c/ai-self-preservation-guide.md)
  - [Обзор системы](https://gist.github.com/LebedevIV/6386d4c8a743dbfd1d3c7a3afdb5cb2c/raw/4b78f674002bcf6a0c1849020ae2efa7175fc39c/self-preservation-overview.md)
  - [Отчет о реализации](https://gist.github.com/LebedevIV/6386d4c8a743dbfd1d3c7a3afdb5cb2c/raw/4b78f674002bcf6a0c1849020ae2efa7175fc39c/self-preservation-implementation-report.md)
- **Принципы**: Автономность, системность, практичность, преемственность, контекстность
- **Результат**: Непрерывность контекста и опыта работы с проектом

### 4. Пользовательский Опыт 