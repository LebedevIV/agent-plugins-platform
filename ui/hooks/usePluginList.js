/**
 * usePluginList
 * Хук для загрузки и кэширования списка доступных плагинов
 */

export async function usePluginList() {
  // TODO: заменить на реальную загрузку из plugin-manager, если появится API
  // Сейчас — статический список для совместимости
  return [
    { name: 'ozon-analyzer', description: 'Анализатор товаров Ozon', version: '1.0.0', id: 'ozon-analyzer' },
    { name: 'time-test', description: 'Тестовый плагин для проверки времени', version: '1.0.0', id: 'time-test' },
    { name: 'google-helper', description: 'Помощник для Google', version: '1.0.0', id: 'google-helper' }
  ];
} 