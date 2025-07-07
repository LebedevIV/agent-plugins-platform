/**
 * Test Harness UI
 *
 * Это интерфейс для ручного тестирования и отладки плагинов и Host-API.
 */

// import { getAvailablePlugins } from '../core/plugin-manager.js';
// import { runWorkflow } from '../core/workflow-engine.js';
// import { hostApi } from '../core/host-api.js';
// import { pluginStateManager } from '../core/index.js';
import { showSuccessToast, showErrorToast, showInfoToast, showWarningToast } from './toast-notifications.js';
import { createPluginCard } from './PluginCard.js';
import { createRunLogger } from './log-manager.js';
import { createJsonViewer } from './json-viewer.js';
import { usePluginList } from './hooks/usePluginList.js';
import { usePluginDetails } from './hooks/usePluginDetails.js';
import { usePluginState } from './hooks/usePluginState.js';
import { useErrorHandler } from './hooks/useErrorHandler.js';
import { useAIKeys } from './hooks/useAIKeys.js';
import { useCustomKeyNames } from './hooks/useCustomKeyNames.js';
import { useFileViewer } from './hooks/useFileViewer.js';

// --- КОД ИЗ core/plugin-state-manager.js ---
const pluginStateManager = {
    async getAllStates() {
        const { pluginStates = {} } = await chrome.storage.sync.get('pluginStates');
        return pluginStates;
    },
    async getState(pluginId) {
        const states = await this.getAllStates();
        return states[pluginId] || { enabled: true, autoRun: false };
    },
    async setState(pluginId, state) {
        const states = await this.getAllStates();
        states[pluginId] = state;
        await chrome.storage.sync.set({ pluginStates: states });
    },
    async updateState(pluginId, updates) {
        const currentState = await this.getState(pluginId);
        const newState = { ...currentState, ...updates };
        await this.setState(pluginId, newState);
    },
    onStateChanged(callback) {
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'sync' && changes.pluginStates) {
                callback(changes.pluginStates.newValue);
            }
        });
    }
};
// --- КОНЕЦ КОДА ИЗ core/plugin-state-manager.js ---

// Мы не можем импортировать getAvailablePlugins, поэтому создадим заглушку
async function getAvailablePlugins() {
    console.warn("Функция getAvailablePlugins является заглушкой. Используется статический список.");
    return [
      { name: 'ozon-analyzer', description: 'Анализатор товаров Ozon', version: '1.0.0', id: 'ozon-analyzer' },
      { name: 'time-test', description: 'Тестовый плагин для проверки времени', version: '1.0.0', id: 'time-test' },
      { name: 'google-helper', description: 'Помощник для Google', version: '1.0.0', id: 'google-helper' }
    ];
}

// --- Инициализация глобального Host-API ---
// window.hostApi = hostApi; // hostApi больше не импортируется

// Переопределяем sendMessageToChat для работы с sidebar
// window.hostApi.sendMessageToChat = (message) => { ... };

console.log('Тестовый стенд инициализирован (v0.6.0).');

// --- Обработка URL параметров ---
function handleUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const pluginName = urlParams.get('plugin');
    const tab = urlParams.get('tab');
    
    if (pluginName && tab === 'settings') {
        console.log('Открытие настроек плагина:', pluginName);
        // Найдем плагин и покажем его информацию
        setTimeout(async () => {
            const plugins = await getAvailablePlugins();
            const plugin = plugins.find(p => p.name === pluginName || p.id === pluginName);
            if (plugin) {
                showPluginInfo(plugin);
                // Переключаемся на вкладку плагинов
                const pluginsTab = document.querySelector('[data-tab="plugins"]');
                if (pluginsTab) {
                    pluginsTab.click();
                }
            } else {
                console.error('Плагин не найден:', pluginName);
            }
        }, 100);
    }
}

// --- Основная логика ---

