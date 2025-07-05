import { createJsonViewer } from './json-viewer.js';
import { showInfoToast, showSuccessToast, showErrorToast } from './toast-notifications.js';

const logContainer = document.getElementById('chat-log');
if (logContainer) logContainer.innerHTML = ''; // Очищаем при старте

export function createRunLogger(runId, title) {
    if (!logContainer) {
        return {
            addMessage: (stepId, message, type = 'info') => console.log(`[Logger Stub][${runId}/${stepId}] ${message}`),
            renderResult: (stepId, resultObject) => console.log(`[Logger Stub][${runId}/${stepId}]`, resultObject)
        };
    }
    const runContainer = document.createElement('div');
    runContainer.className = 'log-run-container';
    runContainer.dataset.runId = runId;

    const header = document.createElement('div');
    header.className = 'log-run-header';
    header.textContent = `▶️ ${title} (запущен в ${new Date().toLocaleTimeString()})`;

    const body = document.createElement('div');
    body.className = 'log-run-body';

    runContainer.append(header, body);
    logContainer.prepend(runContainer);

    return {
        addMessage: (stepId, message, type = 'info') => {
            const messageElement = document.createElement('div');
            messageElement.className = `log-message log-type-${type}`;
            messageElement.dataset.stepId = stepId;

            const contentSpan = document.createElement('span');
            contentSpan.className = 'log-content';
            contentSpan.textContent = message;

            messageElement.append(contentSpan);
            body.appendChild(messageElement);
            logContainer.scrollTop = logContainer.scrollHeight;
            
            // Показываем toast-уведомления для важных событий
            if (stepId === 'PYODIDE') {
                if (type === 'success') {
                    showSuccessToast('Python среда готова');
                } else if (type === 'error') {
                    showErrorToast('Ошибка загрузки Python');
                } else if (message.includes('Загрузка')) {
                    showInfoToast('Загрузка Python среды...');
                }
            }
        },
        renderResult: (stepId, resultObject) => {
            const logRunBody = document.querySelector(`.log-run-container[data-run-id="${runId}"] .log-run-body`);
            if (!logRunBody) return;

            const resultContainer = document.createElement('div');
            resultContainer.className = 'log-result-container';
            resultContainer.dataset.viewMode = 'viewer'; // 'viewer' | 'raw'

            const resultHeader = document.createElement('div');
            resultHeader.className = 'log-result-header';
            
            const headerTitle = document.createElement('span');
            headerTitle.textContent = '▶ Итоговый результат';
            
            const controls = document.createElement('div');
            controls.className = 'log-result-controls';

            const switchButton = document.createElement('button');
            switchButton.className = 'log-result-mode-switch';
            switchButton.textContent = 'Вид: Красивый';
            
            controls.appendChild(switchButton);
            resultHeader.append(headerTitle, controls);

            const resultBody = document.createElement('div');
            resultBody.className = 'log-result-body';
            resultBody.style.display = 'none'; // Скрыто по умолчанию

            // Изначально создаем красивый вид
            createJsonViewer(resultObject, resultBody);

            // Логика переключения
            switchButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Не триггерить сворачивание
                const currentMode = resultContainer.dataset.viewMode;
                const newMode = currentMode === 'viewer' ? 'raw' : 'viewer';
                resultContainer.dataset.viewMode = newMode;
                
                resultBody.innerHTML = ''; // Очищаем
                if (newMode === 'viewer') {
                    switchButton.textContent = 'Вид: Красивый';
                    createJsonViewer(resultObject, resultBody);
                } else {
                    switchButton.textContent = 'Вид: Сырой';
                    const pre = document.createElement('pre');
                    pre.textContent = JSON.stringify(resultObject, null, 2);
                    resultBody.appendChild(pre);
                }
            });

            // Логика сворачивания
            resultHeader.addEventListener('click', () => {
                const isHidden = resultBody.style.display === 'none';
                resultBody.style.display = isHidden ? 'block' : 'none';
                headerTitle.textContent = (isHidden ? '▼' : '▶') + ' Итоговый результат';
            });

            resultContainer.append(resultHeader, resultBody);
            logRunBody.appendChild(resultContainer);
            logContainer.scrollTop = logContainer.scrollHeight;
        }
    };
}