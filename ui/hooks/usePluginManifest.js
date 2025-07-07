/**
 * usePluginManifest
 * Хук для загрузки и валидации manifest.json для плагина
 */

export async function usePluginManifest(pluginId) {
  try {
    const resp = await fetch(`plugins/${pluginId}/manifest.json`);
    if (!resp.ok) throw new Error('Не удалось загрузить manifest.json');
    const manifest = await resp.json();
    // Валидация структуры
    if (!manifest.name || !manifest.version) throw new Error('Некорректный manifest.json');
    return manifest;
  } catch (e) {
    throw e;
  }
} 