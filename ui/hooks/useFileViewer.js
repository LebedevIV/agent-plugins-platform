/**
 * useFileViewer
 * Хук для просмотра файлов плагина (manifest, workflow, mcp_server.py)
 */
export async function useFileViewer(pluginId, fileName) {
  try {
    const resp = await fetch(`plugins/${pluginId}/${fileName}`);
    if (!resp.ok) throw new Error('Не удалось загрузить файл ' + fileName);
    const text = await resp.text();
    return text;
  } catch (e) {
    throw e;
  }
} 