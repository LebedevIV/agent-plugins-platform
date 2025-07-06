/**
 * src/hooks/useMessageHandler.ts
 * 
 * Хук для обработки сообщений между компонентами расширения.
 * Предоставляет централизованную систему обработки сообщений.
 */

import { sendRuntimeMessage } from './useChromeApi';

export interface MessageResponse {
    success: boolean;
    data?: any;
    error?: string;
    pong?: boolean;
}

/**
 * Отправка сообщения и ожидание ответа
 */
export async function sendMessageWithResponse(message: any): Promise<MessageResponse> {
    try {
        const response = await sendRuntimeMessage(message);
        return response || { success: false, error: 'No response received' };
    } catch (error) {
        console.error('[useMessageHandler] Ошибка отправки сообщения:', error);
        return { success: false, error: (error as Error).message };
    }
}

/**
 * Простая отправка сообщения без ожидания ответа
 */
export async function sendMessage(message: any): Promise<void> {
    try {
        await sendRuntimeMessage(message);
    } catch (error) {
        console.error('[useMessageHandler] Ошибка отправки сообщения:', error);
    }
}

/**
 * Ping/Pong для проверки связи
 */
export async function ping(): Promise<boolean> {
    try {
        const response = await sendMessageWithResponse({ type: 'PING' });
        return response.success && response.pong === true;
    } catch (error) {
        console.error('[useMessageHandler] Ping failed:', error);
        return false;
    }
}

/**
 * Получение состояния для вкладки
 */
export async function getTabStates(tabId: number): Promise<MessageResponse> {
    return await sendMessageWithResponse({
        type: 'GET_ALL_STATES',
        tabId
    });
}

/**
 * Получение списка плагинов
 */
export async function getPlugins(url?: string): Promise<MessageResponse> {
    return await sendMessageWithResponse({
        type: 'GET_PLUGINS',
        url
    });
}

/**
 * Запуск плагина
 */
export async function runPlugin(pluginName: string, tabId: number): Promise<MessageResponse> {
    return await sendMessageWithResponse({
        type: 'RUN_PLUGIN',
        pluginName,
        tabId
    });
}

/**
 * Прерывание плагина
 */
export async function interruptPlugin(pluginName: string): Promise<MessageResponse> {
    return await sendMessageWithResponse({
        type: 'INTERRUPT_PLUGIN',
        pluginName
    });
}

/**
 * Обновление состояния плагина
 */
export async function updatePluginState(pluginId: string, updates: any): Promise<MessageResponse> {
    return await sendMessageWithResponse({
        type: 'UPDATE_PLUGIN_STATE',
        pluginId,
        updates
    });
}

/**
 * Переключение sidebar
 */
export async function toggleSidebar(tabId: number): Promise<MessageResponse> {
    return await sendMessageWithResponse({
        type: 'TOGGLE_SIDEBAR_REQUEST',
        tabId
    });
}

/**
 * Получение ID текущей вкладки
 */
export async function getCurrentTabId(): Promise<MessageResponse> {
    return await sendMessageWithResponse({
        type: 'GET_CURRENT_TAB_ID'
    });
} 