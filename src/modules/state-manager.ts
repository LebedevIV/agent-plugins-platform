/**
 * src/modules/state-manager.ts
 * 
 * Этот модуль является центральным хранилищем и менеджером состояний
 * для каждой отдельной вкладки. Он отвечает за создание, обновление,
 * сохранение и загрузку состояния, включая историю чатов,
 * запущенные плагины и т.д.
 */

//================================================================//
//  1. ИНТЕРФЕЙСЫ И ТИПЫ
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
//  2. УПРАВЛЕНИЕ СОСТОЯНИЕМ В ПАМЯТИ И STORAGE
//================================================================//

const tabStates = new Map<number, TabState>();

// --- Функции для работы с chrome.storage.local (для чатов и сессий) ---

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
    } catch (error) {
        console.error(`[StateManager] Ошибка сохранения состояния для вкладки ${tabId}`, error);
    }
}

async function loadTabStateFromLocal(tabId: number): Promise<TabState | null> {
    try {
        const localKey = `tab_${tabId}`;
        const result = await chrome.storage.local.get(localKey);
        if (result[localKey]) {
            const loaded = result[localKey];
            // Восстанавливаем Set из массива
            loaded.globalState.runningPlugins = new Set(loaded.globalState.runningPlugins);
            return loaded;
        }
        return null;
    } catch (error) {
        console.error(`[StateManager] Ошибка загрузки состояния для вкладки ${tabId}`, error);
        return null;
    }
}

export async function removeTabStateFromLocal(tabId: number): Promise<void> {
    try {
        const localKey = `tab_${tabId}`;
        await chrome.storage.local.remove(localKey);
        console.log(`[StateManager] Состояние для закрытой вкладки ${tabId} удалено.`);
    } catch (error)
        {
        console.error(`[StateManager] Ошибка удаления состояния для вкладки ${tabId}`, error);
    }
}

// Удаляем состояние из памяти при закрытии вкладки
chrome.tabs.onRemoved.addListener((tabId) => {
    tabStates.delete(tabId);
    removeTabStateFromLocal(tabId);
});


// --- Основные функции управления состоянием ---

/**
 * Возвращает Map со всеми текущими состояниями вкладок.
 * Это нужно для операций, которым требуется перебрать все состояния,
 * например, для поиска запущенного плагина.
 */
export function getAllTabStates(): Map<number, TabState> {
    return tabStates;
}

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
    return newState;
}

export async function setTabState(tabId: number, state: TabState): Promise<void> {
    tabStates.set(tabId, state); // Обновляем в памяти
    await saveTabStateToLocal(tabId, state); // Сохраняем в локальное хранилище
    await sendStateToSidePanel(tabId); // Отправляем в UI
}

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
            states: serializableState // Отправляем весь объект состояний
        });
    } catch (error) {
        // Эта ошибка ожидаема, если сайдбар не открыт. Не засоряем консоль.
        // console.error('[StateManager] Ошибка отправки состояния в сайдбар:', error);
    }
} 