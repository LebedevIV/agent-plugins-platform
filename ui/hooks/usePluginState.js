/**
 * usePluginState
 * Хук для работы с состоянием плагина (enabled, autoRun) через chrome.storage
 */

export const usePluginState = {
  async getAllStates() {
    const { pluginStates = {} } = await chrome.storage.sync.get('pluginStates');
    return pluginStates;
  },
  async getState(pluginId) {
    const states = await this.getAllStates();
    return states[pluginId] || { enabled: true, autoRun: false };
  },
  async setState(pluginId, state) {
    const states = await this.getAllStates();
    states[pluginId] = state;
    await chrome.storage.sync.set({ pluginStates: states });
  },
  async updateState(pluginId, updates) {
    const currentState = await this.getState(pluginId);
    const newState = { ...currentState, ...updates };
    await this.setState(pluginId, newState);
  },
  onStateChanged(callback) {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'sync' && changes.pluginStates) {
        callback(changes.pluginStates.newValue);
      }
    });
  }
}; 