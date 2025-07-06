/**
 * src/background.ts
 * 
 * Фоновый скрипт (Service Worker) нашего расширения.
 * Он является "мозгом" Host-API, обрабатывая запросы от UI,
 * выполняя привилегированные действия (например, доступ к вкладкам)
 * и управляя поведением иконки расширения.
 */

import { configureSidePanelForTab, toggleSidebarDirectly } from './modules/sidebar-controller';
import { getOrCreateTabState, setTabState, getAllTabStates } from './modules/state-manager';
import { getPluginsList, runPluginCommand, interruptPluginCommand } from './modules/plugin-handler';
import { hostApiImpl } from './modules/host-api-impl';
import { getAllPluginStates, updatePluginState } from './modules/plugin-settings';
import { initializeBackgroundScript, handleUIMessage, handleHostApiMessage } from './hooks/useBackgroundScript';
import { logInfo, logError } from './utils/logging';

console.log("APP Background Script Loaded (v0.9.2 - Умная сайдпанель с hooks-архитектурой).");

//================================================================//
//  ИНИЦИАЛИЗАЦИЯ BACKGROUND SCRIPT
//================================================================//

// Инициализируем background script с hooks-архитектурой
initializeBackgroundScript().catch(error => {
    logError('Ошибка инициализации background script', error);
});

//================================================================//
//  ГЛАВНЫЙ СЛУШАТЕЛЬ СООБЩЕНИЙ (HOOKS-АРХИТЕКТУРА)
//================================================================//

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    (async () => {
        try {
            const { type, source } = message;

            // Обработка PING сообщений
            if (type === 'PING') {
                sendResponse({ success: true, pong: true });
                return;
            }

            // Обработка сообщений от UI через hooks
            if (type && !source) {
                const response = await handleUIMessage(message, sender);
                sendResponse(response);
                return;
            }

            // Обработка сообщений от Host-API через hooks
            if (source === 'app-host-api') {
                const response = await handleHostApiMessage(message, sender);
                sendResponse(response);
                return;
            }

            // Обработка специальных сообщений (тестирование)
            if (type === '_TEST_OPEN_SIDE_PANEL' && sender.tab?.id) {
                await toggleSidebarDirectly(sender.tab.id);
                sendResponse({ success: true });
                return;
            }

            // Обработка legacy сообщений (для обратной совместимости)
            const legacyResponse = await handleLegacyMessages(message, sender);
            if (legacyResponse) {
                sendResponse(legacyResponse);
                return;
            }

            // Неизвестные сообщения
            logError('Неизвестный тип сообщения', { type, source });
            sendResponse({ success: false, error: 'Unknown message type' });

        } catch (error) {
            logError('Ошибка обработки сообщения', { message, error });
            sendResponse({ success: false, error: (error as Error).message });
        }
    })();
    
    return true; // Указываем, что ответ будет асинхронным
});

//================================================================//
//  LEGACY ОБРАБОТЧИКИ (ДЛЯ ОБРАТНОЙ СОВМЕСТИМОСТИ)
//================================================================//

async function handleLegacyMessages(message: any, sender: any): Promise<any> {
    const { type, tabId } = message;

    // --- Сообщения от UI (сайдбар, страница настроек) ---
    if (type === 'UPDATE_PLUGIN_STATE') {
        if (message.pluginId && typeof message.updates !== 'undefined') {
            try {
                await updatePluginState(message.pluginId, message.updates);
                return { success: true };
            } catch (e) {
                return { success: false, error: (e as Error).message };
            }
        } else {
            return { success: false, error: "Missing pluginId or updates" };
        }
    } else if (type === 'GET_ALL_STATES') {
        if (tabId) {
            try {
                const state = await getOrCreateTabState(tabId);
                const allPluginStates = await getAllPluginStates();
                return {
                    success: true,
                    states: {
                        ...state,
                        globalState: { runningPlugins: Array.from(state.globalState.runningPlugins) },
                        allPluginStates
                    }
                };
            } catch (e) {
                return { success: false, error: (e as Error).message };
            }
        } else {
            return { success: false, error: "No tabId provided for GET_ALL_STATES" };
        }
    } else if (type === 'GET_PLUGINS') {
        try {
            const plugins = await getPluginsList(message.url);
            return { success: true, plugins };
        } catch (e) {
            return { success: false, error: (e as Error).message };
        }
    } else if (type === 'SEND_MESSAGE' || type === 'UPDATE_INPUT' || type === 'CLEAR_CHAT') {
        if (!tabId) {
            return { success: false, error: "No tabId provided" };
        }
        const state = await getOrCreateTabState(tabId);
        const activePlugin = state.activePluginName;
        
        if (type === 'SEND_MESSAGE' && activePlugin) {
            if (!state.pluginChatStates[activePlugin]) state.pluginChatStates[activePlugin] = { chatHistory: [], currentInput: '' };
            state.pluginChatStates[activePlugin].chatHistory.push({ id: Date.now().toString(), type: 'user', content: message.content, timestamp: Date.now() });
            state.pluginChatStates[activePlugin].currentInput = '';
        } else if (type === 'UPDATE_INPUT' && activePlugin) {
            if (state.pluginChatStates[activePlugin]) state.pluginChatStates[activePlugin].currentInput = message.input;
        } else if (type === 'CLEAR_CHAT' && activePlugin) {
            if (state.pluginChatStates[activePlugin]) state.pluginChatStates[activePlugin].chatHistory = [];
        }
        
        state.lastActivity = Date.now();
        await setTabState(tabId, state);
        return { success: true };
    } else if (type === 'RUN_PLUGIN') {
        if (tabId && message.pluginName) {
            chrome.tabs.sendMessage(tabId, { type: 'RUN_PLUGIN', pluginName: message.pluginName, tabId: tabId });
            const response = await runPluginCommand(message.pluginName, tabId);
            return response;
        } else {
            return { success: false, error: "Missing tabId or pluginName" };
        }
    } else if (type === 'INTERRUPT_PLUGIN') {
        if (message.pluginName) {
            const response = await interruptPluginCommand(message.pluginName, getAllTabStates);
            return response;
        } else {
            return { success: false, error: "Missing pluginName" };
        }
    } else if (type === 'PLUGIN_STATE_CHANGED') {
        try {
            await chrome.runtime.sendMessage({ type: 'PLUGIN_STATE_CHANGED', pluginId: message.pluginId, enabled: message.enabled });
        } catch (error) {
            // Ignore error
        }
        return { success: true, delivered: "attempted" };
    } else if (type === 'TOGGLE_SIDEBAR_REQUEST') {
        if (tabId) await toggleSidebarDirectly(tabId);
        return { success: true };
    } else if (type === 'GET_CURRENT_TAB_ID') {
        if (sender.tab && sender.tab.id) {
            return { success: true, tabId: sender.tab.id };
        } else {
            try {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                return { success: true, tabId: tab?.id };
            } catch (e) {
                return { success: false, error: (e as Error).message };
            }
        }
    }

    return null; // Сообщение не обработано
}

