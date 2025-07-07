/**
 * src/hooks/usePluginManager.ts
 * 
 * Хук для управления плагинами. Предоставляет централизованный
 * интерфейс для всех операций с плагинами.
 */

import { sendMessageWithResponse, MessageResponse } from './useMessageHandler';
import { isValidPluginName, isValidTabId } from '../utils/validation';
import { logInfo, logError } from '../utils/logging';

export interface Plugin {
    name: string;
    description: string;
    version: string;
    id: string;
    enabled?: boolean;
    autoRun?: boolean;
    manifest?: {
        host_permissions?: string[];
        [key: string]: any;
    };
}

export interface PluginState {
    enabled: boolean;
    autoRun: boolean;
    [key: string]: any;
}

/**
 * Извлечение домена из паттерна разрешения
 */
function extractDomainFromPermission(permission: string): string | null {
    try {
        // Паттерн "*://*.example.com/*" -> "example.com"
        const match = permission.match(/\*:\/\/\*\.([^\/]+)\/\*/);
        if (match) {
            return match[1];
        }
        
        // Паттерн "*://example.com/*" -> "example.com"
        const match2 = permission.match(/\*:\/\/([^\/]+)\/\*/);
        if (match2) {
            return match2[1];
        }
        
        return null;
    } catch (error) {
        logError('Ошибка извлечения домена из разрешения', { permission, error });
        return null;
    }
}

/**
 * Получение списка совместимых сайтов из всех плагинов
 */
export function getCompatibleSites(): string[] {
    try {
        const sites = new Set<string>();
        
        // Добавляем тестовые домены для разработки и тестирования
        const testDomains = [
            'localhost',
            '127.0.0.1'
        ];
        testDomains.forEach(domain => sites.add(domain));
        
        // Здесь должна быть логика получения плагинов из background script
        // Пока используем статический список на основе известных плагинов
        const knownPlugins = [
            {
                manifest: {
                    host_permissions: [
                        "*://*.ozon.ru/*",
                        "http://localhost/*",
                        "http://127.0.0.1/*"
                    ]
                }
            },
            {
                manifest: {
                    host_permissions: [
                        "*://*.google.com/*", 
                        "*://*.google.ru/*",
                        "http://localhost/*",
                        "http://127.0.0.1/*"
                    ]
                }
            }
        ];
        
        knownPlugins.forEach(plugin => {
            if (plugin.manifest?.host_permissions) {
                plugin.manifest.host_permissions.forEach(permission => {
                    const domain = extractDomainFromPermission(permission);
                    if (domain) {
                        sites.add(domain);
                    }
                });
            }
        });
        
        const result = Array.from(sites);
        logInfo('Получен список совместимых сайтов', { sites: result });
        return result;
    } catch (error) {
        logError('Ошибка получения совместимых сайтов', error);
        return [];
    }
}

/**
 * Проверка совместимости сайта с плагинами
 */
export function isSiteCompatible(url: string): boolean {
    try {
        if (!url) return false;
        
        const currentDomain = new URL(url).hostname;
        const compatibleSites = getCompatibleSites();
        
        const isCompatible = compatibleSites.some(site => 
            currentDomain.includes(site) || site.includes(currentDomain)
        );
        
        logInfo('Проверка совместимости сайта', { 
            url, 
            currentDomain, 
            compatibleSites, 
            isCompatible 
        });
        
        return isCompatible;
    } catch (error) {
        logError('Ошибка проверки совместимости сайта', { url, error });
        return false;
    }
}

/**
 * Получение списка доступных плагинов
 */
export async function getAvailablePlugins(url?: string): Promise<Plugin[]> {
    try {
        logInfo('Получение списка плагинов', { url });
        const response = await sendMessageWithResponse({
            type: 'GET_PLUGINS',
            url
        });

        if (response.success && response.data) {
            return response.data;
        } else {
            logError('Ошибка получения плагинов', response.error);
            return [];
        }
    } catch (error) {
        logError('Исключение при получении плагинов', error);
        return [];
    }
}

/**
 * Запуск плагина
 */
export async function runPlugin(pluginName: string, tabId: number): Promise<MessageResponse> {
    if (!isValidPluginName(pluginName)) {
        return { success: false, error: 'Invalid plugin name' };
    }

    if (!isValidTabId(tabId)) {
        return { success: false, error: 'Invalid tab ID' };
    }

    try {
        logInfo('Запуск плагина', { pluginName, tabId });
        return await sendMessageWithResponse({
            type: 'RUN_PLUGIN',
            pluginName,
            tabId
        });
    } catch (error) {
        logError('Ошибка запуска плагина', { pluginName, tabId, error });
        return { success: false, error: (error as Error).message };
    }
}

/**
 * Прерывание плагина
 */
export async function interruptPlugin(pluginName: string): Promise<MessageResponse> {
    if (!isValidPluginName(pluginName)) {
        return { success: false, error: 'Invalid plugin name' };
    }

    try {
        logInfo('Прерывание плагина', { pluginName });
        return await sendMessageWithResponse({
            type: 'INTERRUPT_PLUGIN',
            pluginName
        });
    } catch (error) {
        logError('Ошибка прерывания плагина', { pluginName, error });
        return { success: false, error: (error as Error).message };
    }
}

/**
 * Обновление состояния плагина
 */
export async function updatePluginState(pluginId: string, updates: Partial<PluginState>): Promise<MessageResponse> {
    if (!isValidPluginName(pluginId)) {
        return { success: false, error: 'Invalid plugin ID' };
    }

    try {
        logInfo('Обновление состояния плагина', { pluginId, updates });
        return await sendMessageWithResponse({
            type: 'UPDATE_PLUGIN_STATE',
            pluginId,
            updates
        });
    } catch (error) {
        logError('Ошибка обновления состояния плагина', { pluginId, updates, error });
        return { success: false, error: (error as Error).message };
    }
}

/**
 * Получение состояния плагина
 */
export async function getPluginState(pluginId: string): Promise<PluginState | null> {
    if (!isValidPluginName(pluginId)) {
        return null;
    }

    try {
        const response = await sendMessageWithResponse({
            type: 'GET_PLUGIN_STATE',
            pluginId
        });

        if (response.success && response.data) {
            return response.data;
        } else {
            logError('Ошибка получения состояния плагина', response.error);
            return null;
        }
    } catch (error) {
        logError('Исключение при получении состояния плагина', { pluginId, error });
        return null;
    }
}

/**
 * Включение/выключение плагина
 */
export async function togglePlugin(pluginId: string, enabled: boolean): Promise<MessageResponse> {
    return await updatePluginState(pluginId, { enabled });
}

/**
 * Установка автозапуска плагина
 */
export async function setPluginAutoRun(pluginId: string, autoRun: boolean): Promise<MessageResponse> {
    return await updatePluginState(pluginId, { autoRun });
} 