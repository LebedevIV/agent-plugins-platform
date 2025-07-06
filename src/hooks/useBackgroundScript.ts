/**
 * src/hooks/useBackgroundScript.ts
 * 
 * Пример использования hooks в background script.
 * Показывает, как организовать код с помощью hooks.
 */

import { getActiveTab, getTabById, sendMessageToTab } from './useChromeApi';
import { sendMessageWithResponse, ping, getTabStates } from './useMessageHandler';
import { getAvailablePlugins, runPlugin, interruptPlugin } from './usePluginManager';
import { isValidTabId, isValidPluginName, isProtectedUrl } from '../utils/validation';
import { logInfo, logError, logWarn } from '../utils/logging';

/**
 * Инициализация background script
 */
export async function initializeBackgroundScript(): Promise<void> {
    try {
        logInfo('Инициализация background script');
        
        // Проверяем связь
        const isConnected = await ping();
        if (!isConnected) {
            logWarn('Background script не может связаться с runtime');
        }
        
        logInfo('Background script инициализирован');
    } catch (error) {
        logError('Ошибка инициализации background script', error);
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
                const plugins = await getAvailablePlugins(message.url);
                return { success: true, data: plugins };

            case 'RUN_PLUGIN':
                if (!isValidTabId(tabId) || !isValidPluginName(message.pluginName)) {
                    return { success: false, error: 'Invalid tabId or pluginName' };
                }
                return await runPlugin(message.pluginName, tabId);

            case 'INTERRUPT_PLUGIN':
                if (!isValidPluginName(message.pluginName)) {
                    return { success: false, error: 'Invalid pluginName' };
                }
                return await interruptPlugin(message.pluginName);

            case 'GET_ALL_STATES':
                if (!isValidTabId(tabId)) {
                    return { success: false, error: 'Invalid tabId' };
                }
                return await getTabStates(tabId);

            case 'TOGGLE_SIDEBAR_REQUEST':
                if (!isValidTabId(tabId)) {
                    return { success: false, error: 'Invalid tabId' };
                }
                // Здесь можно добавить логику переключения sidebar
                return { success: true };

            default:
                logWarn('Неизвестный тип сообщения', { type });
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
                return await runPlugin(data.pluginName, tabId);

            case 'interrupt_plugin':
                if (!data?.pluginName || !isValidPluginName(data.pluginName)) {
                    return { success: false, error: 'Invalid plugin name' };
                }
                return await interruptPlugin(data.pluginName);

            default:
                logWarn('Неизвестная Host API команда', { command });
                return { error: `Unknown host-api command: ${command}` };
        }
    } catch (error) {
        logError('Ошибка обработки Host API сообщения', { command, error });
        return { error: (error as Error).message };
    }
}

/**
 * Настройка sidebar для вкладки
 */
export async function configureSidebarForTab(tab: chrome.tabs.Tab): Promise<void> {
    if (!tab.id) {
        logWarn('Нет ID вкладки для настройки sidebar');
        return;
    }

    try {
        if (isProtectedUrl(tab.url)) {
            await chrome.sidePanel.setOptions({
                tabId: tab.id,
                enabled: false
            });
            logInfo('Sidebar отключен для защищенной вкладки', { tabId: tab.id, url: tab.url });
        } else {
            const sidebarUrl = `sidepanel.html?tabId=${tab.id}&url=${encodeURIComponent(tab.url || '')}`;
            await chrome.sidePanel.setOptions({
                tabId: tab.id,
                path: sidebarUrl,
                enabled: true
            });
            logInfo('Sidebar настроен для вкладки', { tabId: tab.id, url: sidebarUrl });
        }
    } catch (error) {
        logError('Ошибка настройки sidebar для вкладки', { tabId: tab.id, error });
    }
} 