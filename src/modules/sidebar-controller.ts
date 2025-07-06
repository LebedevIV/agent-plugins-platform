/**
 * src/modules/sidebar-controller.ts
 * 
 * Этот модуль отвечает за всю логику, связанную с поведением
 * боковой панели (Side Panel). Он инкапсулирует правила,
 * когда панель должна быть доступна, а когда нет,
 * и формирует правильный URL для ее запуска.
 */

/**
 * Проверяет, является ли URL служебным, где не нужно открывать боковую панель.
 * @param url - Строка URL для проверки.
 */
function isProtectedUrl(url: string | undefined): boolean {
    return !!(url && (url.startsWith('chrome://') || url.startsWith('chrome-extension://')));
}

/**
 * Централизованная функция для настройки боковой панели для конкретной вкладки.
 * Включает или отключает панель и устанавливает правильный URL.
 * @param tab - Объект вкладки, для которой настраивается панель.
 */
export async function configureSidePanelForTab(tab: chrome.tabs.Tab) {
    if (!tab.id) return;

    if (isProtectedUrl(tab.url)) {
        await chrome.sidePanel.setOptions({
            tabId: tab.id,
            enabled: false
        });
    } else {
        const sidebarUrl = `sidepanel.html?tabId=${tab.id}&url=${encodeURIComponent(tab.url || '')}`;
        await chrome.sidePanel.setOptions({
            tabId: tab.id,
            path: sidebarUrl,
            enabled: true
        });
    }
} 