// Новый способ отображения информации о плагине через хуки
async function showPluginInfo(plugin) {
    const { manifest, state, domains } = await usePluginDetails(plugin.id);
    // Убираем выделение со всех карточек
    document.querySelectorAll('.plugin-card').forEach(card => {
        card.classList.remove('selected');
    });
    // Выделяем карточку текущего плагина
    const currentCard = document.querySelector(`[data-plugin-name="${plugin.name}"]`);
    if (currentCard) {
        currentCard.classList.add('selected');
    }
    // --- Обновляем правую колонку ---
    const rightSidebar = document.querySelector('.ide-sidebar-right');
    if (rightSidebar) {
        rightSidebar.innerHTML = `
          <div class="plugin-info">
            <h2>${manifest.name}</h2>
            <div class="plugin-meta">
              <span class="version">Версия: ${manifest.version}</span>
              <span class="id">ID: ${plugin.id}</span>
            </div>
            <div class="plugin-description">
              <h3>Описание</h3>
              <p>${manifest.description}</p>
            </div>
            ${domains.length > 0 ? `
            <div class="plugin-domains">
              <h3>🌐 Плагин активен на сайтах:</h3>
              <ul class="plugin-domains-list">
                ${domains.map(domain => `<li><code>${domain}</code></li>`).join('')}
              </ul>
            </div>
            ` : ''}
            <div class="plugin-actions">
              <h3>Действия</h3>
              <div class="plugin-toggle">
                <label class="toggle-switch">
                  <input type="checkbox" data-plugin-name="${plugin.name}" data-state-key="enabled" 
                         onchange="handleToggleChange(this)" ${state.enabled ? 'checked' : ''}>
                  <span class="toggle-slider"></span>
                </label>
                <span class="toggle-label">Включить плагин</span>
              </div>
              <div class="plugin-toggle">
                <label class="toggle-switch">
                  <input type="checkbox" data-plugin-name="${plugin.name}" data-state-key="autoRun"
                         onchange="handleToggleChange(this)" ${state.autoRun ? 'checked' : ''}>
                  <span class="toggle-slider"></span>
                </label>
                <span class="toggle-label">Автоматическое срабатывание</span>
              </div>
              <button class="view-manifest-btn" onclick="viewManifest('${plugin.id}')">
                📋 Просмотреть манифест
              </button>
              <button class="view-workflow-btn" onclick="viewWorkflow('${plugin.id}')">
                🔄 Просмотреть workflow
              </button>
            </div>
            <div class="plugin-files">
              <h3>Файлы плагина</h3>
              <ul>
                <li>📄 manifest.json</li>
                <li>🐍 mcp_server.py</li>
                <li>⚙️ workflow.json</li>
                <li>🎨 icon.svg</li>
              </ul>
            </div>
          </div>
        `;
    }
}

// Новый способ отображения списка плагинов через хук
async function displayPlugins() {
    const plugins = await usePluginList();
    const pluginsList = document.getElementById('plugins-list');
    pluginsList.innerHTML = '';
    plugins.forEach(plugin => {
        const card = createPluginCard(plugin);
        card.setAttribute('data-plugin-name', plugin.name);
        card.onclick = () => showPluginInfo(plugin);
        pluginsList.appendChild(card);
    });
}

// Новый глобальный обработчик для всех переключателей
window.handleToggleChange = async function(checkbox) {
    const pluginName = checkbox.dataset.pluginName;
    const stateKey = checkbox.dataset.stateKey; // 'enabled' или 'autoRun'
    const value = checkbox.checked;
    const { error, success } = useErrorHandler();
    try {
        const currentState = await usePluginState.getState(pluginName);
        const newState = { ...currentState, [stateKey]: value };
        await usePluginState.setState(pluginName, newState);
        // Обновляем UI карточки, если меняли enabled
        if (stateKey === 'enabled') {
            const card = document.querySelector(`.plugin-card[data-plugin-name="${pluginName}"]`);
            if (card) {
                card.classList.toggle('disabled', !value);
            }
        }
        success(`Настройка "${pluginName}" сохранена.`);
    } catch (e) {
        error(`Ошибка сохранения: ${e.message}`);
        checkbox.checked = !value; // Возвращаем в исходное состояние
    }
}

// Функция для получения плагина по ID
async function getPluginById(pluginId) {
    try {
        const plugins = await getAvailablePlugins();
        return plugins.find(p => p.id === pluginId);
    } catch (error) {
        console.error('Ошибка получения плагина:', error);
        return null;
    }
}

