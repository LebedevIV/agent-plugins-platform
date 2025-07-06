/**
 * src/hooks/useStateManager.ts
 * 
 * Хук для управления состоянием вкладок. Предоставляет централизованный
 * интерфейс для работы с состоянием чатов, плагинов и активностей.
 */

import { logInfo, logError } from '../utils/logging';

//================================================================//
//  ИНТЕРФЕЙСЫ И ТИПЫ
//================================================================//

export interface ChatMessage {
    id: string;
    type: 'user' | 'system' | 'plugin';
    content: string;
    timestamp: number;
    pluginName?: string;
}

export interface PluginChatState {
    chatHistory: ChatMessage[];
    currentInput: string;
}

export interface TabState {
    tabId: number;
    url: string;
    activePluginName: string | null;
    pluginChatStates: { [key: string]: PluginChatState };
    globalState: {
        runningPlugins: Set<string>;
    };
    lastActivity: number;
}

//================================================================//
//  УПРАВЛЕНИЕ СОСТОЯНИЕМ В ПАМЯТИ И STORAGE
//================================================================//

const tabStates = new Map<number, TabState>();

/**
 * Сохранение состояния вкладки в локальное хранилище
 */
async function saveTabStateToLocal(tabId: number, state: TabState): Promise<void> {
    try {
        const localKey = `tab_${tabId}`;
        const serializableState = {
            ...state,
            globalState: {
                runningPlugins: Array.from(state.globalState.runningPlugins)
            }
        };
        await chrome.storage.local.set({ [localKey]: serializableState });
        logInfo('Состояние вкладки сохранено в локальное хранилище', { tabId });
    } catch (error) {
        logError('Ошибка сохранения состояния вкладки', { tabId, error });
    }
}

/**
 * Загрузка состояния вкладки из локального хранилища
 */
async function loadTabStateFromLocal(tabId: number): Promise<TabState | null> {
    try {
        const localKey = `tab_${tabId}`;
        const result = await chrome.storage.local.get(localKey);
        if (result[localKey]) {
            const loaded = result[localKey];
            // Восстанавливаем Set из массива
            loaded.globalState.runningPlugins = new Set(loaded.globalState.runningPlugins);
            logInfo('Состояние вкладки загружено из локального хранилища', { tabId });
            return loaded;
        }
        return null;
    } catch (error) {
        logError('Ошибка загрузки состояния вкладки', { tabId, error });
        return null;
    }
}

/**
 * Удаление состояния вкладки из локального хранилища
 */
export async function removeTabStateFromLocal(tabId: number): Promise<void> {
    try {
        const localKey = `tab_${tabId}`;
        await chrome.storage.local.remove(localKey);
        logInfo('Состояние вкладки удалено из локального хранилища', { tabId });
    } catch (error) {
        logError('Ошибка удаления состояния вкладки', { tabId, error });
    }
}

/**
 * Отправка состояния в сайдпанель
 */
async function sendStateToSidePanel(tabId: number): Promise<void> {
    try {
        const state = await getOrCreateTabState(tabId);
        // Конвертируем Set в Array для отправки
        const serializableState = {
            ...state,
            globalState: {
                runningPlugins: Array.from(state.globalState.runningPlugins)
            }
        };
        await chrome.runtime.sendMessage({
            type: 'STATE_UPDATE',
            tabId,
            states: serializableState
        });
        logInfo('Состояние отправлено в сайдпанель', { tabId });
    } catch (error) {
        // Эта ошибка ожидаема, если сайдбар не открыт
        logInfo('Сайдпанель не открыта, состояние не отправлено', { tabId });
    }
}

//================================================================//
//  ОСНОВНЫЕ ФУНКЦИИ УПРАВЛЕНИЯ СОСТОЯНИЕМ
//================================================================//

/**
 * Получение всех состояний вкладок
 */
export function getAllTabStates(): Map<number, TabState> {
    return tabStates;
}

/**
 * Получение или создание состояния вкладки
 */
export async function getOrCreateTabState(tabId: number, url?: string): Promise<TabState> {
    if (tabStates.has(tabId)) {
        const state = tabStates.get(tabId)!;
        if (url) state.url = url;
        return state;
    }
    
    // Пытаемся загрузить из local storage
    const loadedState = await loadTabStateFromLocal(tabId);
    if (loadedState) {
        tabStates.set(tabId, loadedState);
        return loadedState;
    }

    // Создаем новое, если ничего не нашли
    const newState: TabState = {
        tabId,
        url: url || '',
        activePluginName: null,
        pluginChatStates: {},
        globalState: { runningPlugins: new Set() },
        lastActivity: Date.now()
    };
    tabStates.set(tabId, newState);
    logInfo('Создано новое состояние вкладки', { tabId, url });
    return newState;
}

