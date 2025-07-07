/**
 * src/background.ts
 * 
 * Фоновый скрипт (Service Worker) нашего расширения.
 * Использует hooks-архитектуру для организации кода.
 */

import { 
    initializeBackgroundScript, 
    handleUIMessage, 
    handleHostApiMessage,
    toggleSidebarDirectly
} from './hooks';
import { logInfo, logError } from './utils/logging';

console.log("APP Background Script Loaded (v0.9.3 - Полная hooks-архитектура).");

//================================================================//
//  ИНИЦИАЛИЗАЦИЯ BACKGROUND SCRIPT
//================================================================//

// Инициализируем background script с hooks-архитектурой
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

            // Обработка PING сообщений
            if (type === 'PING') {
                sendResponse({ success: true, pong: true });
                return;
            }

            // Обработка сообщений от UI через hooks
            if (type && !source) {
                const response = await handleUIMessage(message, sender);
                sendResponse(response);
                return;
            }

            // Обработка сообщений от Host-API через hooks
            if (source === 'app-host-api') {
                const response = await handleHostApiMessage(message, sender);
                sendResponse(response);
                return;
            }

            // Обработка специальных сообщений (тестирование)
            if (type === '_TEST_OPEN_SIDE_PANEL' && sender.tab?.id) {
                await toggleSidebarDirectly(sender.tab.id);
                sendResponse({ success: true });
                return;
            }

            // Неизвестные сообщения
            logError('Неизвестный тип сообщения', { type, source });
            sendResponse({ success: false, error: 'Unknown message type' });

        } catch (error) {
            logError('Ошибка обработки сообщения', { message, error });
            sendResponse({ success: false, error: (error as Error).message });
        }
    })();
    
    return true; // Указываем, что ответ будет асинхронным
});