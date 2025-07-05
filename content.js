// Content Script для Sidebar Chat System
console.log('APP Content Script Loaded - Sidebar Integration');

class ContentScriptManager {
    constructor() {
        this.activePlugins = new Map();
        this.init();
    }

    init() {
        this.setupMessageListener();
        this.setupSidebarIntegration();
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            console.log('Content Script: Получено сообщение', message);

            switch (message.type) {
                case 'RUN_PLUGIN':
                    this.runPlugin(message.pluginName);
                    break;
                    
                case 'INTERRUPT_PLUGIN':
                    this.interruptPlugin(message.pluginName);
                    break;
                    
                case 'USER_MESSAGE':
                    this.handleUserMessage(message.text);
                    break;
                    
                case 'USER_TYPING':
                    this.handleUserTyping(message.text);
                    break;
            }
        });
    }

    setupSidebarIntegration() {
        // Отправляем информацию о текущей странице в sidebar
        this.sendToSidebar({
            type: 'PAGE_INFO',
            url: window.location.href,
            title: document.title,
            hostname: window.location.hostname
        });
    }

    async runPlugin(pluginName) {
        try {
            console.log(`Content Script: Запуск плагина ${pluginName}`);
            
            // Проверяем, не запущен ли уже плагин
            if (this.activePlugins.has(pluginName)) {
                console.log(`Content Script: Плагин ${pluginName} уже запущен`);
                return;
            }

            // Создаем уникальный ID для сессии плагина
            const sessionId = `${pluginName}_${Date.now()}`;
            this.activePlugins.set(pluginName, { sessionId, startTime: Date.now() });

            // Отправляем сообщение в background script для запуска плагина
            const response = await chrome.runtime.sendMessage({
                source: 'app-host-api',
                command: 'run_plugin',
                data: { pluginName, sessionId },
                targetTabId: null // Будет установлен в background
            });

            if (response && response.success) {
                this.sendToSidebar({
                    type: 'PLUGIN_STARTED',
                    pluginName: pluginName,
                    sessionId: sessionId
                });
            } else {
                throw new Error(response?.error || 'Неизвестная ошибка');
            }

        } catch (error) {
            console.error(`Content Script: Ошибка запуска плагина ${pluginName}:`, error);
            this.activePlugins.delete(pluginName);
            
            this.sendToSidebar({
                type: 'PLUGIN_ERROR',
                pluginName: pluginName,
                error: error.message
            });
        }
    }

    async interruptPlugin(pluginName) {
        try {
            console.log(`Content Script: Прерывание плагина ${pluginName}`);
            
            const pluginInfo = this.activePlugins.get(pluginName);
            if (!pluginInfo) {
                console.log(`Content Script: Плагин ${pluginName} не найден в активных`);
                return;
            }

            // Отправляем сообщение в background script для прерывания
            const response = await chrome.runtime.sendMessage({
                source: 'app-host-api',
                command: 'interrupt_plugin',
                data: { pluginName, sessionId: pluginInfo.sessionId },
                targetTabId: null
            });

            if (response && response.success) {
                this.activePlugins.delete(pluginName);
                
                this.sendToSidebar({
                    type: 'PLUGIN_INTERRUPTED',
                    pluginName: pluginName,
                    sessionId: pluginInfo.sessionId
                });
            }

        } catch (error) {
            console.error(`Content Script: Ошибка прерывания плагина ${pluginName}:`, error);
        }
    }

    handleUserMessage(text) {
        console.log('Content Script: Обработка сообщения пользователя:', text);
        
        // Отправляем сообщение в sidebar
        this.sendToSidebar({
            type: 'USER_MESSAGE_RECEIVED',
            text: text,
            timestamp: Date.now()
        });

        // Здесь можно добавить логику для обработки сообщений плагинами
        // Например, отправка в активные плагины для обработки
        this.activePlugins.forEach((pluginInfo, pluginName) => {
            this.sendToPlugin(pluginName, {
                type: 'USER_INPUT',
                text: text,
                sessionId: pluginInfo.sessionId
            });
        });
    }

    handleUserTyping(text) {
        // Отправляем статус печати в sidebar
        this.sendToSidebar({
            type: 'USER_TYPING_UPDATE',
            text: text,
            timestamp: Date.now()
        });
    }

    sendToSidebar(message) {
        try {
            chrome.runtime.sendMessage(message);
        } catch (error) {
            console.error('Content Script: Ошибка отправки в sidebar:', error);
        }
    }

    sendToPlugin(pluginName, message) {
        // Здесь будет логика отправки сообщений в плагины
        // Пока просто логируем
        console.log(`Content Script: Отправка в плагин ${pluginName}:`, message);
    }

    // Метод для получения информации о странице
    getPageInfo() {
        return {
            url: window.location.href,
            title: document.title,
            hostname: window.location.hostname,
            timestamp: Date.now()
        };
    }

    // Метод для получения контента страницы
    getPageContent() {
        return {
            title: document.title,
            content: document.body.innerText,
            html: document.documentElement.outerHTML
        };
    }
}

// Инициализация при загрузке страницы
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new ContentScriptManager();
    });
} else {
    new ContentScriptManager();
} 