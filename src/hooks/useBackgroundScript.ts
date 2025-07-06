/**
 * src/hooks/useBackgroundScript.ts
 * 
 * Основная логика background script с использованием hooks-архитектуры.
 * Координирует работу всех hooks и обрабатывает сообщения.
 */

import { 
    getActiveTab, 
    getTabById, 
    sendMessageToTab,
    manageSidebarForSite,
    configureSidebarOptions
} from './useChromeApi';
import { sendMessageWithResponse, ping, getTabStates } from './useMessageHandler';
import { getAvailablePlugins, runPlugin, interruptPlugin, isSiteCompatible } from './usePluginManager';
import { 
    getPluginsList, 
    runPluginCommand, 
    interruptPluginCommand
} from './usePluginHandler';
import { 
    getOrCreateTabState, 
    setTabState, 
    getAllTabStates,
    addChatMessage,
    updateChatInput,
    clearChat,
    setActivePlugin,
    initializeStateManager
} from './useStateManager';
import { 
    configureSidePanelForTab,
    toggleSidebarDirectly,
    isProtectedUrl
} from './useSidebarController';
import { isValidTabId, isValidPluginName } from '../utils/validation';
import { logInfo, logError, logWarn } from '../utils/logging';

/**
 * Инициализация background script
 */
export async function initializeBackgroundScript(): Promise<void> {
    try {
        logInfo('Инициализация background script');
        
        // Инициализируем менеджер состояний
        initializeStateManager();
        
        // Проверяем связь
        const isConnected = await ping();
        if (!isConnected) {
            logWarn('Background script не может связаться с runtime');
        }
        
        // Настраиваем обработчики событий вкладок
        setupTabEventHandlers();
        
        logInfo('Background script инициализирован');
    } catch (error) {
        logError('Ошибка инициализации background script', error);
    }
}

/**
 * Настройка обработчиков событий вкладок
 */
function setupTabEventHandlers(): void {
    try {
        // Обработка обновления вкладки
        chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
            if (changeInfo.status === 'complete' && tab.url) {
                logInfo('Вкладка обновлена', { tabId, url: tab.url });
                
                // Настраиваем сайдпанель для вкладки
                await configureSidePanelForTab(tab);
                
                // Управляем видимостью сайдпанели на основе совместимости
                await manageSidebarForSite(tabId, tab.url);
            }
        });

        // Обработка активации вкладки
        chrome.tabs.onActivated.addListener(async (activeInfo) => {
            try {
                const tab = await getTabById(activeInfo.tabId);
                if (tab && tab.url) {
                    logInfo('Вкладка активирована', { tabId: tab.id, url: tab.url });
                    
                    // Управляем видимостью сайдпанели при переключении вкладок
                    await manageSidebarForSite(activeInfo.tabId, tab.url);
                }
            } catch (error) {
                logError('Ошибка обработки активации вкладки', { tabId: activeInfo.tabId, error });
            }
        });

        // Обработка создания новой вкладки
        chrome.tabs.onCreated.addListener(async (tab) => {
            if (tab.url) {
                logInfo('Новая вкладка создана', { tabId: tab.id, url: tab.url });
                
                // Настраиваем сайдпанель для новой вкладки
                await configureSidePanelForTab(tab);
                
                // Управляем видимостью сайдпанели
                await manageSidebarForSite(tab.id!, tab.url);
            }
        });

        logInfo('Обработчики событий вкладок настроены');
    } catch (error) {
        logError('Ошибка настройки обработчиков событий вкладок', error);
    }
}

/**
 * Обработка сообщений от UI
 */
