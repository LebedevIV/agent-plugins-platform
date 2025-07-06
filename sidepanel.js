// import { pluginStateManager } from './core/index.js'; // УДАЛЯЕМ ИМПОРТ

// --- КОД ИЗ core/plugin-state-manager.js БОЛЬШЕ НЕ НУЖЕН ---

// Система боковой панели
class SidebarChat {
    constructor() {
        this.currentTabId = null;
        this.currentUrl = null; // Единственный источник правды о контексте
        this.plugins = new Map();
        this.allPluginStates = {}; // Кэш состояний плагинов

        // Глобальное состояние (активные процессы)
        this.globalState = { 
            runningPlugins: new Set() 
        };
        
        // Состояния чатов для каждого плагина
        this.pluginChatStates = {}; 
        this.activePluginName = null; // Какой чат сейчас активен

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
        // Загрузка плагинов и состояний теперь инициируется из loadCurrentTab
        // после получения ответа от background
        this.setupMessageListener();
        this.setupTabListener();
        this.setupStorageListener(); // ДОБАВЛЯЕМ СЛУШАТЕЛЯ ХРАНИЛИЩА
    }

    async setupEventListeners() {
        // Кнопка отправки
        const sendBtn = document.getElementById('send-btn');
        const chatInput = document.getElementById('chat-input');
        const clearChatBtn = document.getElementById('clear-chat-btn');
        const settingsBtn = document.getElementById('settings-btn');
        const contextCheckBtn = document.getElementById('context-check-btn');

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
        if(settingsBtn) {
        settingsBtn.addEventListener('click', () => this.openSettings());
        }
        contextCheckBtn.addEventListener('click', () => this.handleContextCheck());

        // Используем делегирование событий для динамически создаваемых элементов
        const pluginsButtons = document.getElementById('plugins-buttons');
        pluginsButtons.addEventListener('click', this.handlePluginToggle.bind(this));
        
        // Слушаем клики по кнопкам и выпадающим меню
        document.addEventListener('click', (e) => {
            const pluginBtn = e.target.closest('.plugin-btn');
            const dropdownBtn = e.target.closest('.plugin-dropdown-btn');
            const dropdownItem = e.target.closest('.dropdown-item');

            if (dropdownBtn) {
                e.stopPropagation();
                const container = dropdownBtn.closest('.plugin-button-container');
                const dropdown = container.querySelector('.plugin-dropdown-menu');
                this.togglePluginDropdown(container, dropdown);
                return;
            }

            if (pluginBtn) {
                this.handlePluginClick(this.plugins.get(pluginBtn.dataset.pluginName));
                return;
            }
            
            if (dropdownItem) {
                 e.stopPropagation();
                 const pluginName = dropdownItem.closest('.plugin-button-container').dataset.pluginName;
                 const action = dropdownItem.dataset.action;
                 this.handlePluginDropdownAction(action, this.plugins.get(pluginName));
                 this.closeAllDropdowns();
                 return;
            }

            // Закрываем все меню, если клик был вне их
            if (!e.target.closest('.plugin-dropdown-menu')) {
                this.closeAllDropdowns();
            }
        });
    }

    /**
     * Устанавливает соединение с фоновым скриптом, используя механизм "рукопожатия".
     * Посылает PING до тех пор, пока не получит PONG.
     * @param {number} maxAttempts - Максимальное количество попыток.
     * @param {number} interval - Интервал между попытками в мс.
     * @returns {Promise<boolean>} - true, если соединение установлено, иначе false.
     */
    async establishConnection(maxAttempts = 10, interval = 100) {
        for (let i = 0; i < maxAttempts; i++) {
            try {
                const response = await chrome.runtime.sendMessage({ type: 'PING' });
                if (response && response.pong) {
                    console.log(`Боковая панель: Соединение с background установлено (попытка ${i + 1}).`);
                    return true;
                }
            } catch (e) {
                // Ошибки здесь ожидаемы, если background script еще не проснулся.
            }
            await new Promise(resolve => setTimeout(resolve, interval));
        }
        console.error("Боковая панель: Не удалось установить соединение с background script.");
        return false;
    }

    async loadCurrentTab() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const tabId = parseInt(urlParams.get('tabId'));
            const url = urlParams.get('url');

            if (!tabId) {
                throw new Error("Tab ID не найден в URL.");
            }

            this.currentTabId = tabId;
            this.currentUrl = url;
            console.log('Боковая панель: Загружена вкладка из URL параметров', { tabId: this.currentTabId, url: this.currentUrl });

