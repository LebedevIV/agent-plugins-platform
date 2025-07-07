/**
 * src/utils/validation.ts
 * 
 * Утилиты для валидации данных
 */

/**
 * Проверка, является ли значение строкой
 */
export function isString(value: any): value is string {
    return typeof value === 'string';
}

/**
 * Проверка, является ли значение числом
 */
export function isNumber(value: any): value is number {
    return typeof value === 'number' && !isNaN(value);
}

/**
 * Проверка, является ли значение объектом
 */
export function isObject(value: any): value is object {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Проверка, является ли значение массивом
 */
export function isArray(value: any): value is any[] {
    return Array.isArray(value);
}

/**
 * Проверка, является ли значение функцией
 */
export function isFunction(value: any): value is Function {
    return typeof value === 'function';
}

/**
 * Проверка, является ли строка валидным URL
 */
export function isValidUrl(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Проверка, является ли строка валидным email
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Проверка, является ли ID вкладки валидным
 */
export function isValidTabId(tabId: any): tabId is number {
    return isNumber(tabId) && tabId > 0;
}

/**
 * Проверка, является ли имя плагина валидным
 */
export function isValidPluginName(pluginName: any): pluginName is string {
    return isString(pluginName) && pluginName.length > 0 && /^[a-zA-Z0-9-_]+$/.test(pluginName);
}

/**
 * Проверка, является ли URL защищенным (chrome://, chrome-extension://)
 */
export function isProtectedUrl(url: string | undefined): boolean {
    return !!(url && (url.startsWith('chrome://') || url.startsWith('chrome-extension://')));
}

/**
 * Валидация объекта сообщения
 */
export function isValidMessage(message: any): boolean {
    return isObject(message) && isString((message as any).type);
}

/**
 * Валидация объекта состояния плагина
 */
export function isValidPluginState(state: any): boolean {
    return isObject(state) && 
           typeof (state as any).enabled === 'boolean' && 
           typeof (state as any).autoRun === 'boolean';
} 