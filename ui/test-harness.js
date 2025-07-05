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

// --- Запускаем все при загрузке страницы ---
displayPlugins();
setupTabs();