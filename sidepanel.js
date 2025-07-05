// Sidebar Chat System
class SidebarChat {
    constructor() {
        this.currentTabId = null;
        this.currentUrl = null;
        this.plugins = new Map();
        this.state = {
            chatHistory: [],
            currentInput: '',
            activePlugins: new Set(),
            lastActivity: Date.now()
        };
        this.typingTimeout = null;
        this.typingDelay = 500; // 500ms задержка для ленивой передачи
        this.maxUnsentLength = 100; // Максимальная длина неотправленного текста
        
        this.init();
    }

    async init() {
        await this.setupEventListeners();
        await this.loadCurrentTab();
        await this.loadPlugins();
        await this.loadChatHistory();
        this.setupMessageListener();
        this.setupTabListener();
    }

    async setupEventListeners() {
        // Кнопка отправки
        const sendBtn = document.getElementById('send-btn');
        const chatInput = document.getElementById('chat-input');
        const clearChatBtn = document.getElementById('clear-chat-btn');
        const settingsBtn = document.getElementById('settings-btn');

        sendBtn.addEventListener('click', () => this.sendMessage());
        
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Ленивая передача при печати
        chatInput.addEventListener('input', (e) => {
            this.handleTyping(e.target.value);
        });

        clearChatBtn.addEventListener('click', () => this.clearChat());
        
        // Кнопка настроек
        settingsBtn.addEventListener('click', () => this.openSettings());
    }

    async loadCurrentTab() {
        try {
            // Получаем информацию о текущей вкладке из URL параметров
            const urlParams = new URLSearchParams(window.location.search);
            const tabId = parseInt(urlParams.get('tabId'));
            const url = urlParams.get('url');
            
            if (tabId && url) {
                this.currentTabId = tabId;
                this.currentUrl = url;
                
                // Обновляем информацию о странице
                const pageInfo = document.querySelector('.page-info');
                const urlObj = new URL(url);
                pageInfo.textContent = `${urlObj.hostname}${urlObj.pathname}`;
                
                console.log('Sidebar: Загружена вкладка из URL параметров', { tabId: this.currentTabId, url: this.currentUrl });
            } else {
                // Fallback: получаем активную вкладку
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                this.currentTabId = tab.id;
                this.currentUrl = tab.url;
                
                const pageInfo = document.querySelector('.page-info');
                const urlObj = new URL(tab.url);
                pageInfo.textContent = `${urlObj.hostname}${urlObj.pathname}`;
                
                console.log('Sidebar: Fallback загрузка вкладки', { tabId: this.currentTabId, url: this.currentUrl });
            }
        } catch (error) {
            console.error('Sidebar: Ошибка загрузки вкладки', error);
            const pageInfo = document.querySelector('.page-info');
            pageInfo.textContent = 'Ошибка загрузки страницы';
        }
    }

    async loadPlugins() {
        try {
            console.log('Sidebar: Загрузка плагинов для URL:', this.currentUrl);
            
            // Получаем список плагинов от background script
            const response = await chrome.runtime.sendMessage({
                type: 'GET_PLUGINS',
                url: this.currentUrl
            });

            console.log('Sidebar: Ответ от background script:', response);

            if (response.success) {
                this.plugins = new Map(response.plugins.map(p => [p.name, p]));
                console.log('Sidebar: Загружено плагинов:', this.plugins.size);
                this.renderPlugins();
            } else {
                console.error('Sidebar: Ошибка получения плагинов:', response.error);
            }
        } catch (error) {
            console.error('Sidebar: Ошибка загрузки плагинов', error);
        }
    }

    renderPlugins() {
        const container = document.getElementById('plugins-buttons');
        container.innerHTML = '';

        this.plugins.forEach((plugin, name) => {
            const btn = this.createPluginButton(plugin);
            container.appendChild(btn);
        });
    }

    createPluginButton(plugin) {
        const btn = document.createElement('button');
        btn.className = 'plugin-btn';
        btn.dataset.pluginName = plugin.name;
        btn.title = `${plugin.name} - ${plugin.description}`;

        // Иконка плагина
        const img = document.createElement('img');
        img.src = `plugins/${plugin.name}/icon.svg`;
        img.alt = plugin.name;
        img.onerror = () => {
            img.style.display = 'none';
            btn.textContent = plugin.name.charAt(0).toUpperCase();
        };
        btn.appendChild(img);

        // Индикатор статуса
        const indicator = document.createElement('div');
        indicator.className = 'status-indicator';
        btn.appendChild(indicator);

        // Обработчик клика
        btn.addEventListener('click', () => this.handlePluginClick(plugin));

        return btn;
    }

