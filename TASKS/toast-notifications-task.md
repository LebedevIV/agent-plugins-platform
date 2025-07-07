# Задание для Оркестратора: Система Toast-уведомлений

## Контекст
Мы улучшаем UX платформы Agent-Plugins-Platform. Первый этап (индикаторы загрузки Pyodide, кнопка очистки лога) успешно завершен. Теперь нужно добавить систему toast-уведомлений для информирования пользователя о статусе операций.

## Задача
Создать систему уведомлений, которая будет показывать краткие сообщения о статусе операций в правом верхнем углу экрана.

## Файлы для работы

### 1. Создать `ui/toast-notifications.js`
```javascript
// Основные функции
export function showToast(message, type = 'info', duration = 3000)
export function showSuccessToast(message, duration = 3000)
export function showErrorToast(message, duration = 5000)
export function showWarningToast(message, duration = 4000)
export function showInfoToast(message, duration = 3000)
```

**Требования:**
- Типы: 'success', 'error', 'warning', 'info'
- Автоисчезновение через duration мс
- Ручное закрытие (крестик)
- Максимум 3 уведомления одновременно
- Плавные анимации

### 2. Добавить стили в `style.css`
```css
.toast-container { /* контейнер для всех уведомлений */ }
.toast { /* базовые стили уведомления */ }
.toast-success { color: #98c379; }
.toast-error { color: #ff3860; }
.toast-warning { color: #ffa726; }
.toast-info { color: #0099ff; }
@keyframes toastSlideIn { /* анимация появления */ }
@keyframes toastSlideOut { /* анимация исчезновения */ }
```

### 3. Интегрировать в `ui/test-harness.js`
```javascript
import { showSuccessToast, showErrorToast, showInfoToast } from './toast-notifications.js';

// Показывать уведомления при:
// - Успешном запуске плагина
// - Ошибках выполнения  
// - Завершении воркфлоу
// - Загрузке Pyodide
```

## Критерии качества
- ✅ Плавные анимации (0.3s ease-in-out)
- ✅ Не перекрывают основной контент
- ✅ Адаптивный дизайн
- ✅ Обработка ошибок
- ✅ Совместимость с существующим кодом

## Примеры использования
```javascript
showSuccessToast('Плагин выполнен успешно!');
showErrorToast('Ошибка загрузки плагина');
showInfoToast('Загрузка Python среды...');
```

## Архитектурные принципы
- Следуй принципам из Memory Bank
- Используй модульную архитектуру
- Сохраняй совместимость с существующим кодом
- Придерживайся стиля кодирования проекта

**Приступай к реализации!** 🚀 