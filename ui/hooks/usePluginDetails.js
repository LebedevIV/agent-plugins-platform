/**
 * usePluginDetails
 * Хук-композитор: собирает полную информацию о плагине для UI
 */
import { usePluginManifest } from './usePluginManifest.js';
import { usePluginState } from './usePluginState.js';
import { usePluginDomains } from './usePluginDomains.js';

export async function usePluginDetails(pluginId) {
  const manifest = await usePluginManifest(pluginId);
  const state = await usePluginState.getState(pluginId);
  const domains = usePluginDomains(manifest);
  return { manifest, state, domains };
} 