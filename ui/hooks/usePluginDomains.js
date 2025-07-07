/**
 * usePluginDomains
 * Хук для извлечения и форматирования host_permissions из manifest.json
 */

export function usePluginDomains(manifest) {
  if (!manifest || !Array.isArray(manifest.host_permissions)) return [];
  return manifest.host_permissions;
} 