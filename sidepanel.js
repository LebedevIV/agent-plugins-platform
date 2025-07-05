// Sidebar Chat System
class SidebarChat {
    constructor() {
        this.currentTabId = null;
        this.currentUrl = null;
        this.plugins = new Map();
        this.chatHistory = [];
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
    }

    async setupEventListeners() {
        // Кнопка отправки
        const sendBtn = document.getElementById('send-btn');
        const chatInput = document.getElementById('chat-input');
        const clearChatBtn = document.getElementById('clear-chat-btn');

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
    }

    async loadCurrentTab() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            this.currentTabId = tab.id;
            this.currentUrl = tab.url;
            
            // Обновляем информацию о странице
            const pageInfo = document.querySelector('.page-info');
            const url = new URL(tab.url);
            pageInfo.textContent = `${url.hostname}${url.pathname}`;
            
            console.log('Sidebar: Загружена вкладка', { tabId: this.currentTabId, url: this.currentUrl });
        } catch (error) {
            console.error('Sidebar: Ошибка загрузки вкладки', error);
        }
    }

    async loadPlugins() {
        try {
            // Получаем список плагинов от background script
            const response = await chrome.runtime.sendMessage({
                type: 'GET_PLUGINS'
            });

            if (response.success) {
                this.plugins = new Map(response.plugins.map(p => [p.name, p]));
                this.renderPlugins();
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
            const btn = document.querySelector(`[data-plugin-name="${pluginName}"]`);
            btn.classList.add('running');

            // Отправляем сообщение в content script
            await chrome.tabs.sendMessage(this.currentTabId, {
                type: 'RUN_PLUGIN',
                pluginName: pluginName
            });

            this.addSystemMessage(`Запущен плагин: ${pluginName}`);
        } catch (error) {
            console.error('Sidebar: Ошибка запуска плагина', error);
            this.addSystemMessage(`Ошибка запуска плагина ${pluginName}: ${error.message}`);
        }
    }

    async interruptPlugin(pluginName) {
        try {
            await chrome.tabs.sendMessage(this.currentTabId, {
                type: 'INTERRUPT_PLUGIN',
                pluginName: pluginName
            });

            const btn = document.querySelector(`[data-plugin-name="${pluginName}"]`);
            btn.classList.remove('running');

            this.addSystemMessage(`Плагин ${pluginName} прерван`);
        } catch (error) {
            console.error('Sidebar: Ошибка прерывания плагина', error);
        }
    }

    handleTyping(text) {
        // Очищаем предыдущий таймаут
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }

        // Показываем индикатор печати
        this.showTypingIndicator();

        // Если текст превышает максимальную длину, отправляем немедленно
        if (text.length > this.maxUnsentLength) {
            this.sendTypingUpdate(text);
            return;
        }

        // Устанавливаем таймаут для ленивой передачи
        this.typingTimeout = setTimeout(() => {
            this.sendTypingUpdate(text);
            this.hideTypingIndicator();
        }, this.typingDelay);
    }

    async sendTypingUpdate(text) {
        try {
            await chrome.tabs.sendMessage(this.currentTabId, {
                type: 'USER_TYPING',
                text: text
            });
        } catch (error) {
            console.error('Sidebar: Ошибка отправки статуса печати', error);
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
        const input = document.getElementById('chat-input');
        const text = input.value.trim();

        if (!text) return;

        // Очищаем поле ввода
        input.value = '';
        this.hideTypingIndicator();

        // Добавляем сообщение пользователя
        this.addUserMessage(text);

        // Отправляем в content script
        try {
            await chrome.tabs.sendMessage(this.currentTabId, {
                type: 'USER_MESSAGE',
                text: text
            });
        } catch (error) {
            console.error('Sidebar: Ошибка отправки сообщения', error);
            this.addSystemMessage('Ошибка отправки сообщения');
        }
    }

    addUserMessage(text) {
        const message = this.createMessage('user', text);
        document.getElementById('chat-messages').appendChild(message);
        this.scrollToBottom();
        this.saveChatHistory();
    }

    addPluginMessage(pluginName, text) {
        const message = this.createMessage('plugin', text, pluginName);
        document.getElementById('chat-messages').appendChild(message);
        this.scrollToBottom();
        this.saveChatHistory();
    }

    addSystemMessage(text) {
        const message = this.createMessage('system', text);
        document.getElementById('chat-messages').appendChild(message);
        this.scrollToBottom();
        this.saveChatHistory();
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
            const key = this.getChatKey();
            const result = await chrome.storage.local.get(key);
            this.chatHistory = result[key] || [];
            
            // Восстанавливаем историю
            this.chatHistory.forEach(msg => {
                const message = this.createMessage(msg.type, msg.text, msg.pluginName);
                document.getElementById('chat-messages').appendChild(message);
            });
            
            this.scrollToBottom();
        } catch (error) {
            console.error('Sidebar: Ошибка загрузки истории чата', error);
        }
    }

    async saveChatHistory() {
        try {
            const messages = document.querySelectorAll('.message');
            const history = [];

            messages.forEach(msg => {
                const type = msg.classList.contains('user') ? 'user' : 
                           msg.classList.contains('plugin') ? 'plugin' : 'system';
                const text = msg.querySelector('.message-content').textContent;
                const pluginName = msg.querySelector('strong')?.textContent.replace(':', '') || null;
                
                history.push({ type, text, pluginName });
            });

            const key = this.getChatKey();
            await chrome.storage.local.set({ [key]: history });
        } catch (error) {
            console.error('Sidebar: Ошибка сохранения истории чата', error);
        }
    }

    getChatKey() {
        return `chat_history_${this.currentUrl}`;
    }

    async clearChat() {
        const messages = document.getElementById('chat-messages');
        messages.innerHTML = '';
        
        const key = this.getChatKey();
        await chrome.storage.local.remove(key);
        
        this.addSystemMessage('История чата очищена');
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new SidebarChat();
}); 