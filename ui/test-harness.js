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
              <button class="run-plugin-btn" onclick="runPlugin('${plugin.id}')">
                🚀 Запустить плагин
              </button>
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

// Функция для запуска плагина (вызывается из правой панели)
window.runPlugin = async function(pluginId) {
    const plugin = await getPluginById(pluginId);
    if (!plugin) {
        showErrorToast('Плагин не найден');
        return;
    }
    
    const card = document.querySelector(`.plugin-card[data-plugin-id="${pluginId}"]`);
    if (!card || card.classList.contains('running')) {
        showWarningToast('Плагин уже запущен');
        return;
    }
    
    // Показываем уведомление о запуске
    showInfoToast(`Запуск плагина: ${plugin.name}`);
    
    // UI-реакция на запуск
    card.classList.add('running');
    const icon = card.querySelector('.plugin-icon');
    const originalIconSrc = icon.src;
    icon.src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" class="plugin-loader" viewBox="0 0 24 24" fill="none" stroke="%23007bff" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>`;

    try {
        // Вызываем наш движок
        await runWorkflow(pluginId);
    } catch (error) {
        console.error(`--- КРИТИЧЕСКАЯ ОШИБКА при выполнении плагина ${plugin.name}:`, error);
        showErrorToast(`Ошибка выполнения: ${error.message}`);
    } finally {
        // Показываем уведомление об успешном завершении
        showSuccessToast(`Плагин ${plugin.name} завершен`);
        // Возвращаем UI в исходное состояние
        card.classList.remove('running');
        icon.src = originalIconSrc;
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