// Модальное окно для просмотра файлов
function showFileModal(title, contentHtml) {
    let modal = document.getElementById('file-viewer-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'file-viewer-modal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.background = 'rgba(0,0,0,0.5)';
        modal.style.zIndex = '9999';
        modal.innerHTML = `<div id="file-viewer-content" style="background:#fff;max-width:700px;margin:40px auto;padding:24px;border-radius:8px;position:relative;box-shadow:0 8px 32px #0002;">
            <button id="close-file-viewer" style="position:absolute;top:12px;right:12px;font-size:1.5em;">×</button>
            <h2 style="margin-top:0;">${title}</h2>
            <div id="file-viewer-body"></div>
        </div>`;
        document.body.appendChild(modal);
        document.getElementById('close-file-viewer').onclick = () => modal.remove();
    } else {
        modal.querySelector('h2').textContent = title;
        modal.style.display = 'block';
    }
    const body = document.getElementById('file-viewer-body');
    body.innerHTML = '';
    if (typeof contentHtml === 'string') {
        body.innerHTML = `<pre style="white-space:pre-wrap;">${contentHtml}</pre>`;
    } else if (contentHtml instanceof HTMLElement) {
        body.appendChild(contentHtml);
    }
}

// Просмотр manifest.json
window.viewManifest = async function(pluginId) {
    const { error } = useErrorHandler();
    try {
        const text = await useFileViewer(pluginId, 'manifest.json');
        const json = JSON.parse(text);
        const container = document.createElement('div');
        createJsonViewer(json, container);
        showFileModal('manifest.json', container);
    } catch (e) {
        error('Ошибка загрузки manifest.json: ' + e.message);
    }
}

// Просмотр workflow.json
window.viewWorkflow = async function(pluginId) {
    const { error } = useErrorHandler();
    try {
        const text = await useFileViewer(pluginId, 'workflow.json');
        const json = JSON.parse(text);
        const container = document.createElement('div');
        createJsonViewer(json, container);
        showFileModal('workflow.json', container);
    } catch (e) {
        error('Ошибка загрузки workflow.json: ' + e.message);
    }
}

// Настройка вкладок
function setupTabs() {
  const tabContainer = document.querySelector('.tab-nav');
  if (!tabContainer) return;
  tabContainer.addEventListener('click', (event) => {
    const clickedButton = event.target.closest('.tab-button');
    if (!clickedButton) return;
    const tabId = clickedButton.dataset.tab;
    if (!tabId) return;
    tabContainer.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
    clickedButton.classList.add('active');
    document.getElementById(tabId)?.classList.remove('hidden');
  });
}

// --- Функции для управления API ключами ---

// Вставка из буфера обмена
window.pasteFromClipboard = async function(inputId) {
    try {
        const text = await navigator.clipboard.readText();
        document.getElementById(inputId).value = text;
        showSuccessToast('Ключ вставлен из буфера обмена');
    } catch (error) {
        console.error('Ошибка вставки из буфера:', error);
        showErrorToast('Не удалось вставить из буфера обмена');
    }
}

// Копирование в буфер обмена
window.copyToClipboard = async function(inputId) {
    try {
        const input = document.getElementById(inputId);
        await navigator.clipboard.writeText(input.value);
        showSuccessToast('Ключ скопирован в буфер обмена');
    } catch (error) {
        console.error('Ошибка копирования в буфер:', error);
        showErrorToast('Не удалось скопировать в буфер обмена');
    }
}

