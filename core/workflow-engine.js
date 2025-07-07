/**
 * core/workflow-engine.js
 * 
 * Движок для выполнения декларативных воркфлоу.
 */

import { runPythonTool } from '../bridge/mcp-bridge.js';
import { createRunLogger } from '../ui/log-manager.js';

export async function runWorkflow(pluginId) {
  // --- ▼▼▼ ИСПРАВЛЕНИЕ ПАРАМЕТРОВ ▼▼▼ ---
  const runId = `workflow-${pluginId}-${Date.now()}`;
  const title = `Воркфлоу плагина: ${pluginId}`;
  window.activeWorkflowLogger = createRunLogger(runId, title);
  const logger = window.activeWorkflowLogger;
  // --- ▲▲▲ КОНЕЦ ИСПРАВЛЕНИЯ ▲▲▲ ---

  logger.addMessage('ENGINE', `▶️ Запуск воркфлоу...`);
  
  document.querySelector('.tab-button[data-tab="logs"]')?.click();

  const workflow = await loadWorkflowDefinition(pluginId, logger);
  if (!workflow) return;

  // Получаем HTML страницы для передачи в плагины
  let pageHtml = '';
  try {
    if (window.hostApi && typeof window.hostApi.getActivePageContent === 'function') {
      const pageContent = await window.hostApi.getActivePageContent();
      pageHtml = pageContent.html || '';
      logger.addMessage('ENGINE', `📄 Получен HTML страницы (${pageHtml.length} символов)`);
    }
  } catch (error) {
    logger.addMessage('WARNING', `⚠️ Не удалось получить HTML страницы: ${error.message}`);
  }

  const context = { 
    steps: {}, 
    logger: logger,
    page_html: pageHtml
  };

  for (const step of workflow.steps) {
    logger.addMessage('ENGINE', `➡️ Выполнение шага: ${step.id} (инструмент: ${step.tool})`);
    try {
      const toolInput = resolveInputs(step.input, context);
      let output;
      const [toolType, toolName] = step.tool.split('.');

      if (toolType === 'host') {
        if (window.hostApi && typeof window.hostApi[toolName] === 'function') {
          output = await window.hostApi[toolName](toolInput, context);
        } else {
          throw new Error(`Host tool "${toolName}" не найден.`);
        }
      } else if (toolType === 'python') {
        output = await runPythonTool(pluginId, toolName, toolInput);
      } else {
        throw new Error(`Неизвестный тип инструмента: ${step.tool}`);
      }
      context.steps[step.id] = { output };
      logger.addMessage('ENGINE', `✅ Шаг ${step.id} выполнен.`);
    } catch (error) {
      logger.addMessage('ERROR', `❌ Ошибка на шаге ${step.id}: ${error.message}`);
      console.error(`[WorkflowEngine] Детали ошибки:`, error);
      return;
    }
  }

  // Отображаем финальный результат с обработкой ошибок
  try {
    const lastStep = workflow.steps[workflow.steps.length - 1];
    if (lastStep && context.steps[lastStep.id]) {
      const finalResult = context.steps[lastStep.id].output;
      // Пытаемся отрендерить структурированный результат
      logger.renderResult(lastStep.id, finalResult);
    }
  } catch (error) {
    console.error('Ошибка при рендеринге результата:', error);
    // В случае сбоя, показываем сырой результат как простое сообщение
    const lastStep = workflow.steps[workflow.steps.length - 1];
    const rawResult = context.steps[lastStep.id]?.output;
    logger.addMessage('ENGINE', `Не удалось отобразить результат. Сырые данные: ${JSON.stringify(rawResult)}`, 'error');
  }

  logger.addMessage('ENGINE', `🏁 Воркфлоу успешно завершен.`);
}

// ... вспомогательные функции, но с исправленными путями ...
async function loadWorkflowDefinition(pluginId, logger) {
    try {
        const response = await fetch(`plugins/${pluginId}/workflow.json`); // Убран /public
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        logger.addMessage('ERROR', `Не удалось загрузить workflow.json: ${error.message}`);
        return null;
    }
}

function resolveInputs(input, context) {
  if (!input) return {};
  const resolvedInput = {};
  for (const key in input) {
    const value = input[key];
    if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
      const path = value.substring(2, value.length - 2).trim();
      resolvedInput[key] = getContextValue(path, context);
    } else {
      resolvedInput[key] = value;
    }
  }
  return resolvedInput;
}

function getContextValue(path, context) {
  return path.split('.').reduce((acc, part) => {
    return acc && acc[part] !== undefined ? acc[part] : null;
  }, context);
}