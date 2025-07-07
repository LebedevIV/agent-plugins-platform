/**
 * src/hooks/usePluginHandler.ts
 * 
 * Хук для управления жизненным циклом плагинов. Предоставляет
 * централизованный интерфейс для работы с плагинами.
 */

import { 
    getOrCreateTabState, 
    setTabState, 
    addRunningPlugin, 
    removeRunningPlugin,
    addChatMessage,
    getAllTabStates,
    TabState
} from './useStateManager';
import { logInfo, logError } from '../utils/logging';

export interface Plugin {
    name: string;
    description: string;
    version: string;
    auto: boolean;
    host_permissions: string[];
}

/**
 * Получение списка доступных плагинов
 */
export async function getPluginsList(url?: string): Promise<Plugin[]> {
    try {
        // Статический список известных плагинов
        const knownPlugins: Plugin[] = [
            {
                name: 'ozon-analyzer',
                description: 'Анализатор товаров Ozon с проверкой соответствия описания и состава',
                version: '1.0.0',
                auto: false,
                host_permissions: ['*://*.ozon.ru/*']
            },
            {
                name: 'time-test',
                description: 'Тестовый плагин для проверки запросов времени',
                version: '1.0.0',
                auto: false,
                host_permissions: ['*://*.worldtimeapi.org/*']
            },
            {
                name: 'google-helper',
                description: 'Помощник для работы с Google сервисами',
                version: '1.0.0',
                auto: false,
                host_permissions: ['*://*.google.com/*', '*://*.google.ru/*']
            }
        ];

        // Фильтруем плагины по домену
        if (url) {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname;
            
            return knownPlugins.filter(plugin => {
                return plugin.host_permissions.some(permission => {
                    if (permission === '<all_urls>') return true;
                    
                    // Простая проверка домена
                    const permissionPattern = permission.replace('*://*.', '').replace('/*', '');
                    return hostname.includes(permissionPattern);
                });
            });
        }

        logInfo('Список плагинов получен', { url, count: knownPlugins.length });
        return knownPlugins;
    } catch (error) {
        logError('Ошибка получения списка плагинов', { url, error });
        return [];
    }
}

/**
 * Запуск плагина
 */
export async function runPluginCommand(pluginName: string, tabId?: number): Promise<any> {
    try {
        logInfo('Запуск плагина', { pluginName, tabId });
        
        if (tabId) {
            // Обновляем состояние вкладки
            const state = await getOrCreateTabState(tabId);
            await addRunningPlugin(tabId, pluginName);
            
            // Добавляем сообщение о запуске плагина
            const activePlugin = state.activePluginName;
            if (activePlugin) {
                await addChatMessage(tabId, activePlugin, {
                    type: 'system',
                    content: `Запущен плагин: ${pluginName}`
                });
            }
        }
        
        // Здесь будет интеграция с существующей системой плагинов
        // Пока возвращаем успех для тестирования
        return { success: true, message: `Плагин ${pluginName} запущен` };
    } catch (error) {
        logError('Ошибка запуска плагина', { pluginName, tabId, error });
        return { success: false, error: (error as Error).message };
    }
}

/**
 * Прерывание выполнения плагина
 */
export async function interruptPluginCommand(
    pluginName: string, 
    getAllTabStates: () => Map<number, TabState>
): Promise<any> {
    try {
        logInfo('Прерывание плагина', { pluginName });
        
        // Находим вкладку, на которой работает плагин
        for (const [tabId, state] of getAllTabStates().entries()) {
            if (state.globalState.runningPlugins.has(pluginName)) {
                // Удаляем плагин из активных
                await removeRunningPlugin(tabId, pluginName);
                
                // Добавляем сообщение о прерывании плагина
                const activePlugin = state.activePluginName;
                if (activePlugin) {
                    await addChatMessage(tabId, activePlugin, {
                        type: 'system',
                        content: `Плагин ${pluginName} прерван.`
                    });
                }
                
                break; // Прерываем цикл, так как нашли и обработали плагин
            }
        }
        
        // Здесь будет логика прерывания плагина
        // Пока возвращаем успех для тестирования
        return { success: true, message: `Плагин ${pluginName} прерван` };
    } catch (error) {
        logError('Ошибка прерывания плагина', { pluginName, error });
        return { success: false, error: (error as Error).message };
    }
}

/**
 * Проверка, запущен ли плагин на вкладке
 */
export async function isPluginRunning(tabId: number, pluginName: string): Promise<boolean> {
    try {
        const state = await getOrCreateTabState(tabId);
        return state.globalState.runningPlugins.has(pluginName);
    } catch (error) {
        logError('Ошибка проверки состояния плагина', { tabId, pluginName, error });
        return false;
    }
}

/**
 * Получение списка запущенных плагинов для вкладки
 */
export async function getRunningPlugins(tabId: number): Promise<string[]> {
    try {
        const state = await getOrCreateTabState(tabId);
        return Array.from(state.globalState.runningPlugins);
    } catch (error) {
        logError('Ошибка получения списка запущенных плагинов', { tabId, error });
        return [];
    }
}

/**
 * Получение активного плагина для вкладки
 */
export async function getActivePlugin(tabId: number): Promise<string | null> {
    try {
        const state = await getOrCreateTabState(tabId);
        return state.activePluginName;
    } catch (error) {
        logError('Ошибка получения активного плагина', { tabId, error });
        return null;
    }
} 