/**
 * ui/test-harness.js
 * Главный скрипт для нашего UI (index.html).
 */

import { getAvailablePlugins } from '../core/plugin-manager.js';
import { createPluginCard } from './PluginCard.js';
import { hostApi } from '../core/host-api.js';
import { runWorkflow } from '../core/workflow-engine.js';
import { showSuccessToast, showErrorToast, showInfoToast, showWarningToast } from './toast-notifications.js';

// --- Инициализация глобального Host-API ---
window.hostApi = hostApi;

// Переопределяем sendMessageToChat для работы с sidebar
window.hostApi.sendMessageToChat = (message) => {
    // Логи теперь отправляются в sidebar соответствующей вкладки
    console.log("[Python Message] Сообщение для sidebar:", message.content);
};

console.log('Тестовый стенд инициализирован (v0.6.0).');

// --- Основная логика ---

// Функция для отображения информации о плагине
function showPluginInfo(plugin) {
    // Получаем текущее состояние плагина
    const isEnabled = getPluginState(plugin.id);
    
    // --- Обновляем правую колонку ---
    const rightSidebar = document.querySelector('.ide-sidebar-right');
    if (rightSidebar) {
        rightSidebar.innerHTML = `
          <div class="plugin-info">
            <h2>${plugin.name}</h2>
            <div class="plugin-meta">
              <span class="version">Версия: ${plugin.version}</span>
              <span class="id">ID: ${plugin.id}</span>
            </div>
            <div class="plugin-description">
              <h3>Описание</h3>
              <p>${plugin.description}</p>
            </div>
            <div class="plugin-actions">
              <h3>Действия</h3>
              <div class="plugin-toggle">
                <label class="toggle-switch">
                  <input type="checkbox" id="toggle-${plugin.id}" onchange="togglePlugin('${plugin.id}', this.checked)" ${isEnabled ? 'checked' : ''}>
                  <span class="toggle-slider"></span>
                </label>
                <span class="toggle-label">Включить плагин</span>
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

// Функция для переключения состояния плагина
window.togglePlugin = async function(pluginId, enabled) {
    try {
        // Сохраняем состояние плагина в localStorage
        const pluginStates = JSON.parse(localStorage.getItem('pluginStates') || '{}');
        pluginStates[pluginId] = enabled;
        localStorage.setItem('pluginStates', JSON.stringify(pluginStates));
        
        // Обновляем UI
        const card = document.querySelector(`.plugin-card[data-plugin-id="${pluginId}"]`);
        if (card) {
            if (enabled) {
                card.classList.remove('disabled');
                showSuccessToast(`Плагин включен`);
            } else {
                card.classList.add('disabled');
                showInfoToast(`Плагин отключен`);
            }
        }
        
        // Обновляем переключатель в правой панели
        const toggle = document.getElementById(`toggle-${pluginId}`);
        if (toggle) {
            toggle.checked = enabled;
        }
        
    } catch (error) {
        console.error('Ошибка переключения плагина:', error);
        showErrorToast(`Ошибка: ${error.message}`);
    }
}

// Функция для получения состояния плагина
function getPluginState(pluginId) {
    try {
        const pluginStates = JSON.parse(localStorage.getItem('pluginStates') || '{}');
        return pluginStates[pluginId] || false;
    } catch (error) {
        console.error('Ошибка получения состояния плагина:', error);
        return false;
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

// Функции для просмотра файлов плагина
window.viewManifest = function(pluginId) {
    showInfoToast(`Просмотр манифеста плагина ${pluginId}`);
    // Здесь можно добавить логику для отображения содержимого manifest.json
}

window.viewWorkflow = function(pluginId) {
    showInfoToast(`Просмотр workflow плагина ${pluginId}`);
    // Здесь можно добавить логику для отображения содержимого workflow.json
}

// Отображение плагинов
async function displayPlugins() {
    const pluginsListContainer = document.getElementById('plugins-list');
    if (!pluginsListContainer) return;
    
    try {
        const plugins = await getAvailablePlugins();
        pluginsListContainer.innerHTML = '';
        plugins.forEach(plugin => {
            const pluginCard = createPluginCard(plugin);
            // Добавляем атрибут, чтобы мы могли найти эту карточку
            pluginCard.dataset.pluginId = plugin.id;
            
            // Проверяем состояние плагина
            const isEnabled = getPluginState(plugin.id);
            if (!isEnabled) {
                pluginCard.classList.add('disabled');
            }
            
            // Назначаем обработчик клика для показа информации о плагине
            pluginCard.onclick = () => showPluginInfo(plugin);
            pluginsListContainer.appendChild(pluginCard);
        });
    } catch (error) {
        pluginsListContainer.textContent = `Ошибка при загрузке плагинов: ${error.message}`;
        console.error("Ошибка в displayPlugins:", error);
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

// Сохранение всех API ключей
window.saveAIKeys = function() {
    try {
        const keys = {
            'gemini-flash': document.getElementById('gemini-flash-key').value,
            'gemini-25': document.getElementById('gemini-25-key').value
        };
        
        // Добавляем пользовательские ключи
        const customKeys = getCustomKeys();
        Object.assign(keys, customKeys);
        
        // Сохраняем в localStorage
        localStorage.setItem('aiApiKeys', JSON.stringify(keys));
        
        // Обновляем статусы
        updateKeyStatuses();
        
        showSuccessToast('API ключи сохранены');
    } catch (error) {
        console.error('Ошибка сохранения ключей:', error);
        showErrorToast('Ошибка сохранения ключей');
    }
}

// Тестирование API ключей
window.testAIKeys = async function() {
    try {
        const keys = JSON.parse(localStorage.getItem('aiApiKeys') || '{}');
        const results = {};
        
        // Тестируем каждый ключ
        for (const [keyName, keyValue] of Object.entries(keys)) {
            if (keyValue) {
                try {
                    // Здесь будет реальное тестирование API
                    // Пока просто проверяем формат ключа
                    const isValid = keyValue.length > 20 && keyValue.includes('AIza');
                    results[keyName] = isValid;
                } catch (error) {
                    results[keyName] = false;
                }
            } else {
                results[keyName] = false;
            }
        }
        
        // Обновляем статусы
        updateKeyStatuses(results);
        
        showSuccessToast('Тестирование завершено');
    } catch (error) {
        console.error('Ошибка тестирования ключей:', error);
        showErrorToast('Ошибка тестирования ключей');
    }
}

// Обновление статусов ключей
function updateKeyStatuses(testResults = null) {
    const keys = JSON.parse(localStorage.getItem('aiApiKeys') || '{}');
    
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
    showSuccessToast('Добавлен новый ключ');
}

// Удаление пользовательского ключа
window.removeCustomKey = function(keyId) {
    const keyElement = document.getElementById(keyId);
    if (keyElement) {
        keyElement.remove();
        showSuccessToast('Ключ удален');
    }
}

// Обновление названия пользовательского ключа
window.updateCustomKeyName = function(keyId, name) {
    // Сохраняем название в localStorage
    const customKeyNames = JSON.parse(localStorage.getItem('customKeyNames') || '{}');
    customKeyNames[keyId] = name;
    localStorage.setItem('customKeyNames', JSON.stringify(customKeyNames));
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

// Загрузка сохраненных ключей
function loadSavedKeys() {
    try {
        const keys = JSON.parse(localStorage.getItem('aiApiKeys') || '{}');
        
        if (keys['gemini-flash']) {
            document.getElementById('gemini-flash-key').value = keys['gemini-flash'];
        }
        if (keys['gemini-25']) {
            document.getElementById('gemini-25-key').value = keys['gemini-25'];
        }
        
        // Загружаем пользовательские ключи
        loadCustomKeys(keys);
        
        updateKeyStatuses();
    } catch (error) {
        console.error('Ошибка загрузки ключей:', error);
    }
}

// Загрузка пользовательских ключей
function loadCustomKeys(keys) {
    const customKeyNames = JSON.parse(localStorage.getItem('customKeyNames') || '{}');
    
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

// --- Запускаем все при загрузке страницы ---
displayPlugins();
setupTabs();
loadSavedKeys();