/**
 * src/background.ts
 * 
 * Фоновый скрипт (Service Worker) нашего расширения.
 */

import { initializeBackgroundScript, handleUIMessage, handleHostApiMessage, toggleSidebarDirectly } from './hooks';
import { logInfo, logError } from './utils/logging';

console.log("APP Background Script Loaded (v0.9.3 - Полная hooks-архитектура).");

//================================================================//
//  ИНИЦИАЛИЗАЦИЯ BACKGROUND SCRIPT
//================================================================//

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

            if (type === 'PING') {
                sendResponse({ success: true, pong: true });
                return;
            }

            if (type && !source) {
                const response = await handleUIMessage(message, sender);
                sendResponse(response);
                return;
            }

            if (source === 'app-host-api') {
                const response = await handleHostApiMessage(message, sender);
                sendResponse(response);
                return;
            }

            if (type === '_TEST_OPEN_SIDE_PANEL' && sender.tab?.id) {
                try {
                    await chrome.sidePanel.open({ tabId: sender.tab.id });
                    logInfo('Test side panel opened for tab', sender.tab.id);
                    sendResponse({ success: true });
                } catch (error) {
                    logError('Failed to open test side panel:', error);
                    sendResponse({ success: false, error: error.message });
                }
                return;
            }

            logError('Unknown message type', { type, source });
            sendResponse({ success: false, error: 'Unknown message type' });

        } catch (error) {
            logError('Error handling message', { message, error });
            sendResponse({ success: false, error: error.message });
        }
    })();
    
    return true; // Indicates async response
});

//================================================================//
//  МИНИМАЛЬНЫЙ ОБРАБОТЧИК КЛИКА ПО ИКОНКЕ РАСШИРЕНИЯ (ДИАГНОСТИКА + ЛОГИРОВАНИЕ)
//================================================================//

chrome.action.onClicked.addListener(async (tab) => {
    logInfo('ICON CLICKED', tab);
    if (tab.id) {
        try {
            await toggleSidebarDirectly(tab.id);
            logInfo('Side panel toggled for tab', tab.id);
        } catch (error) {
            logError('Failed to toggle side panel:', error);
        }
    } else {
        logError('No tab.id on icon click');
    }
});