// Извлечение ключа из curl запроса
window.extractKeyFromCurl = function(curlInputId, keyInputId) {
    try {
        const curlInput = document.getElementById(curlInputId);
        const keyInput = document.getElementById(keyInputId);
        const curlText = curlInput.value;
        
        // Ищем API ключ в curl запросе
        const apiKeyMatch = curlText.match(/['"]?api[_-]?key['"]?\s*[:=]\s*['"]([^'"]+)['"]/i) ||
                           curlText.match(/['"]?authorization['"]?\s*[:=]\s*['"]?bearer\s+([^'"\s]+)['"]?/i) ||
                           curlText.match(/['"]?x-api-key['"]?\s*[:=]\s*['"]([^'"]+)['"]/i);
        
        if (apiKeyMatch && apiKeyMatch[1]) {
            keyInput.value = apiKeyMatch[1];
            showSuccessToast('API ключ извлечен из curl запроса');
        } else {
            showErrorToast('Не удалось найти API ключ в curl запросе');
        }
    } catch (error) {
        console.error('Ошибка извлечения ключа:', error);
        showErrorToast('Ошибка извлечения ключа из curl');
    }
}

// Загрузка сохраненных ключей
async function loadSavedKeys() {
    const { error } = useErrorHandler();
    try {
        const keys = await useAIKeys.getAllKeys();
        if (keys['gemini-flash']) {
            document.getElementById('gemini-flash-key').value = keys['gemini-flash'];
        }
        if (keys['gemini-25']) {
            document.getElementById('gemini-25-key').value = keys['gemini-25'];
        }
        loadCustomKeys(keys);
        updateKeyStatuses();
    } catch (e) {
        error('Ошибка загрузки ключей: ' + e.message);
    }
}

// Сохранение всех ключей
window.saveAIKeys = async function() {
    const { success, error } = useErrorHandler();
    try {
        await useAIKeys.setKey('gemini-flash', document.getElementById('gemini-flash-key').value);
        await useAIKeys.setKey('gemini-25', document.getElementById('gemini-25-key').value);
        // Сохраняем пользовательские ключи
        const customKeys = getCustomKeys();
        for (const keyId in customKeys) {
            await useAIKeys.setKey(keyId, customKeys[keyId]);
        }
        success('Ключи сохранены');
        updateKeyStatuses();
    } catch (e) {
        error('Ошибка сохранения ключей: ' + e.message);
    }
}

// Добавление пользовательского ключа
window.addCustomKey = function() {
    const customKeysList = document.getElementById('custom-keys-list');
    const keyId = 'custom-key-' + Date.now();
    const keyHtml = `
        <div class="custom-key-item" id="${keyId}">
            <button class="remove-key-btn" onclick="removeCustomKey('${keyId}')">Удалить</button>
            <div class="ai-key-header">
                <h4>
                    <input type="text" class="key-name-input" placeholder="Название нейросети" 
                           onchange="updateCustomKeyName('${keyId}', this.value)">
                </h4>
                <span class="key-status" id="${keyId}-status">Не настроен</span>
                <span class="key-badge paid">Платный</span>
            </div>
            <div class="ai-key-input">
                <input type="password" id="${keyId}-key" placeholder="Введите API ключ">
                <button onclick="pasteFromClipboard('${keyId}-key')">Вставить</button>
                <button onclick="copyToClipboard('${keyId}-key')">Копировать</button>
            </div>
            <div class="curl-validator">
                <input type="text" id="${keyId}-curl" placeholder="Вставьте curl запрос для извлечения ключа">
                <button onclick="extractKeyFromCurl('${keyId}-curl', '${keyId}-key')">Извлечь ключ</button>
            </div>
        </div>
    `;
    customKeysList.insertAdjacentHTML('beforeend', keyHtml);
    useErrorHandler().success('Добавлен новый ключ');
}

// Удаление пользовательского ключа
window.removeCustomKey = async function(keyId) {
    const keyElement = document.getElementById(keyId);
    if (keyElement) {
        keyElement.remove();
        await useAIKeys.removeKey(keyId);
        useErrorHandler().success('Ключ удален');
    }
}

// Обновление названия пользовательского ключа
window.updateCustomKeyName = async function(keyId, name) {
    await useCustomKeyNames.setName(keyId, name);
}

// Получение пользовательских ключей
function getCustomKeys() {
    const customKeys = {};
    const customKeyElements = document.querySelectorAll('.custom-key-item');
    customKeyElements.forEach(element => {
        const keyId = element.id;
        const keyInput = element.querySelector('input[type="password"]');
        if (keyInput && keyInput.value) {
            customKeys[keyId] = keyInput.value;
        }
    });
    return customKeys;
}

// Загрузка пользовательских ключей
async function loadCustomKeys(keys) {
    const customKeyNames = await useCustomKeyNames.getAllNames();
    Object.keys(keys).forEach(keyId => {
        if (keyId.startsWith('custom-key-') && keys[keyId]) {
            // Воссоздаем элемент пользовательского ключа
            const customKeysList = document.getElementById('custom-keys-list');
            const keyName = customKeyNames[keyId] || 'Пользовательская нейросеть';
            const keyHtml = `
                <div class="custom-key-item" id="${keyId}">
                    <button class="remove-key-btn" onclick="removeCustomKey('${keyId}')">Удалить</button>
                    <div class="ai-key-header">
                        <h4>
                            <input type="text" class="key-name-input" value="${keyName}" 
                                   onchange="updateCustomKeyName('${keyId}', this.value)">
                        </h4>
                        <span class="key-status" id="${keyId}-status">Не настроен</span>
                        <span class="key-badge paid">Платный</span>
                    </div>
                    <div class="ai-key-input">
                        <input type="password" id="${keyId}-key" value="${keys[keyId]}" placeholder="Введите API ключ">
                        <button onclick="pasteFromClipboard('${keyId}-key')">Вставить</button>
                        <button onclick="copyToClipboard('${keyId}-key')">Копировать</button>
                    </div>
                    <div class="curl-validator">
                        <input type="text" id="${keyId}-curl" placeholder="Вставьте curl запрос для извлечения ключа">
                        <button onclick="extractKeyFromCurl('${keyId}-curl', '${keyId}-key')">Извлечь ключ</button>
                    </div>
                </div>
            `;
            customKeysList.insertAdjacentHTML('beforeend', keyHtml);
        }
    });
}

// Асинхронное обновление статусов ключей
async function updateKeyStatuses(testResults = null) {
    const keys = await useAIKeys.getAllKeys();
    // Обновляем статусы фиксированных ключей
    const fixedStatusElements = {
        'gemini-flash': document.getElementById('gemini-flash-status'),
        'gemini-25': document.getElementById('gemini-25-status')
    };
    for (const [keyName, statusElement] of Object.entries(fixedStatusElements)) {
        if (statusElement) {
            const hasKey = keys[keyName] && keys[keyName].length > 0;
            const isTested = testResults && keyName in testResults;
            if (isTested && testResults[keyName]) {
                statusElement.textContent = 'Работает';
                statusElement.className = 'key-status configured';
            } else if (hasKey) {
                statusElement.textContent = 'Настроен';
                statusElement.className = 'key-status configured';
            } else {
                statusElement.textContent = 'Не настроен';
                statusElement.className = 'key-status';
            }
        }
    }
    // Обновляем статусы пользовательских ключей
    const customKeyElements = document.querySelectorAll('.custom-key-item');
    customKeyElements.forEach(element => {
        const keyId = element.id;
        const statusElement = element.querySelector('.key-status');
        const keyInput = element.querySelector('input[type="password"]');
        if (statusElement && keyInput) {
            const hasKey = keyInput.value && keyInput.value.length > 0;
            const isTested = testResults && keyId in testResults;
            if (isTested && testResults[keyId]) {
                statusElement.textContent = 'Работает';
                statusElement.className = 'key-status configured';
            } else if (hasKey) {
                statusElement.textContent = 'Настроен';
                statusElement.className = 'key-status configured';
            } else {
                statusElement.textContent = 'Не настроен';
                statusElement.className = 'key-status';
            }
        }
    });
}

// Асинхронное тестирование ключей
window.testAIKeys = async function() {
    const { success, error } = useErrorHandler();
    try {
        const keys = await useAIKeys.getAllKeys();
        const results = {};
        // Пример теста: просто проверяем, что ключ не пустой (можно заменить на реальный API-запрос)
        for (const keyName in keys) {
            results[keyName] = keys[keyName] && keys[keyName].length > 0;
        }
        await updateKeyStatuses(results);
        success('Тестирование завершено');
    } catch (e) {
        error('Ошибка тестирования ключей: ' + e.message);
    }
}

// --- Запускаем все при загрузке страницы ---
displayPlugins();
setupTabs();
loadSavedKeys();
handleUrlParameters(); // Обрабатываем URL параметры