    async handlePluginClick(plugin) {
        const btn = document.querySelector(`[data-plugin-name="${plugin.name}"]`);
        
        // Проверяем, работает ли уже плагин
        if (btn.classList.contains('running')) {
            const shouldInterrupt = await this.showInterruptDialog(plugin.name);
            if (shouldInterrupt) {
                await this.interruptPlugin(plugin.name);
            } else {
                return;
            }
        }

        // Запускаем плагин
        await this.runPlugin(plugin.name);
    }

    async showInterruptDialog(pluginName) {
        return new Promise((resolve) => {
            const message = `Плагин "${pluginName}" уже работает. Прервать выполнение?`;
            this.addSystemMessage(message);
            
            // Создаем кнопки да/нет
            const buttonsContainer = document.createElement('div');
            buttonsContainer.className = 'interrupt-buttons';
            buttonsContainer.style.cssText = `
                display: flex;
                gap: 8px;
                justify-content: center;
                margin-top: 8px;
            `;

            const yesBtn = document.createElement('button');
            yesBtn.textContent = 'Да';
            yesBtn.style.cssText = `
                padding: 4px 12px;
                background: #ff3860;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            `;

            const noBtn = document.createElement('button');
            noBtn.textContent = 'Нет';
            noBtn.style.cssText = `
                padding: 4px 12px;
                background: #4a4a50;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            `;

            yesBtn.onclick = () => {
                buttonsContainer.remove();
                resolve(true);
            };

            noBtn.onclick = () => {
                buttonsContainer.remove();
                resolve(false);
            };

            buttonsContainer.appendChild(yesBtn);
            buttonsContainer.appendChild(noBtn);

            const lastMessage = document.querySelector('.message:last-child .message-content');
            lastMessage.appendChild(buttonsContainer);
        });
    }

    async runPlugin(pluginName) {
        try {
            console.log('Sidebar: Запуск плагина:', pluginName, 'для вкладки:', this.currentTabId);
            
            const btn = document.querySelector(`[data-plugin-name="${pluginName}"]`);
            btn.classList.add('running');

            // Отправляем команду запуска плагина в background script
            const response = await chrome.runtime.sendMessage({
                type: 'RUN_PLUGIN',
                pluginName: pluginName,
                tabId: this.currentTabId
            });

            if (response.success) {
                this.addSystemMessage(`Запущен плагин: ${pluginName}`);
            } else {
                throw new Error(response.error || 'Неизвестная ошибка');
            }
        } catch (error) {
            console.error('Sidebar: Ошибка запуска плагина', error);
            this.addSystemMessage(`Ошибка запуска плагина ${pluginName}: ${error.message}`);
            
            // Убираем статус "running" при ошибке
            const btn = document.querySelector(`[data-plugin-name="${pluginName}"]`);
            if (btn) {
                btn.classList.remove('running');
            }
        }
    }

    async interruptPlugin(pluginName) {
        try {
            console.log('Sidebar: Прерывание плагина:', pluginName, 'для вкладки:', this.currentTabId);
            
            // Отправляем команду прерывания плагина в background script
            const response = await chrome.runtime.sendMessage({
                type: 'INTERRUPT_PLUGIN',
                pluginName: pluginName,
                tabId: this.currentTabId
            });

            if (response.success) {
                const btn = document.querySelector(`[data-plugin-name="${pluginName}"]`);
                btn.classList.remove('running');
                this.addSystemMessage(`Плагин ${pluginName} прерван`);
            } else {
                throw new Error(response.error || 'Неизвестная ошибка');
            }
        } catch (error) {
            console.error('Sidebar: Ошибка прерывания плагина', error);
            this.addSystemMessage(`Ошибка прерывания плагина ${pluginName}: ${error.message}`);
        }
    }

    handleTyping(text) {
        // Обновляем локальное состояние
        this.state.currentInput = text;
        
        // Очищаем предыдущий таймаут
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }
        