//================================================================//
//  4. СОЗДАНИЕ КОНТЕКСТНОГО МЕНЮ
//================================================================//

chrome.runtime.onInstalled.addListener(async () => {
  // Создаем контекстное меню
  chrome.contextMenus.create({
    id: 'open-platform',
    title: 'Открыть панель управления APP',
    contexts: ['action']
  });

  // Настраиваем поведение sidebar
  try {
    // ВОЗВРАЩАЕМ ЭТУ СТРОКУ. Теперь браузер сам будет открывать панель при клике.
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    console.log('[Background] Sidebar поведение настроено: клик по иконке будет открывать sidebar');
  } catch (error) {
    console.error('[Background] Ошибка настройки поведения sidebar:', error);
  }
});

//================================================================//
//  5. ОБРАБОТЧИК КЛИКА ПО ИКОНКЕ РАСШИРЕНИЯ (НОВАЯ ЛОГИКА)
//================================================================//

// Вся логика перенесена в `sidebar-controller.ts` и вызывается
// из обработчиков onActivated и onUpdated.
// Это место остается пустым намеренно.

//================================================================//
//  6. ОБРАБОТЧИК СМЕНЫ ВКЛАДОК
//================================================================//

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  console.log('[Background] Активирована вкладка:', activeInfo.tabId);
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    await configureSidePanelForTab(tab); // Настраиваем панель для новой активной вкладки
    if (tab.url) {
      await getOrCreateTabState(activeInfo.tabId, tab.url);
    }
  } catch (error) {
    console.error('[Background] Ошибка обработки смены вкладки:', error);
  }
});

//================================================================//
//  6.1. ОБРАБОТЧИК ИЗМЕНЕНИЯ URL ВКЛАДКИ
//================================================================//

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Настраиваем панель при каждом значительном обновлении вкладки
  if (changeInfo.status === 'complete' || changeInfo.url) {
      if (tab.url) {
          await configureSidePanelForTab(tab);
          await getOrCreateTabState(tabId, tab.url);
      }
  }

  // Логика автозапуска плагинов
  const isProtected = tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://'));
  if (changeInfo.status === 'complete' && tab.url && !isProtected) {
        console.log(`[AutoRun] Страница ${tab.url} полностью загружена. Проверка плагинов для автозапуска.`);
        
        try {
          const plugins = await getPluginsList(tab.url); // Получаем список плагинов, подходящих для этого URL
          const pluginStates = await getAllPluginStates();

          for (const plugin of plugins) {
            const state = pluginStates[plugin.name];
            if (state && state.enabled && state.autoRun) {
              console.log(`[AutoRun] Запуск плагина "${plugin.name}" для вкладки ${tabId}.`);
              // Запускаем плагин, не дожидаясь ответа, чтобы не блокировать цикл
              runPluginCommand(plugin.name, tabId); 
            }
          }
    } catch (error) {
          console.error('[AutoRun] Ошибка при автозапуске плагинов:', error);
    }
  }
});

//================================================================//
//  7. ОБРАБОТЧИК КОНТЕКСТНОГО МЕНЮ
//================================================================//

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'open-platform') {
  const platformPageUrl = chrome.runtime.getURL('options.html');
  chrome.tabs.query({ url: platformPageUrl }, (tabs) => {
    if (tabs.length > 0) {
      chrome.tabs.update(tabs[0].id!, { active: true });
      if (tabs[0].windowId) {
          chrome.windows.update(tabs[0].windowId, { focused: true });
      }
    } else {
      chrome.tabs.create({ url: platformPageUrl });
    }
  });
  }
});

//================================================================//
//  X. УПРАВЛЕНИЕ ЖИЗНЕННЫМ ЦИКЛОМ ВКЛАДОК
//================================================================//

// Вся логика (onRemoved) перенесена в `src/modules/state-manager.ts`