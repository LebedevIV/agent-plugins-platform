/**
 * src/modules/plugin-settings.ts
 * 
 * Этот модуль отвечает за управление глобальными настройками плагинов,
 * такими как "включен/выключен" и "автозапуск".
 * Эти настройки хранятся в `chrome.storage.sync` и синхронизируются
 * между устройствами.
 */

export async function getAllPluginStates() {
    const { pluginStates = {} } = await chrome.storage.sync.get('pluginStates');
    return pluginStates;
}

export async function getPluginState(pluginId: string) {
    const states = await getAllPluginStates();
    return states[pluginId] || { enabled: true, autoRun: false };
}

export async function setPluginState(pluginId: string, state: { enabled: boolean, autoRun: boolean }) {
    const states = await getAllPluginStates();
    states[pluginId] = state;
    await chrome.storage.sync.set({ pluginStates: states });
}

export async function updatePluginState(pluginId: string, updates: Partial<{ enabled: boolean, autoRun: boolean }>) {
    const currentState = await getPluginState(pluginId);
    const newState = { ...currentState, ...updates };
    await setPluginState(pluginId, newState);
}

export function onPluginStateChanged(callback: (newStates: any) => void) {
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync' && changes.pluginStates) {
            callback(changes.pluginStates.newValue);
        }
    });
} 