        // Отправляем обновление в background script с задержкой
        this.typingTimeout = setTimeout(() => {
            this.sendTypingUpdate(text);
        }, this.typingDelay);
        
        // Показываем индикатор печати
        this.showTypingIndicator();
    }

    async sendTypingUpdate(text) {
        try {
            if (!this.currentTabId) return;
            
            await chrome.runtime.sendMessage({
                type: 'UPDATE_INPUT',
                tabId: this.currentTabId,
                input: text
            });
            
            this.hideTypingIndicator();
        } catch (error) {
            console.error('Sidebar: Ошибка отправки обновления ввода', error);
        }
    }

    showTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        indicator.classList.add('visible');
    }

    hideTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        indicator.classList.remove('visible');
    }

    async sendMessage() {
        const chatInput = document.getElementById('chat-input');
        const text = chatInput.value.trim();
        
        if (!text) return;
        
        try {
            if (!this.currentTabId) return;
            
            // Отправляем сообщение в background script
            await chrome.runtime.sendMessage({
                type: 'SEND_MESSAGE',
                tabId: this.currentTabId,
                content: text
            });
            
            // Очищаем поле ввода
            chatInput.value = '';
            this.state.currentInput = '';
            
            // Добавляем сообщение в UI
            this.addUserMessage(text);
            
        } catch (error) {
            console.error('Sidebar: Ошибка отправки сообщения', error);
            this.addSystemMessage('Ошибка отправки сообщения');
        }
    }

    addUserMessage(text) {
        const message = this.createMessage('user', text);
        document.getElementById('chat-messages').appendChild(message);
        this.scrollToBottom();
    }

    addPluginMessage(pluginName, text) {
        const message = this.createMessage('plugin', text, pluginName);
        document.getElementById('chat-messages').appendChild(message);
        this.scrollToBottom();
    }

    addSystemMessage(text) {
        const message = this.createMessage('system', text);
        document.getElementById('chat-messages').appendChild(message);
        this.scrollToBottom();
    }

    createMessage(type, text, pluginName = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';

        if (pluginName) {
            contentDiv.innerHTML = `<strong>${pluginName}:</strong> ${text}`;
        } else {
            contentDiv.textContent = text;
        }

        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time';
        timeDiv.textContent = new Date().toLocaleTimeString();

        messageDiv.appendChild(contentDiv);
        messageDiv.appendChild(timeDiv);

        return messageDiv;
    }

    scrollToBottom() {
        const messages = document.getElementById('chat-messages');
        messages.scrollTop = messages.scrollHeight;
    }

    async loadChatHistory() {
        try {
            if (!this.currentTabId) return;
            
            // Получаем состояние от background script
            const response = await chrome.runtime.sendMessage({
                type: 'GET_STATE',
                tabId: this.currentTabId
            });

            if (response.success && response.state) {
                this.state = {
                    chatHistory: response.state.chatHistory || [],
                    currentInput: response.state.currentInput || '',
                    activePlugins: new Set(response.state.activePlugins || []),
                    lastActivity: response.state.lastActivity || Date.now()
                };
                
                // Обновляем UI
                this.renderChatHistory();
                this.updateInputValue();
                this.updatePluginStatuses();
                
                console.log('Sidebar: Загружена история чата для вкладки', this.currentTabId);
            } else {
                console.log('Sidebar: Нет сохраненной истории для вкладки', this.currentTabId);
            }
        } catch (error) {
            console.error('Sidebar: Ошибка загрузки истории чата', error);
        }
    }

    renderChatHistory() {
        const messagesContainer = document.getElementById('chat-messages');
        messagesContainer.innerHTML = '';
        
        this.state.chatHistory.forEach(msg => {
            const message = this.createMessage(msg.type, msg.content, msg.pluginName);
            messagesContainer.appendChild(message);
        });
        
        this.scrollToBottom();
    }

    updateInputValue() {
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.value = this.state.currentInput;
        }
    }

    updatePluginStatuses() {
        this.state.activePlugins.forEach(pluginName => {
            const btn = document.querySelector(`[data-plugin-name="${pluginName}"]`);
            if (btn) {
                btn.classList.add('running');
            }
        });
    }



    async clearChat() {
        try {
            if (!this.currentTabId) return;
            
            // Отправляем команду очистки в background script
            await chrome.runtime.sendMessage({
                type: 'CLEAR_CHAT',
                tabId: this.currentTabId
            });
            
            // Очищаем UI
            const messages = document.getElementById('chat-messages');
            messages.innerHTML = '';
            
            // Добавляем системное сообщение
            this.addSystemMessage('История чата очищена');
            
        } catch (error) {
            console.error('Sidebar: Ошибка очистки чата', error);
        }
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            console.log('Sidebar: Получено сообщение:', message.type, 'для вкладки:', message.tabId, 'текущая вкладка:', this.currentTabId);
            
            // Обрабатываем обновления состояния от background script
            if (message.type === 'STATE_UPDATE') {
                // Проверяем, что сообщение для текущей вкладки
                if (message.tabId === this.currentTabId) {
                    console.log('Sidebar: Обновление состояния для текущей вкладки:', this.currentTabId);
                    this.state = {
                        chatHistory: message.state.chatHistory || [],
                        currentInput: message.state.currentInput || '',
                        activePlugins: new Set(message.state.activePlugins || []),
                        lastActivity: message.state.lastActivity || Date.now()
                    };
                    
                    // Обновляем UI
                    this.renderChatHistory();
                    this.updateInputValue();
                    this.updatePluginStatuses();
                } else {
                    console.log('Sidebar: Сообщение для другой вкладки, игнорируем');
                }
                return;
            }

            // Обрабатываем сообщения от content script
            if (sender.tab?.id !== this.currentTabId) return;

            switch (message.type) {
                case 'PLUGIN_MESSAGE':
                    this.addPluginMessage(message.pluginName, message.text);
                    break;
                    
                case 'PLUGIN_FINISHED':
                    this.handlePluginFinished(message.pluginName);
                    break;
                    
                case 'PLUGIN_ERROR':
                    this.addSystemMessage(`Ошибка плагина ${message.pluginName}: ${message.error}`);
                    this.handlePluginFinished(message.pluginName);
                    break;
            }
        });
    }

    handlePluginFinished(pluginName) {
        const btn = document.querySelector(`[data-plugin-name="${pluginName}"]`);
        if (btn) {
            btn.classList.remove('running');
        }
    }

    openSettings() {
        // Открываем страницу управления платформой
        const platformUrl = chrome.runtime.getURL('index.html');
        chrome.tabs.create({ url: platformUrl });
    }

    setupTabListener() {
        // Слушаем изменения вкладок
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (tabId === this.currentTabId && changeInfo.url) {
                this.currentUrl = changeInfo.url;
                this.updatePageInfo();
                this.loadPlugins();
                this.loadChatHistory();
            }
        });

        // Слушаем активацию вкладок
        chrome.tabs.onActivated.addListener((activeInfo) => {
            console.log('Sidebar: Активирована вкладка:', activeInfo.tabId, 'текущая вкладка сайдбара:', this.currentTabId);
            
            // Если активирована другая вкладка, обновляем информацию
            if (activeInfo.tabId !== this.currentTabId) {
                console.log('Sidebar: Переключение на другую вкладку, обновляем состояние');
                this.currentTabId = activeInfo.tabId;
                this.refreshTabInfo();
                this.loadChatHistory();
            }
        });
    }

    async refreshTabInfo() {
        try {
            console.log('Sidebar: Обновление информации о вкладке:', this.currentTabId);
            const tab = await chrome.tabs.get(this.currentTabId);
            
            // Всегда обновляем URL и информацию о странице
            this.currentUrl = tab.url;
            this.updatePageInfo();
            
            // Загружаем плагины для новой вкладки
            await this.loadPlugins();
            
            console.log('Sidebar: Информация о вкладке обновлена:', { tabId: this.currentTabId, url: this.currentUrl });
        } catch (error) {
            console.error('Sidebar: Ошибка обновления информации о вкладке', error);
        }
    }

    updatePageInfo() {
        if (this.currentUrl) {
            const pageInfo = document.querySelector('.page-info');
            const urlObj = new URL(this.currentUrl);
            pageInfo.textContent = `${urlObj.hostname}${urlObj.pathname}`;
        }
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new SidebarChat();
}); 