            // ОЖИДАЕМ УСТАНОВКИ СОЕДИНЕНИЯ
            const isConnected = await this.establishConnection();
            if (!isConnected) {
                const contextUrlDisplay = document.getElementById('context-url-display');
                contextUrlDisplay.textContent = 'Ошибка: нет связи с фоновым скриптом.';
                contextUrlDisplay.style.display = 'inline';
                return; // Прерываем выполнение, если связи нет
            }

            // ЗАПРАШИВАЕМ СОСТОЯНИЕ У BACKGROUND SCRIPT
            const response = await chrome.runtime.sendMessage({ type: 'GET_ALL_STATES', tabId: this.currentTabId });

            if (response && response.success) {
                console.log("Боковая панель: Получено состояние от background", response.states);
                this.handleStateUpdate(response.states);
                await this.loadPlugins(); 
            } else {
                console.error("Боковая панель: Не удалось получить состояние от background", response?.error);
                const contextUrlDisplay = document.getElementById('context-url-display');
                contextUrlDisplay.textContent = 'Ошибка: не удалось получить состояние.';
                contextUrlDisplay.style.display = 'inline';
            }

        } catch (error) {
            console.error('Боковая панель: Ошибка загрузки вкладки', error);
            const contextUrlDisplay = document.getElementById('context-url-display');
            contextUrlDisplay.textContent = `Ошибка: ${error.message}`;
            contextUrlDisplay.style.display = 'inline';
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

        if (!this.plugins || this.plugins.size === 0) {
            container.innerHTML = '<p class="no-plugins-msg">Нет доступных плагинов для этой страницы.</p>';
            return;
        }

        this.plugins.forEach((plugin) => {
            const btn = this.createPluginButton(plugin);
            container.appendChild(btn);
        });
        
        this.updatePluginStates(this.allPluginStates);
        this.switchChatView(this.activePluginName);
    }

    createPluginButton(plugin) {
        const container = document.createElement('div');
        container.className = 'plugin-button-container';
        container.dataset.pluginName = plugin.name;

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

        // Кнопка dropdown меню
        const dropdownBtn = document.createElement('button');
        dropdownBtn.className = 'plugin-dropdown-btn';
        dropdownBtn.innerHTML = '&#9662;'; // Стрелка вниз
        dropdownBtn.title = 'Настройки плагина';
        
        // Dropdown меню
        const dropdown = document.createElement('div');
        dropdown.className = 'plugin-dropdown-menu';
        dropdown.innerHTML = `
            <div class="dropdown-item" data-action="toggle-enabled">
                <span class="dropdown-icon">🔌</span>
                <span>Включить плагин</span>
                <label class="switch">
                    <input type="checkbox" class="enabled-toggle">
                    <span class="slider round"></span>
                </label>
            </div>
            <div class="dropdown-item" data-action="autorun">
                <span class="dropdown-icon">🚀</span>
                <span>Автозапуск</span>
                <label class="switch">
                    <input type="checkbox" class="autorun-toggle">
                    <span class="slider round"></span>
                </label>
            </div>
            <div class="dropdown-item" data-action="settings">
                <span class="dropdown-icon">⚙️</span>
                <span>Настройки</span>
            </div>
            <div class="dropdown-item" data-action="info">
                <span class="dropdown-icon">ℹ️</span>
                <span>Информация</span>
            </div>
        `;

        // Обработчики событий
        btn.addEventListener('click', () => this.handlePluginClick(plugin));
        
        dropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.togglePluginDropdown(container, dropdown);
        });

        dropdown.addEventListener('click', (e) => e.stopPropagation());

        container.appendChild(btn);
        container.appendChild(dropdownBtn);
        container.appendChild(dropdown);

        return container;
    }

    async handlePluginClick(plugin) {
        if (!plugin) return;
        
        // Переключаем активный чат
        this.switchChatView(plugin.name);
    }

    async runPlugin(pluginName) {
        console.log(`Sidebar: Запуск плагина ${pluginName}`);
        
        this.globalState.runningPlugins.add(pluginName);
        this.updatePluginStatuses();
        
        try {
            const response = await chrome.runtime.sendMessage({
                type: 'RUN_PLUGIN',
                pluginName: pluginName,
                tabId: this.currentTabId
            });

            if (response && response.success) {
                this.addSystemMessage(`Плагин ${pluginName} успешно запущен.`);
            } else {
                this.addSystemMessage(`Ошибка запуска плагина ${pluginName}: ${response.error}`);
                this.globalState.runningPlugins.delete(pluginName);
                this.updatePluginStatuses();
            }
        } catch (error) {
            console.error(`Sidebar: Ошибка при отправке команды запуска плагина ${pluginName}`, error);
            this.addSystemMessage(`Критическая ошибка при запуске плагина ${pluginName}.`);
            this.globalState.runningPlugins.delete(pluginName);
            this.updatePluginStatuses();
        }
    }

    async interruptPlugin(pluginName) {
        console.log(`Sidebar: Прерывание плагина ${pluginName}`);
        try {
            const response = await chrome.runtime.sendMessage({
                type: 'INTERRUPT_PLUGIN',
                pluginName: pluginName
            });
            if (response && response.success) {
                this.addSystemMessage(`Плагин ${pluginName} прерван.`);
            } else {
                this.addSystemMessage(`Ошибка прерывания плагина ${pluginName}: ${response.error}`);
            }
        } catch (error) {
            console.error(`Sidebar: Ошибка при отправке команды прерывания плагина ${pluginName}`, error);
            this.addSystemMessage(`Критическая ошибка при прерывании плагина ${pluginName}.`);
        }
        // Состояние обновится через STATE_UPDATE от background
    }

    handleTyping(text) {
        if (!this.activePluginName) return;
        // Сохраняем ввод для активного плагина
        if (!this.pluginChatStates[this.activePluginName]) {
            this.pluginChatStates[this.activePluginName] = { chatHistory: [], currentInput: '' };
        }
        this.pluginChatStates[this.activePluginName].currentInput = text;
        
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
        if (!this.activePluginName) return;
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
            this.pluginChatStates[this.activePluginName].currentInput = '';
            
            // НЕ добавляем сообщение в UI здесь - оно будет добавлено через STATE_UPDATE
            
        } catch (error) {
            console.error('Sidebar: Ошибка отправки сообщения', error);
            this.addSystemMessage('Ошибка отправки сообщения');
        }
    }

    addUserMessage(text) {
        // Добавляем сообщение в активный чат
        if (!this.activePluginName) return;
        
        const activeChatState = this.pluginChatStates[this.activePluginName];
        if (activeChatState) {
            activeChatState.chatHistory.push({ type: 'user', content: text });
            this.renderChatHistory();
        }
    }

    addPluginMessage(pluginName, text) {
        // Находим или создаем состояние чата для этого плагина
        if (!this.pluginChatStates[pluginName]) {
            this.pluginChatStates[pluginName] = { chatHistory: [], currentInput: '' };
        }
        const chatState = this.pluginChatStates[pluginName];
        chatState.chatHistory.push({ type: 'plugin', content: text, pluginName: pluginName });

        // Если это активный чат, перерисовываем
        if (this.activePluginName === pluginName) {
            this.renderChatHistory();
        }
    }

    addSystemMessage(text) {
        // Системные сообщения добавляются в активный чат
        if (!this.activePluginName) return;

        const activeChatState = this.pluginChatStates[this.activePluginName];
        if (activeChatState) {
            activeChatState.chatHistory.push({ type: 'system', content: text });
            this.renderChatHistory();
        }
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
        if (!this.currentTabId) return;
        try {
            const response = await chrome.runtime.sendMessage({
                type: 'GET_ALL_STATES', // Новый тип запроса
                tabId: this.currentTabId
            });

            if (response.success && response.states) {
                this.pluginChatStates = response.states.pluginChatStates || {};
                this.globalState.runningPlugins = new Set(response.states.runningPlugins || []);
                this.activePluginName = response.states.activePluginName || this.plugins.keys().next().value;
                console.log('Sidebar: Все состояния чатов загружены.');
            } else {
                 console.log('Sidebar: Нет сохраненных состояний для вкладки.');
                 this.pluginChatStates = {};
            }
        } catch (error) {
            console.error('Sidebar: Ошибка загрузки состояний чатов', error);
        }
        this.switchChatView(this.activePluginName);
    }

    renderChatHistory() {
        const messagesContainer = document.getElementById('chat-messages');
        messagesContainer.innerHTML = '';
        
        const activeChatHistory = this.pluginChatStates[this.activePluginName]?.chatHistory || [];
        
        activeChatHistory.forEach(msg => {
            const message = this.createMessage(msg.type, msg.content, msg.pluginName);
            messagesContainer.appendChild(message);
        });
        
        this.scrollToBottom();
    }

    updateInputValue() {
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.value = this.pluginChatStates[this.activePluginName]?.currentInput || '';
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
        if (!this.activePluginName) return;

        console.log(`[Sidebar] Очистка чата для ${this.activePluginName}`);
        
        // Очищаем локальное состояние
        if (this.pluginChatStates[this.activePluginName]) {
            this.pluginChatStates[this.activePluginName].chatHistory = [];
        }
        this.renderChatHistory();

        // Отправляем запрос в background
        try {
            await chrome.runtime.sendMessage({
                type: 'CLEAR_CHAT',
                tabId: this.currentTabId
            });
        } catch (error) {
            console.error('Sidebar: Ошибка при очистке чата:', error);
        }
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            console.log("Sidebar: получено сообщение", message);
            switch (message.type) {
                case 'STATE_UPDATE':
                    // Убеждаемся, что обновление для нашей вкладки
                    if (message.tabId === this.currentTabId) {
                        this.handleStateUpdate(message.states);
                    }
                    break;
                case 'PLUGIN_FINISHED':
                    this.handlePluginFinished(message.pluginName);
                    break;
                case 'TYPING_INDICATOR':
                    if (message.isTyping) {
                        this.showTypingIndicator();
                    } else {
                        this.hideTypingIndicator();
                    }
                    break;
                case 'ADD_PLUGIN_MESSAGE':
                     this.addPluginMessage(message.pluginName, message.content);
                     break;
            }
        });
    }

    handleStateUpdate(newState) {
        this.currentUrl = newState.url;
        this.globalState.runningPlugins = new Set(newState.globalState.runningPlugins);
        this.pluginChatStates = newState.pluginChatStates;
        this.activePluginName = newState.activePluginName;
        
        // Обновляем общий кэш состояний плагинов
        if (newState.allPluginStates) {
            this.allPluginStates = newState.allPluginStates;
        }

        this.updateUI();
    }

    updateUI() {
        this.updateContextUrlDisplay();
        this.updatePluginStates(this.allPluginStates);
        this.updatePluginStatuses(); // Обновляет индикаторы запущенных плагинов
        
        // Переключаемся на активный чат или показываем заглушку
        this.switchChatView(this.activePluginName);
    }
    
    updateContextUrlDisplay() {
        const contextUrlDisplay = document.getElementById('context-url-display');
        if (this.currentUrl) {
            contextUrlDisplay.textContent = this.currentUrl;
            contextUrlDisplay.style.display = 'inline';
        } else {
            contextUrlDisplay.textContent = 'Контекст не определен';
            contextUrlDisplay.style.display = 'inline';
        }
    }

    handlePluginFinished(pluginName) {
        this.globalState.runningPlugins.delete(pluginName);
        this.updatePluginStatuses();
    }

    openSettings() {
        chrome.runtime.openOptionsPage();
    }

    setupTabListener() {
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (tabId === this.currentTabId && changeInfo.url) {
                console.log('Sidebar: URL активной вкладки изменился', changeInfo.url);
                this.updateContext(tab);
            }
        });
    }

    // НОВЫЙ СЛУШАТЕЛЬ ДЛЯ STORAGE
    setupStorageListener() {
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'sync' && changes.pluginStates) {
                console.log('Sidebar: Состояния плагинов изменились в storage, обновляем UI.', changes.pluginStates.newValue);
                this.allPluginStates = changes.pluginStates.newValue;
                this.updatePluginStates(this.allPluginStates);
            }
        });
    }

    async updateContext(tab) {
        this.currentUrl = tab.url;
        this.currentTabId = tab.id;
        console.log("Sidebar: Обновление контекста для вкладки", tab);

        this.updateContextUrlDisplay();
        await this.loadPlugins();
        await this.loadChatHistory();
    }

    togglePluginDropdown(container, dropdown) {
        this.closeAllDropdowns(); // Закрываем все другие меню

        dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    }

    closeAllDropdowns() {
        document.querySelectorAll('.plugin-dropdown-menu').forEach(menu => menu.style.display = 'none');
    }

    async handlePluginDropdownAction(action, plugin) {
        if (!plugin) return;
        const { name } = plugin;
        let updates = {};

        switch (action) {
            case 'toggle-enabled':
                updates = { enabled: !(this.allPluginStates[name]?.enabled ?? true) };
                break;
            case 'toggle-autorun':
                updates = { autoRun: !(this.allPluginStates[name]?.autoRun ?? false) };
                break;
            case 'settings':
                this.openPluginSettings(plugin);
                return; // Не отправляем сообщение
            case 'info':
                this.showPluginInfo(plugin);
                return; // Не отправляем сообщение
            default:
                return; // Неизвестное действие
        }

        const response = await chrome.runtime.sendMessage({
            type: 'UPDATE_PLUGIN_STATE',
            pluginId: name,
            updates: updates
        });
        
        if (!response.success) {
            console.error("Sidebar: Не удалось обновить состояние плагина через меню", response.error);
        }
    }

    async openPluginSettings(plugin) {
        // TODO: Реализовать логику открытия настроек конкретного плагина
        alert(`Настройки для плагина ${plugin.name} еще не реализованы.`);
    }

    showPluginInfo(plugin) {
        // TODO: Показать более детальную информацию о плагине
        alert(`Плагин: ${plugin.name}\nВерсия: ${plugin.version}\nОписание: ${plugin.description}`);
    }

    updatePluginStates(states) {
        if (!this.plugins) return;
        this.plugins.forEach((plugin) => {
            // Передаем либо сохраненное состояние, либо undefined,
            // чтобы дочерняя функция сама определила дефолт.
            this.updateSinglePluginState(plugin.name, states ? states[plugin.name] : undefined);
        });
    }

    updateSinglePluginState(pluginName, state) {
        const pluginContainer = document.querySelector(`.plugin-button-container[data-plugin-name="${pluginName}"]`);
        if (!pluginContainer) return;

        // Если состояние не определено, используем значения по умолчанию.
        const { enabled = true, autoRun = false } = state || {};

        const enabledToggle = pluginContainer.querySelector('.plugin-enabled-toggle');
        const autoRunToggle = pluginContainer.querySelector('.plugin-autorun-toggle');
        const pluginBtn = pluginContainer.querySelector('.plugin-btn');

        if (enabledToggle) enabledToggle.checked = enabled;
        if (autoRunToggle) autoRunToggle.checked = autoRun;

        if (pluginBtn) {
            pluginBtn.classList.toggle('disabled', !enabled);
            pluginBtn.disabled = !enabled;
        }
    }

    async handleContextCheck() {
        console.log("Текущий контекст Sidebar:");
        console.log("Tab ID:", this.currentTabId);
        console.log("URL:", this.currentUrl);
        console.log("Активный плагин:", this.activePluginName);
        console.log("Загруженные плагины:", this.plugins);
        console.log("Все состояния плагинов:", this.allPluginStates);
        console.log("Глобальное состояние (запущенные плагины):", this.globalState.runningPlugins);
        
        this.addSystemMessage("Проверка контекста завершена. Результаты в консоли разработчика.");
        
        // Повторно запросим состояние у background, чтобы убедиться в синхронизации
        if (this.currentTabId) {
            const response = await chrome.runtime.sendMessage({ type: 'GET_ALL_STATES', tabId: this.currentTabId });
            console.log("Ответ на принудительный запрос GET_ALL_STATES:", response);
            if(response?.success) {
                 this.handleStateUpdate(response.states);
            }
        }
    }
    
    // ПЕРЕРАБОТАННЫЙ ОБРАБОТЧИК
    async handlePluginToggle(e) {
        const checkbox = e.target;
        if (checkbox.tagName === 'INPUT' && checkbox.type === 'checkbox') {
            const pluginName = checkbox.dataset.pluginName;
            const isEnabledToggle = checkbox.classList.contains('plugin-enabled-toggle');
            const isAutoRunToggle = checkbox.classList.contains('plugin-autorun-toggle');
    
            if (pluginName && (isEnabledToggle || isAutoRunToggle)) {
                const updates = {};
                if (isEnabledToggle) {
                    updates.enabled = checkbox.checked;
                }
                if (isAutoRunToggle) {
                    updates.autoRun = checkbox.checked;
                }
    
                // Отправляем команду в background
                const response = await chrome.runtime.sendMessage({
                    type: 'UPDATE_PLUGIN_STATE',
                    pluginId: pluginName,
                    updates: updates
                });
    
                if (!response || !response.success) {
                    console.error("Sidebar: Не удалось обновить состояние плагина", response?.error);
                    // Откатываем чекбокс в предыдущее состояние, чтобы UI не врал
                    checkbox.checked = !checkbox.checked;
                }
            }
        }
    }

    switchChatView(pluginName) {
        console.log('Переключение вида на плагин:', pluginName);
        // Если имя плагина null, возможно, надо показать главный/пустой экран
        if (!pluginName && this.plugins.size > 0) {
            pluginName = this.plugins.keys().next().value; // Берем первый плагин по умолчанию
        }

        this.activePluginName = pluginName;
        
        // Обновляем заголовок чата
        const chatHeader = document.querySelector('.chat-header h3');
        if (chatHeader) {
            chatHeader.textContent = this.activePluginName ? `Чат с "${this.activePluginName}"` : 'Чат с плагинами';
        }

        // Подсвечиваем активную кнопку
        document.querySelectorAll('.plugin-button-container').forEach(c => {
            c.classList.toggle('active-chat', c.dataset.pluginName === this.activePluginName);
        });

        // Рендерим историю и поле ввода для активного чата
        this.renderChatHistory();
        this.updateInputValue();
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new SidebarChat();
}); 