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
//  ОБРАБОТЧИК КЛИКА ПО ИКОНКЕ РАСШИРЕНИЯ
//================================================================//

// Обработчик клика по иконке расширения - открывает боковую панель
chrome.action.onClicked.addListener(async (tab) => {
    try {
        logInfo('Клик по иконке расширения', { tabId: tab.id, url: tab.url });
        
        if (tab.id) {
            await toggleSidebarDirectly(tab.id);
            logInfo('Боковая панель переключена по клику иконки');
        }
    } catch (error) {
        logError('Ошибка при обработке клика по иконке', error);
    }
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