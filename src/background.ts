/**
 * src/background.ts
 * 
 * Фоновый скрипт (Service Worker) нашего расширения.
 * Он является "мозгом" Host-API, обрабатывая запросы от UI,
 * выполняя привилегированные действия (например, доступ к вкладкам)
 * и управляя поведением иконки расширения.
 */

import { configureSidePanelForTab } from './modules/sidebar-controller';
import { getOrCreateTabState, setTabState, getAllTabStates } from './modules/state-manager';
import { getPluginsList, runPluginCommand, interruptPluginCommand } from './modules/plugin-handler';
import { hostApiImpl } from './modules/host-api-impl';
import { getAllPluginStates, updatePluginState } from './modules/plugin-settings';

console.log("APP Background Script Loaded (v0.9.1 - Система боковой панели).");

//================================================================//
//  ЛОГИКА УПРАВЛЕНИЯ НАСТРОЙКАМИ ПЛАГИНОВ
//================================================================//

// Вся логика (`getAllPluginStates`, `updatePluginState` и т.д.)
// перенесена в `src/modules/plugin-settings.ts`

//================================================================//
//  3. ГЛАВНЫЙ СЛУШАТЕЛЬ СООБЩЕНИЙ (РЕФАКТОРИНГ)
//================================================================//

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    (async () => {
        const { type, tabId } = message;

        if (type === 'PING') {
            sendResponse({ success: true, pong: true });
            return;
        }

        // --- Сообщения от UI (сайдбар, страница настроек) ---
        if (type === 'UPDATE_PLUGIN_STATE') {
            if (message.pluginId && typeof message.updates !== 'undefined') {
                try {
                    await updatePluginState(message.pluginId, message.updates);
                    sendResponse({ success: true });
                } catch (e) {
                    sendResponse({ success: false, error: (e as Error).message });
                }
            } else {
                sendResponse({ success: false, error: "Missing pluginId or updates" });
            }
        } else if (type === 'GET_ALL_STATES') {
            if (tabId) {
                try {
                    const state = await getOrCreateTabState(tabId);
                    const allPluginStates = await getAllPluginStates();
                    sendResponse({
                        success: true,
                        states: {
                            ...state,
                            globalState: { runningPlugins: Array.from(state.globalState.runningPlugins) },
                            allPluginStates
                        }
                    });
                } catch (e) {
                    sendResponse({ success: false, error: (e as Error).message });
                }
            } else {
                sendResponse({ success: false, error: "No tabId provided for GET_ALL_STATES" });
            }
        } else if (type === 'GET_PLUGINS') {
            try {
                const plugins = await getPluginsList(message.url);
                sendResponse({ success: true, plugins });
            } catch (e) {
                sendResponse({ success: false, error: (e as Error).message });
            }
        } else if (type === 'SEND_MESSAGE' || type === 'UPDATE_INPUT' || type === 'CLEAR_CHAT') {
            if (!tabId) {
                sendResponse({ success: false, error: "No tabId provided" });
                return;
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
            sendResponse({ success: true });
        } else if (type === 'RUN_PLUGIN') {
            if (tabId && message.pluginName) {
                chrome.tabs.sendMessage(tabId, { type: 'RUN_PLUGIN', pluginName: message.pluginName, tabId: tabId });
                const response = await runPluginCommand(message.pluginName, tabId);
                sendResponse(response);
            } else {
                sendResponse({ success: false, error: "Missing tabId or pluginName" });
            }
        } else if (type === 'INTERRUPT_PLUGIN') {
            if (message.pluginName) {
                const response = await interruptPluginCommand(message.pluginName, getAllTabStates);
                sendResponse(response);
            } else {
                sendResponse({ success: false, error: "Missing pluginName" });
            }
        } else if (type === 'PLUGIN_STATE_CHANGED') {
            try {
                await chrome.runtime.sendMessage({ type: 'PLUGIN_STATE_CHANGED', pluginId: message.pluginId, enabled: message.enabled });
            } catch (error) {
                // Ignore error
            }
            sendResponse({ success: true, delivered: "attempted" });
        } else if (type === 'TOGGLE_SIDEBAR_REQUEST') {
            if (tabId) await toggleSidebarDirectly(tabId);
            sendResponse({ success: true });
        } else if (type === 'GET_CURRENT_TAB_ID') {
            if (sender.tab && sender.tab.id) {
                sendResponse({ success: true, tabId: sender.tab.id });
            } else {
                try {
                    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                    sendResponse({ success: true, tabId: tab?.id });
                } catch (e) {
                    sendResponse({ success: false, error: (e as Error).message });
                }
            }
        }

        // --- Сообщения от Host-API (плагины) ---
        else if (message.source === 'app-host-api') {
            const { command, data, targetTabId } = message;
            
            switch (command) {
                case "getActivePageContent":
                    if (!targetTabId) {
                        sendResponse({ error: "Target tab ID was not provided." });
                        return;
                    }
                    const content = await hostApiImpl.getActivePageContent(targetTabId);
                    sendResponse(content);
                    break;
                case "getElements":
                    if (!targetTabId) {
                        sendResponse({ error: "Target tab ID was not provided." });
                        return;
                    }
                    const elements = await hostApiImpl.getElements(targetTabId, data);
                    sendResponse(elements);
                    break;
                case "host_fetch":
                    try {
                        const jsonData = await hostApiImpl.fetchWithRetry(data.url);
                        sendResponse({ error: false, data: jsonData });
                    } catch (err: any) {
                        sendResponse({ error: true, error_message: err.message });
                    }
                    break;
                case "analyzeConnectionStats":
                    if (!data || !data.hostname) {
                        sendResponse({ error: "Hostname was not provided." });
                        return;
                    }
                    const stats = await hostApiImpl.analyzeConnectionStats(data);
                    sendResponse(stats);
                    break;
                case "run_plugin":
                     if (!data || !data.pluginName) {
                         sendResponse({ success: false, error: "Plugin name was not provided." });
                         return;
                     }
                    const runResponse = await runPluginCommand(data.pluginName, sender.tab?.id);
                    sendResponse(runResponse);
                    break;
                case "interrupt_plugin":
                    if (!data || !data.pluginName) {
                        sendResponse({ success: false, error: "Plugin name was not provided." });
                        return;
                    }
                    const interruptResponse = await interruptPluginCommand(data.pluginName, getAllTabStates);
                    sendResponse(interruptResponse);
                    break;
                default:
                    sendResponse({ error: `Unknown host-api command: ${command}` });
            }
        }

        // --- Специальные сообщения (тестирование и т.д.) ---
        else if (type === '_TEST_OPEN_SIDE_PANEL' && sender.tab?.id) {
            await toggleSidebarDirectly(sender.tab.id);
            sendResponse({ success: true });
        }
        
        // --- Неизвестные сообщения ---
        else {
            // Закомментировал, чтобы избежать спама в логах от других расширений
            // console.warn(`[Background] Получено неизвестное сообщение:`, message);
            // sendResponse({ success: false, error: 'Unknown message type' });
        }
    })();

    // ВОЗВРАЩАЕМ TRUE, чтобы канал оставался открытым для асинхронного sendResponse
    return true;
});

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