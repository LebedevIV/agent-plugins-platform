/**
 * src/modules/plugin-handler.ts
 * 
 * Этот модуль управляет жизненным циклом плагинов:
 * - Получение списка доступных плагинов для URL
 * - Запуск выполнения плагина
 * - Прерывание выполнения плагина
 */

import { getOrCreateTabState, setTabState, TabState } from './state-manager';

/**
 * Получает список доступных плагинов для указанного URL
 */
export async function getPluginsList(url?: string): Promise<any[]> {
  try {
    // Получаем список плагинов из папки public/plugins
    const plugins = [];
    
    // Для простоты пока возвращаем статический список
    // В будущем можно добавить динамическое сканирование папки
    const knownPlugins = [
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
          
          // Простая проверка домена (можно улучшить)
          const permissionPattern = permission.replace('*://*.', '').replace('/*', '');
          return hostname.includes(permissionPattern);
        });
      });
    }

    return knownPlugins;
  } catch (error) {
    console.error('[PluginHandler] Ошибка получения списка плагинов:', error);
    return [];
  }
}

/**
 * Запускает плагин
 */
export async function runPluginCommand(pluginName: string, tabId?: number): Promise<any> {
  try {
    console.log(`[PluginHandler] Запуск плагина ${pluginName} для вкладки ${tabId}`);
    
    if (tabId) {
      // Обновляем состояние вкладки
      const state = await getOrCreateTabState(tabId);
      state.globalState.runningPlugins.add(pluginName);
      
      // Добавляем сообщение о запуске плагина
      const activePlugin = state.activePluginName;
      if (activePlugin && state.pluginChatStates[activePlugin]) {
           state.pluginChatStates[activePlugin].chatHistory.push({
        id: Date.now().toString(),
              type: 'system',
              content: `Запущен плагин: ${pluginName}`,
              timestamp: Date.now()
          });
      }
      
      await setTabState(tabId, state);
    }
    
    // Здесь будет интеграция с существующей системой плагинов
    // Пока возвращаем успех для тестирования
    return { success: true, message: `Плагин ${pluginName} запущен` };
  } catch (error) {
    console.error(`[PluginHandler] Ошибка запуска плагина ${pluginName}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Прерывает выполнение плагина
 */
export async function interruptPluginCommand(
    pluginName: string, 
    getAllTabStates: () => Map<number, TabState>
): Promise<any> {
  try {
    console.log(`[PluginHandler] Прерывание плагина ${pluginName}`);
    
    // Находим вкладку, на которой работает плагин, используя переданную функцию
    for (const [tabId, state] of getAllTabStates().entries()) {
     if (state.globalState.runningPlugins.has(pluginName)) {
        // Удаляем плагин из активных
        state.globalState.runningPlugins.delete(pluginName);
        
        // Добавляем сообщение о прерывании плагина
        const activePlugin = state.activePluginName;
        if (activePlugin && state.pluginChatStates[activePlugin]) {
              state.pluginChatStates[activePlugin].chatHistory.push({
          id: Date.now().toString(),
                  type: 'system',
                  content: `Плагин ${pluginName} прерван.`,
                  timestamp: Date.now()
              });
          }
        
        await setTabState(tabId, state);
        break; // Прерываем цикл, так как нашли и обработали плагин
      }
    }
    
    // Здесь будет логика прерывания плагина
    // Пока возвращаем успех для тестирования
    return { success: true, message: `Плагин ${pluginName} прерван` };
  } catch (error) {
    console.error(`[PluginHandler] Ошибка прерывания плагина ${pluginName}:`, error);
    return { success: false, error: error.message };
  }
} 