/**
 * Установка состояния вкладки
 */
export async function setTabState(tabId: number, state: TabState): Promise<void> {
    tabStates.set(tabId, state); // Обновляем в памяти
    await saveTabStateToLocal(tabId, state); // Сохраняем в локальное хранилище
    await sendStateToSidePanel(tabId); // Отправляем в UI
    logInfo('Состояние вкладки обновлено', { tabId });
}

/**
 * Добавление сообщения в чат плагина
 */
export async function addChatMessage(
    tabId: number, 
    pluginName: string, 
    message: Omit<ChatMessage, 'id' | 'timestamp'>
): Promise<void> {
    const state = await getOrCreateTabState(tabId);
    
    if (!state.pluginChatStates[pluginName]) {
        state.pluginChatStates[pluginName] = { chatHistory: [], currentInput: '' };
    }
    
    const chatMessage: ChatMessage = {
        ...message,
        id: Date.now().toString(),
        timestamp: Date.now()
    };
    
    state.pluginChatStates[pluginName].chatHistory.push(chatMessage);
    state.lastActivity = Date.now();
    
    await setTabState(tabId, state);
    logInfo('Сообщение добавлено в чат', { tabId, pluginName, messageType: message.type });
}

/**
 * Обновление ввода в чате плагина
 */
export async function updateChatInput(tabId: number, pluginName: string, input: string): Promise<void> {
    const state = await getOrCreateTabState(tabId);
    
    if (!state.pluginChatStates[pluginName]) {
        state.pluginChatStates[pluginName] = { chatHistory: [], currentInput: '' };
    }
    
    state.pluginChatStates[pluginName].currentInput = input;
    state.lastActivity = Date.now();
    
    await setTabState(tabId, state);
    logInfo('Ввод в чате обновлен', { tabId, pluginName });
}

/**
 * Очистка чата плагина
 */
export async function clearChat(tabId: number, pluginName: string): Promise<void> {
    const state = await getOrCreateTabState(tabId);
    
    if (state.pluginChatStates[pluginName]) {
        state.pluginChatStates[pluginName].chatHistory = [];
        state.pluginChatStates[pluginName].currentInput = '';
        state.lastActivity = Date.now();
        
        await setTabState(tabId, state);
        logInfo('Чат очищен', { tabId, pluginName });
    }
}

/**
 * Установка активного плагина для вкладки
 */
export async function setActivePlugin(tabId: number, pluginName: string | null): Promise<void> {
    const state = await getOrCreateTabState(tabId);
    state.activePluginName = pluginName;
    state.lastActivity = Date.now();
    
    await setTabState(tabId, state);
    logInfo('Активный плагин установлен', { tabId, pluginName });
}

/**
 * Добавление запущенного плагина
 */
export async function addRunningPlugin(tabId: number, pluginName: string): Promise<void> {
    const state = await getOrCreateTabState(tabId);
    state.globalState.runningPlugins.add(pluginName);
    state.lastActivity = Date.now();
    
    await setTabState(tabId, state);
    logInfo('Плагин добавлен в запущенные', { tabId, pluginName });
}

/**
 * Удаление запущенного плагина
 */
export async function removeRunningPlugin(tabId: number, pluginName: string): Promise<void> {
    const state = await getOrCreateTabState(tabId);
    state.globalState.runningPlugins.delete(pluginName);
    state.lastActivity = Date.now();
    
    await setTabState(tabId, state);
    logInfo('Плагин удален из запущенных', { tabId, pluginName });
}

//================================================================//
//  ИНИЦИАЛИЗАЦИЯ И ОЧИСТКА
//================================================================//

/**
 * Инициализация менеджера состояний
 */
export function initializeStateManager(): void {
    // Удаляем состояние из памяти при закрытии вкладки
    chrome.tabs.onRemoved.addListener((tabId) => {
        tabStates.delete(tabId);
        removeTabStateFromLocal(tabId);
        logInfo('Вкладка закрыта, состояние очищено', { tabId });
    });
    
    logInfo('Менеджер состояний инициализирован');
} 