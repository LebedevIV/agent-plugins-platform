// Content Script для Sidebar Chat System
console.log('=== CONTENT SCRIPT START ===');

// Устанавливаем маркер через postMessage
window.postMessage({
    type: 'APP_EXTENSION_LOADED',
    data: true
}, '*');

console.log('✅ Маркер отправлен через postMessage');

try {
    console.log('✅ Chrome API доступен:', !!window.chrome);
    console.log('✅ Chrome runtime доступен:', !!window.chrome?.runtime);
} catch (error) {
    console.error('❌ Ошибка доступа к Chrome API:', error);
}

// Слушаем сообщения от страницы для проксирования Chrome API
window.addEventListener('message', async (event) => {
    if (event.data && event.data.type === 'CHROME_API_REQUEST') {
        try {
            const { requestId, method, params } = event.data;
            
            console.log(`🔄 Проксирование Chrome API: ${method}`, params);
            
            let result;
            switch (method) {
                case 'runtime.sendMessage':
                    if (params && params.type === 'TOGGLE_SIDEBAR' && !params.tabId) {
                        if (window.__contentScriptManager && window.__contentScriptManager.currentTabId) {
                            params.tabId = window.__contentScriptManager.currentTabId;
                        }
                    }
                    result = await new Promise((resolve, reject) => {
                        chrome.runtime.sendMessage(params, (response) => {
                            if (chrome.runtime.lastError) {
                                reject(chrome.runtime.lastError);
                            } else {
                                resolve(response);
                            }
                        });
                    });
                    break;
                    
                case 'runtime.id':
                    result = chrome.runtime.id;
                    break;
                    
                default:
                    throw new Error(`Неизвестный метод: ${method}`);
            }
            
            // Отправляем результат обратно на страницу
            window.postMessage({
                type: 'CHROME_API_RESPONSE',
                requestId,
                result,
                success: true
            }, '*');
            
        } catch (error) {
            console.error('❌ Ошибка проксирования Chrome API:', error);
            
            window.postMessage({
                type: 'CHROME_API_RESPONSE',
                requestId: event.data.requestId,
                error: error.message,
                success: false
            }, '*');
        }
    }
});

class ContentScriptManager {
    constructor() {
        this.activePlugins = new Map();
        this.currentTabId = null;
        window.__contentScriptManager = this;
        this.init();
    }

    async init() {
        await this.getCurrentTabId();
        this.setupMessageListener();
        this.setupSidebarIntegration();
    }

    async getCurrentTabId() {
        try {
            // Получаем tabId через background script
            const response = await chrome.runtime.sendMessage({
                type: 'GET_CURRENT_TAB_ID'
            });
            
            if (response && response.success && response.tabId) {
                this.currentTabId = response.tabId;
                console.log('Content Script: Получен tabId:', this.currentTabId);
            } else {
                console.warn('Content Script: Не удалось получить tabId');
            }
        } catch (error) {
            console.error('Content Script: Ошибка получения tabId:', error);
        }
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
                targetTabId: this.currentTabId
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
                targetTabId: this.currentTabId
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
            
            // Если tabId не установлен, попробуем получить его снова
            if (!this.currentTabId) {
                await this.getCurrentTabId();
            }
            
            await chrome.runtime.sendMessage({
                type: 'TOGGLE_SIDEBAR',
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

console.log('=== CONTENT SCRIPT END ==='); 