/**
 * useTabNavigation
 * Хук для управления вкладками (плагины/настройки)
 */
export function useTabNavigation() {
  function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(tabName).classList.remove('hidden');
  }
  return { switchTab };
} 