export async function handleUIMessage(message: any, sender: any): Promise<any> {
    const { type, tabId } = message;
    
    logInfo('Получено UI сообщение', { type, tabId, sender: sender?.tab?.id });

    // Валидация сообщения
    if (!type) {
        return { success: false, error: 'Message type is required' };
    }

    try {
        switch (type) {
            case 'PING':
                return { success: true, pong: true };

            case 'GET_PLUGINS':
                const plugins = await getPluginsList(message.url);
                return { success: true, data: plugins };

            case 'RUN_PLUGIN':
                if (!isValidTabId(tabId) || !isValidPluginName(message.pluginName)) {
                    return { success: false, error: 'Invalid tabId or pluginName' };
                }
                return await runPluginCommand(message.pluginName, tabId);

            case 'INTERRUPT_PLUGIN':
                if (!isValidPluginName(message.pluginName)) {
                    return { success: false, error: 'Invalid pluginName' };
                }
                return await interruptPluginCommand(message.pluginName, getAllTabStates);

            case 'GET_ALL_STATES':
                if (!isValidTabId(tabId)) {
                    return { success: false, error: 'Invalid tabId' };
                }
                return await getTabStates(tabId);

            case 'SEND_MESSAGE':
                if (!isValidTabId(tabId)) {
                    return { success: false, error: 'Invalid tabId' };
                }
                const state = await getOrCreateTabState(tabId);
                const activePlugin = state.activePluginName;
                
                if (activePlugin && message.content) {
                    await addChatMessage(tabId, activePlugin, {
                        type: 'user',
                        content: message.content
                    });
                }
                return { success: true };

            case 'UPDATE_INPUT':
                if (!isValidTabId(tabId)) {
                    return { success: false, error: 'Invalid tabId' };
                }
                const state2 = await getOrCreateTabState(tabId);
                const activePlugin2 = state2.activePluginName;
                
                if (activePlugin2 && message.input !== undefined) {
                    await updateChatInput(tabId, activePlugin2, message.input);
                }
                return { success: true };

            case 'CLEAR_CHAT':
                if (!isValidTabId(tabId)) {
                    return { success: false, error: 'Invalid tabId' };
                }
                const state3 = await getOrCreateTabState(tabId);
                const activePlugin3 = state3.activePluginName;
                
                if (activePlugin3) {
                    await clearChat(tabId, activePlugin3);
                }
                return { success: true };

            case 'TOGGLE_SIDEBAR_REQUEST':
                if (!isValidTabId(tabId)) {
                    return { success: false, error: 'Invalid tabId' };
                }
                await toggleSidebarDirectly(tabId);
                return { success: true };

            case 'GET_CURRENT_TAB_ID':
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

            default:
                logWarn('Неизвестный тип UI сообщения', { type });
                return { success: false, error: 'Unknown message type' };
        }
    } catch (error) {
        logError('Ошибка обработки UI сообщения', { type, error });
        return { success: false, error: (error as Error).message };
    }
}

/**
 * Обработка сообщений от Host API
 */
export async function handleHostApiMessage(message: any, sender: any): Promise<any> {
    const { command, data, targetTabId } = message;
    
    logInfo('Получено Host API сообщение', { command, targetTabId });

    if (!command) {
        return { error: 'Command is required' };
    }

    try {
        switch (command) {
            case 'getActivePageContent':
                if (!isValidTabId(targetTabId)) {
                    return { error: 'Invalid targetTabId' };
                }
                // Здесь должна быть логика получения контента страницы
                return { success: true, data: 'Page content placeholder' };

            case 'run_plugin':
                if (!data?.pluginName || !isValidPluginName(data.pluginName)) {
                    return { success: false, error: 'Invalid plugin name' };
                }
                const tabId = sender.tab?.id;
                if (!isValidTabId(tabId)) {
                    return { success: false, error: 'Invalid tab ID' };
                }
                return await runPluginCommand(data.pluginName, tabId);

            case 'interrupt_plugin':
                if (!data?.pluginName || !isValidPluginName(data.pluginName)) {
                    return { success: false, error: 'Invalid plugin name' };
                }
                return await interruptPluginCommand(data.pluginName, getAllTabStates);

            default:
                logWarn('Неизвестная Host API команда', { command });
                return { error: `Unknown host-api command: ${command}` };
        }
    } catch (error) {
        logError('Ошибка обработки Host API сообщения', { command, error });
        return { error: (error as Error).message };
    }
} 