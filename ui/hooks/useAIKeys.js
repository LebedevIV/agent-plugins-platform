/**
 * useAIKeys
 * Хук для работы с API-ключами нейросетей (фиксированные и пользовательские)
 */
export const useAIKeys = {
  async getAllKeys() {
    const { aiKeys = {} } = await chrome.storage.sync.get('aiKeys');
    return aiKeys;
  },
  async setKey(keyName, value) {
    const keys = await this.getAllKeys();
    keys[keyName] = value;
    await chrome.storage.sync.set({ aiKeys: keys });
  },
  async removeKey(keyName) {
    const keys = await this.getAllKeys();
    delete keys[keyName];
    await chrome.storage.sync.set({ aiKeys: keys });
  }
}; 