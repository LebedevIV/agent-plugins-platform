/**
 * useToast
 * Хук для уведомлений (успех, ошибка, инфо, предупреждение)
 */
import { showErrorToast, showSuccessToast, showInfoToast, showWarningToast } from '../toast-notifications.js';

export function useToast() {
  return {
    error: showErrorToast,
    success: showSuccessToast,
    info: showInfoToast,
    warning: showWarningToast
  };
} 