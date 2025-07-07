/**
 * useErrorHandler
 * Хук для централизованной обработки ошибок и уведомлений
 */
import { showErrorToast, showSuccessToast, showInfoToast, showWarningToast } from '../toast-notifications.js';

export function useErrorHandler() {
  return {
    error: (msg) => showErrorToast(msg),
    success: (msg) => showSuccessToast(msg),
    info: (msg) => showInfoToast(msg),
    warning: (msg) => showWarningToast(msg)
  };
} 