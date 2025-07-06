/**
 * src/hooks/useChromeApi.ts
 * 
 * Хук для работы с Chrome API. Централизует все операции
 * с Chrome API и предоставляет удобные обертки.
 */

/**
 * Получение активной вкладки
 */
export async function getActiveTab(): Promise<chrome.tabs.Tab | null> {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        return tab || null;
    } catch (error) {
        console.error('[useChromeApi] Ошибка получения активной вкладки:', error);
        return null;
    }
}

/**
 * Получение вкладки по ID
 */
export async function getTabById(tabId: number): Promise<chrome.tabs.Tab | null> {
    try {
        return await chrome.tabs.get(tabId);
    } catch (error) {
        console.error(`[useChromeApi] Ошибка получения вкладки ${tabId}:`, error);
        return null;
    }
}

/**
 * Отправка сообщения на вкладку
 */
export async function sendMessageToTab(tabId: number, message: any): Promise<any> {
    try {
        return await chrome.tabs.sendMessage(tabId, message);
    } catch (error) {
        console.error(`[useChromeApi] Ошибка отправки сообщения на вкладку ${tabId}:`, error);
        throw error;
    }
}

/**
 * Отправка сообщения в runtime
 */
export async function sendRuntimeMessage(message: any): Promise<any> {
    try {
        return await chrome.runtime.sendMessage(message);
    } catch (error) {
        console.error('[useChromeApi] Ошибка отправки runtime сообщения:', error);
        throw error;
    }
}

/**
 * Работа с storage
 */
export const storage = {
    async get(keys?: string | string[] | object): Promise<any> {
        try {
            return await chrome.storage.sync.get(keys);
        } catch (error) {
            console.error('[useChromeApi] Ошибка получения из storage:', error);
            throw error;
        }
    },

    async set(items: object): Promise<void> {
        try {
            await chrome.storage.sync.set(items);
        } catch (error) {
            console.error('[useChromeApi] Ошибка сохранения в storage:', error);
            throw error;
        }
    },

    async remove(keys: string | string[]): Promise<void> {
        try {
            await chrome.storage.sync.remove(keys);
        } catch (error) {
            console.error('[useChromeApi] Ошибка удаления из storage:', error);
            throw error;
        }
    }
};

/**
 * Проверка доступности Chrome API
 */
export function isChromeApiAvailable(): boolean {
    return typeof chrome !== 'undefined' && 
           typeof chrome.tabs !== 'undefined' && 
           typeof chrome.runtime !== 'undefined';
} 