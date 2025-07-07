/**
 * useCustomKeyNames
 * Хук для работы с именами пользовательских AI-ключей через chrome.storage
 */
export const useCustomKeyNames = {
  async getAllNames() {
    const { customKeyNames = {} } = await chrome.storage.sync.get('customKeyNames');
    return customKeyNames;
  },
  async setName(keyId, name) {
    const names = await this.getAllNames();
    names[keyId] = name;
    await chrome.storage.sync.set({ customKeyNames: names });
  },
  async removeName(keyId) {
    const names = await this.getAllNames();
    delete names[keyId];
    await chrome.storage.sync.set({ customKeyNames: names });
  }
}; 