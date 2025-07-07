// Content Script для Sidebar Chat System
window.APP_EXTENSION_LOADED = true;
console.log('APP Content Script Loaded - Sidebar Integration');

class ContentScriptManager {
    constructor() {
        this.activePlugins = new Map();
        this.currentTabId = null;
        this.init();
    }

    async init() {
        this.setupMessageListener();
        this.setupSidebarIntegration();
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            console.log('Content Script: Получено сообщение', message);

            if (message.tabId) {
                this.currentTabId = message.tabId;
            }

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
                    
                case 'TOGGLE_SIDEBAR':
                    console.log('Content Script: Получен запрос на переключение sidebar');
                    this.toggleSidebar();
                    break;
            }
        });
    }

    setupSidebarIntegration() {
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
            
            if (this.activePlugins.has(pluginName)) {
                console.log(`Content Script: Плагин ${pluginName} уже запущен`);
                return;
            }

            const sessionId = `${pluginName}_${Date.now()}`;
            this.activePlugins.set(pluginName, { sessionId, startTime: Date.now() });

            const response = await chrome.runtime.sendMessage({
                source: 'app-host-api',
                command: 'run_plugin',
                data: { pluginName, sessionId },
                targetTabId: null
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
        
        this.sendToSidebar({
            type: 'USER_MESSAGE_RECEIVED',
            text: text,
            timestamp: Date.now()
        });

        this.activePlugins.forEach((pluginInfo, pluginName) => {
            this.sendToPlugin(pluginName, {
                type: 'USER_INPUT',
                text: text,
                sessionId: pluginInfo.sessionId
            });
        });
    }

    handleUserTyping(text) {
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
        console.log(`Content Script: Отправка в плагин ${pluginName}:`, message);
    }

    getPageInfo() {
        return {
            url: window.location.href,
            title: document.title,
            hostname: window.location.hostname,
            timestamp: Date.now()
        };
    }

    getPageContent() {
        return {
            title: document.title,
            content: document.body.innerText,
            html: document.documentElement.outerHTML,
            url: window.location.href
        };
    }

    getPageHtml() {
        return document.documentElement.outerHTML;
    }

    async toggleSidebar() {
        try {
            console.log('Content Script: Отправляем запрос на переключение sidebar, tabId:', this.currentTabId);
            await chrome.runtime.sendMessage({
                type: 'TOGGLE_SIDEBAR_REQUEST',
                tabId: this.currentTabId
            });
            console.log('Content Script: Запрос отправлен успешно');
        } catch (error) {
            console.error('Content Script: Ошибка переключения sidebar:', error);
        }
    }
}

async function initContentScript() {
    await new ContentScriptManager().init();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initContentScript);
} else {
    initContentScript();
} 