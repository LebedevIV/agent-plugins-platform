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

/**
 * Переключает sidebar напрямую из background script
 * @param tabId - ID вкладки для переключения sidebar
 */
export async function toggleSidebarDirectly(tabId: number): Promise<void> {
    try {
        console.log(`[SidebarController] Переключение sidebar напрямую для вкладки ${tabId}`);
        
        // Проверяем текущее состояние sidebar
        const sidePanelInfo = await chrome.sidePanel.getOptions({ tabId });
        console.log('[SidebarController] Текущее состояние sidebar:', sidePanelInfo);
        
        if (sidePanelInfo.enabled) {
            // Если sidebar включен, пытаемся его открыть
            try {
                await chrome.sidePanel.open({ tabId: tabId });
                console.log('[SidebarController] Sidebar открыт успешно');
            } catch (openError) {
                console.log('[SidebarController] Не удалось открыть sidebar:', openError.message);
                // Если не удалось открыть, отключаем его
                await chrome.sidePanel.setOptions({
                    tabId: tabId,
                    enabled: false
                });
                console.log('[SidebarController] Sidebar отключен');
            }
        } else {
            // Если sidebar отключен, включаем его
            const tab = await chrome.tabs.get(tabId);
            const sidebarUrl = `sidepanel.html?tabId=${tabId}&url=${encodeURIComponent(tab.url || '')}`;
            
            await chrome.sidePanel.setOptions({
                tabId: tabId,
                path: sidebarUrl,
                enabled: true
            });
            console.log('[SidebarController] Sidebar включен с URL:', sidebarUrl);
            
            // Пытаемся открыть sidebar
            try {
                await chrome.sidePanel.open({ tabId: tabId });
                console.log('[SidebarController] Sidebar открыт успешно');
            } catch (openError) {
                console.log('[SidebarController] Не удалось открыть sidebar автоматически:', openError.message);
                console.log('[SidebarController] Пользователь может открыть sidebar вручную через меню браузера');
            }
        }
    } catch (error) {
        console.error('[SidebarController] Ошибка переключения sidebar:', error);
    }
} 