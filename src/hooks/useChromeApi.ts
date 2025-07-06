/**
 * src/hooks/useChromeApi.ts
 * 
 * Хук для работы с Chrome API. Централизует все операции
 * с Chrome API и предоставляет удобные обертки.
 */

import { isSiteCompatible } from './usePluginManager';
import { logInfo, logError } from '../utils/logging';

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

/**
 * Открытие сайдпанели только на совместимых сайтах
 */
export async function openSidebarIfCompatible(tabId: number, url: string): Promise<void> {
    try {
        if (isSiteCompatible(url)) {
            await chrome.sidePanel.open({ tabId });
            logInfo('Сайдпанель открыта для совместимого сайта', { tabId, url });
        } else {
            logInfo('Сайдпанель не открыта - сайт не совместим', { tabId, url });
        }
    } catch (error) {
        logError('Ошибка открытия сайдпанели', { tabId, url, error });
    }
}

/**
 * Закрытие сайдпанели на несовместимых сайтах
 */
export async function closeSidebarIfIncompatible(tabId: number, url: string): Promise<void> {
    try {
        if (!isSiteCompatible(url)) {
            // В Chrome Extensions API нет прямого метода close для sidePanel
            // Вместо этого отключаем сайдпанель для этой вкладки
            await chrome.sidePanel.setOptions({
                tabId,
                enabled: false
            });
            logInfo('Сайдпанель отключена - сайт не совместим', { tabId, url });
        }
    } catch (error) {
        logError('Ошибка отключения сайдпанели', { tabId, url, error });
    }
}

/**
 * Управление сайдпанелью на основе совместимости сайта
 */
export async function manageSidebarForSite(tabId: number, url: string): Promise<void> {
    try {
        if (isSiteCompatible(url)) {
            // На совместимых сайтах - включаем и открываем сайдпанель
            await chrome.sidePanel.setOptions({
                tabId,
                enabled: true
            });
            await chrome.sidePanel.open({ tabId });
            logInfo('Сайдпанель открыта для совместимого сайта', { tabId, url });
        } else {
            // На несовместимых сайтах - отключаем сайдпанель
            await chrome.sidePanel.setOptions({
                tabId,
                enabled: false
            });
            logInfo('Сайдпанель отключена для несовместимого сайта', { tabId, url });
        }
    } catch (error) {
        logError('Ошибка управления сайдпанелью', { tabId, url, error });
    }
}

/**
 * Настройка опций сайдпанели для вкладки
 */
export async function configureSidebarOptions(tabId: number, url: string): Promise<void> {
    try {
        const sidebarUrl = `sidepanel.html?tabId=${tabId}&url=${encodeURIComponent(url || '')}`;
        
        await chrome.sidePanel.setOptions({
            tabId,
            path: sidebarUrl,
            enabled: true
        });
        
        logInfo('Опции сайдпанели настроены', { tabId, url: sidebarUrl });
    } catch (error) {
        logError('Ошибка настройки опций сайдпанели', { tabId, url, error });
    }
} 