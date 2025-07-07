/**
 * ui/toast-notifications.js
 * Система toast-уведомлений для платформы
 */

let toastContainer = null;
let activeToasts = [];

/**
 * Инициализация контейнера для уведомлений
 */
function initializeToastContainer() {
    if (toastContainer) return;
    
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
}

/**
 * Основная функция для показа уведомлений
 * @param {string} message - Текст сообщения
 * @param {string} type - Тип уведомления ('success', 'error', 'warning', 'info')
 * @param {number} duration - Время отображения в миллисекундах
 */
export function showToast(message, type = 'info', duration = 3000) {
    initializeToastContainer();
    
    // Ограничиваем количество одновременных уведомлений
    if (activeToasts.length >= 3) {
        const oldestToast = activeToasts.shift();
        if (oldestToast && oldestToast.element) {
            removeToast(oldestToast.element);
        }
    }
    
    const toastElement = createToastElement(message, type);
    const toast = { element: toastElement, timer: null };
    
    activeToasts.push(toast);
    toastContainer.appendChild(toastElement);
    
    // Анимация появления
    requestAnimationFrame(() => {
        toastElement.classList.add('toast-visible');
    });
    
    // Автоматическое исчезновение
    if (duration > 0) {
        toast.timer = setTimeout(() => {
            removeToast(toastElement);
        }, duration);
    }
    
    return toastElement;
}

/**
 * Создание элемента уведомления
 * @param {string} message - Текст сообщения
 * @param {string} type - Тип уведомления
 * @returns {HTMLElement} - DOM элемент уведомления
 */
function createToastElement(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const content = document.createElement('div');
    content.className = 'toast-content';
    
    const messageSpan = document.createElement('span');
    messageSpan.className = 'toast-message';
    messageSpan.textContent = message;
    
    const closeButton = document.createElement('button');
    closeButton.className = 'toast-close';
    closeButton.innerHTML = '×';
    closeButton.setAttribute('aria-label', 'Закрыть уведомление');
    
    // Обработчик закрытия
    closeButton.addEventListener('click', () => {
        removeToast(toast);
    });
    
    content.appendChild(messageSpan);
    content.appendChild(closeButton);
    toast.appendChild(content);
    
    return toast;
}

/**
 * Удаление уведомления
 * @param {HTMLElement} toastElement - Элемент уведомления
 */
function removeToast(toastElement) {
    if (!toastElement) return;
    
    // Удаляем из активного списка
    const index = activeToasts.findIndex(toast => toast.element === toastElement);
    if (index > -1) {
        const toast = activeToasts[index];
        if (toast.timer) {
            clearTimeout(toast.timer);
        }
        activeToasts.splice(index, 1);
    }
    
    // Анимация исчезновения
    toastElement.classList.remove('toast-visible');
    toastElement.classList.add('toast-hiding');
    
    setTimeout(() => {
        if (toastElement.parentNode) {
            toastElement.parentNode.removeChild(toastElement);
        }
    }, 300); // Время анимации исчезновения
}

/**
 * Удобные функции для разных типов уведомлений
 */
export function showSuccessToast(message, duration = 3000) {
    return showToast(message, 'success', duration);
}

export function showErrorToast(message, duration = 5000) {
    return showToast(message, 'error', duration);
}

export function showWarningToast(message, duration = 4000) {
    return showToast(message, 'warning', duration);
}

export function showInfoToast(message, duration = 3000) {
    return showToast(message, 'info', duration);
}

/**
 * Очистка всех уведомлений
 */
export function clearAllToasts() {
    activeToasts.forEach(toast => {
        if (toast.timer) {
            clearTimeout(toast.timer);
        }
    });
    activeToasts = [];
    
    if (toastContainer) {
        toastContainer.innerHTML = '';
    }
} 