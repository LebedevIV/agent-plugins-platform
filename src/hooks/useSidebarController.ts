/**
 * src/hooks/useSidebarController.ts
 * 
 * Хук для управления сайдпанелью. Предоставляет централизованный
 * интерфейс для настройки и управления поведением сайдпанели.
 */

import { logInfo, logError } from '../utils/logging';

/**
 * Проверка, является ли URL служебным, где не нужно открывать сайдпанель
 */
export function isProtectedUrl(url: string | undefined): boolean {
    return !!(url && (url.startsWith('chrome://') || url.startsWith('chrome-extension://')));
}

/**
 * Централизованная функция для настройки сайдпанели для конкретной вкладки
 */
export async function configureSidePanelForTab(tab: chrome.tabs.Tab): Promise<void> {
    if (!tab.id) {
        logError('Нет ID вкладки для настройки сайдпанели');
        return;
    }

    try {
        if (isProtectedUrl(tab.url)) {
            await chrome.sidePanel.setOptions({
                tabId: tab.id,
                enabled: false
            });
            logInfo('Сайдпанель отключена для защищенной вкладки', { tabId: tab.id, url: tab.url });
        } else {
            const sidebarUrl = `sidepanel.html?tabId=${tab.id}&url=${encodeURIComponent(tab.url || '')}`;
            await chrome.sidePanel.setOptions({
                tabId: tab.id,
                path: sidebarUrl,
                enabled: true
            });
            logInfo('Сайдпанель настроена для вкладки', { tabId: tab.id, url: sidebarUrl });
        }
    } catch (error) {
        logError('Ошибка настройки сайдпанели для вкладки', { tabId: tab.id, error });
    }
}

/**
 * Переключение сайдпанели напрямую из background script
 */
export async function toggleSidebarDirectly(tabId: number): Promise<void> {
    try {
        logInfo('Переключение сайдпанели напрямую', { tabId });
        
        // Проверяем текущее состояние сайдпанели
        const sidePanelInfo = await chrome.sidePanel.getOptions({ tabId });
        logInfo('Текущее состояние сайдпанели', { tabId, sidePanelInfo });
        
        if (sidePanelInfo.enabled) {
            // Если сайдпанель включена, пытаемся ее открыть
            try {
                await chrome.sidePanel.open({ tabId: tabId });
                logInfo('Сайдпанель открыта успешно', { tabId });
            } catch (openError) {
                logInfo('Не удалось открыть сайдпанель', { tabId, error: openError.message });
                // Если не удалось открыть, отключаем ее
                await chrome.sidePanel.setOptions({
                    tabId: tabId,
                    enabled: false
                });
                logInfo('Сайдпанель отключена', { tabId });
            }
        } else {
            // Если сайдпанель отключена, включаем ее
            const tab = await chrome.tabs.get(tabId);
            const sidebarUrl = `sidepanel.html?tabId=${tabId}&url=${encodeURIComponent(tab.url || '')}`;
            
            await chrome.sidePanel.setOptions({
                tabId: tabId,
                path: sidebarUrl,
                enabled: true
            });
            logInfo('Сайдпанель включена', { tabId, url: sidebarUrl });
            
            // Пытаемся открыть сайдпанель
            try {
                await chrome.sidePanel.open({ tabId: tabId });
                logInfo('Сайдпанель открыта успешно', { tabId });
            } catch (openError) {
                logInfo('Не удалось открыть сайдпанель автоматически', { tabId, error: openError.message });
                logInfo('Пользователь может открыть сайдпанель вручную через меню браузера', { tabId });
            }
        }
    } catch (error) {
        logError('Ошибка переключения сайдпанели', { tabId, error });
    }
}

/**
 * Открытие сайдпанели для вкладки
 */
export async function openSidebarForTab(tabId: number): Promise<void> {
    try {
        const tab = await chrome.tabs.get(tabId);
        const sidebarUrl = `sidepanel.html?tabId=${tabId}&url=${encodeURIComponent(tab.url || '')}`;
        
        await chrome.sidePanel.setOptions({
            tabId: tabId,
            path: sidebarUrl,
            enabled: true
        });
        
        await chrome.sidePanel.open({ tabId: tabId });
        logInfo('Сайдпанель открыта для вкладки', { tabId, url: sidebarUrl });
    } catch (error) {
        logError('Ошибка открытия сайдпанели для вкладки', { tabId, error });
    }
}

/**
 * Закрытие сайдпанели для вкладки
 */
export async function closeSidebarForTab(tabId: number): Promise<void> {
    try {
        await chrome.sidePanel.setOptions({
            tabId: tabId,
            enabled: false
        });
        logInfo('Сайдпанель закрыта для вкладки', { tabId });
    } catch (error) {
        logError('Ошибка закрытия сайдпанели для вкладки', { tabId, error });
    }
}

/**
 * Получение состояния сайдпанели для вкладки
 */
export async function getSidebarState(tabId: number): Promise<chrome.sidePanel.PanelOptions | null> {
    try {
        const options = await chrome.sidePanel.getOptions({ tabId });
        logInfo('Состояние сайдпанели получено', { tabId, options });
        return options;
    } catch (error) {
        logError('Ошибка получения состояния сайдпанели', { tabId, error });
        return null;
    }
}

/**
 * Проверка, открыта ли сайдпанель для вкладки
 */
export async function isSidebarOpen(tabId: number): Promise<boolean> {
    try {
        const options = await chrome.sidePanel.getOptions({ tabId });
        return options.enabled || false;
    } catch (error) {
        logError('Ошибка проверки состояния сайдпанели', { tabId, error });
        return false;
    }
} 