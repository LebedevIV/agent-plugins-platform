/**
 * src/background.ts
 * 
 * Фоновый скрипт (Service Worker) нашего расширения.
 * Он является "мозгом" Host-API, обрабатывая запросы от UI,
 * выполняя привилегированные действия (например, доступ к вкладкам)
 * и управляя поведением иконки расширения.
 */

console.log("APP Background Script Loaded (v0.9.1 - Sidebar Chat System).");

//================================================================//
//  0. СИСТЕМА УПРАВЛЕНИЯ СОСТОЯНИЕМ ПО ВКЛАДКАМ
//================================================================//

// Типы для состояния вкладки
interface TabState {
    tabId: number;
    url: string;
    chatHistory: ChatMessage[];
    currentInput: string;
    activePlugins: Set<string>;
    lastActivity: number;
}

interface ChatMessage {
    id: string;
    type: 'user' | 'system' | 'plugin';
    content: string;
    timestamp: number;
    pluginName?: string;
}

// Хранилище состояния по вкладкам
const tabStates = new Map<number, TabState>();

/**
 * Получает или создает состояние для вкладки
 */
function getOrCreateTabState(tabId: number, url?: string): TabState {
    if (!tabStates.has(tabId)) {
        tabStates.set(tabId, {
            tabId,
            url: url || '',
            chatHistory: [],
            currentInput: '',
            activePlugins: new Set(),
            lastActivity: Date.now()
        });
    }
    return tabStates.get(tabId)!;
}

/**
 * Обновляет состояние вкладки и отправляет его в сайдбар
 */
async function setTabState(tabId: number, state: TabState): Promise<void> {
    tabStates.set(tabId, state);
    await sendStateToSidePanel(tabId);
}

/**
 * Отправляет состояние вкладки в сайдбар
 */
async function sendStateToSidePanel(tabId: number): Promise<void> {
    try {
        const state = getOrCreateTabState(tabId);
        console.log('[Background] Отправка состояния в сайдбар для вкладки:', tabId, state);
        
        // Отправляем сообщение в сайдпанел через chrome.runtime.sendMessage
        // Сайдпанел слушает эти сообщения и обновляется соответственно
        await chrome.runtime.sendMessage({
            type: 'STATE_UPDATE',
            tabId,
            state: {
                ...state,
                activePlugins: Array.from(state.activePlugins)
            }
        });
    } catch (error) {
        console.error('[Background] Ошибка отправки состояния в сайдбар:', error);
    }
}

/**
 * Обрабатывает сообщения от сайдбара
 */
async function handleSidebarMessage(message: any, sender: any): Promise<any> {
    const tabId = message.tabId;
    
    switch (message.type) {
        case 'UPDATE_INPUT':
            if (tabId) {
                const state = getOrCreateTabState(tabId);
                state.currentInput = message.input;
                state.lastActivity = Date.now();
                await setTabState(tabId, state);
            }
            break;
            
        case 'SEND_MESSAGE':
            if (tabId) {
                const state = getOrCreateTabState(tabId);
                const newMessage: ChatMessage = {
                    id: Date.now().toString(),
                    type: 'user',
                    content: message.content,
                    timestamp: Date.now()
                };
                state.chatHistory.push(newMessage);
                state.currentInput = '';
                state.lastActivity = Date.now();
                await setTabState(tabId, state);
            }
            break;
            
        case 'CLEAR_CHAT':
            if (tabId) {
                const state = getOrCreateTabState(tabId);
                state.chatHistory = [];
                state.lastActivity = Date.now();
                await setTabState(tabId, state);
            }
            break;
            
        case 'GET_STATE':
            if (tabId) {
                const state = getOrCreateTabState(tabId);
                return {
                    success: true,
                    state: {
                        ...state,
                        activePlugins: Array.from(state.activePlugins)
                    }
                };
            }
            break;
            
        case 'RUN_PLUGIN':
            if (tabId && message.pluginName) {
                console.log('[Background] Запуск плагина из сайдбара:', message.pluginName, 'для вкладки:', tabId);
                return await runPluginCommand(message.pluginName, tabId);
            }
            break;
            
        case 'INTERRUPT_PLUGIN':
            if (tabId && message.pluginName) {
                console.log('[Background] Прерывание плагина из сайдбара:', message.pluginName, 'для вкладки:', tabId);
                return await interruptPluginCommand(message.pluginName);
            }
            break;
    }
}

//================================================================//
//  1. РЕАЛИЗАЦИЯ HOST API
//================================================================//

// ================================================================ //
// Адаптивный Механизм Запросов v2.0
// ================================================================ //

/**
 * Извлекает хостнейм из строки URL.
 * @param url - Строка URL.
 * @returns Хостнейм или null, если URL некорректен.
 */
function getHostname(url: string): string | null {
    try {
        return new URL(url).hostname;
    } catch (e) {
        console.error("[Background] Некорректный URL:", url);
        return null;
    }
}

/**
 * Сохраняет данные об успешной попытке для данного хоста.
 * @param hostname - Хост, для которого сохраняется статистика.
 * @param attempt - Номер попытки (1-based), на которой запрос удался.
 */
async function saveSuccessfulAttempt(hostname: string, attempt: number): Promise<void> {
    try {
        const result = await chrome.storage.local.get("fetch_stats");
        const stats = result.fetch_stats || {};
        if (!stats[hostname]) {
            stats[hostname] = [];
        }
        
        const attemptData = {
            successful_attempt_number: attempt,
            success_timestamp: Math.floor(Date.now() / 1000)
        };

        stats[hostname].push(attemptData);
        // Опционально: можно ограничить размер массива, чтобы он не рос бесконечно
        // stats[hostname] = stats[hostname].slice(-100);
        await chrome.storage.local.set({ "fetch_stats": stats });
    } catch (e) {
        console.error("[Background] Не удалось сохранить статистику запросов:", e);
    }
}

/**
 * Проверяет, является ли объект валидной записью статистики.
 * Обеспечивает обратную совместимость и устойчивость к поврежденным данным.
 * @param statObject - Объект для проверки.
 * @returns true, если объект валиден, иначе false.
 */
function isValidStatObject(statObject: any): statObject is { successful_attempt_number: number, success_timestamp: number } {
    return (
        statObject &&
        typeof statObject === 'object' &&
        !Array.isArray(statObject) && // Убедимся, что это не массив
        typeof statObject.successful_attempt_number === 'number' &&
        typeof statObject.success_timestamp === 'number'
    );
}

/**
 * "Адаптивный Механизм Запросов v2.0"
 * Выполняет сетевые запросы с адаптивным количеством попыток и проверкой сети.
 * @param url - URL для запроса.
 * @param options - Опции для fetch.
 * @param initialDelay - Начальная задержка в мс.
 */
async function fetchWithRetry(url: string, options: RequestInit = {}, initialDelay = 500) {
    const hostname = getHostname(url);
    if (!hostname) {
        throw new Error("Некорректный URL для выполнения запроса.");
    }

    // 1. Адаптивный расчет количества попыток
    const statsData = await chrome.storage.local.get("fetch_stats");
    const hostStats: any[] = statsData.fetch_stats?.[hostname] || [];
    
    // Фильтруем статистику, чтобы отсеять невалидные или устаревшие записи.
    const validHostStats = hostStats.filter(isValidStatObject);

    const attemptNumbers = validHostStats.map(s => s.successful_attempt_number);
    const maxAttemptFromStats = attemptNumbers.length > 0 ? Math.max(...attemptNumbers) : 0;
    const retries = validHostStats.length > 0 ? Math.max(10, maxAttemptFromStats + 5) : 10;

    console.log(`[Background] Адаптивный fetch для ${hostname}. Попыток: ${retries}. Валидная статистика (номера попыток): [${attemptNumbers.join(', ')}]`);

    for (let i = 0; i < retries; i++) {
        const attemptNum = i + 1;
        try {
            console.log(`[Background] Попытка #${attemptNum}/${retries} для: ${url}`);
            const response = await fetch(url, options);

            // Ошибки уровня HTTP (4xx, 5xx) не считаются сетевыми сбоями, прекращаем попытки.
            if (!response.ok) {
                throw new Error(`HTTP ошибка! Статус: ${response.status}`);
            }

            // Успех! Сохраняем статистику и возвращаем результат.
            await saveSuccessfulAttempt(hostname, attemptNum);
            console.log(`[Background] Успех на попытке #${attemptNum} для ${hostname}.`);
            return await response.json();

        } catch (error: any) {
            console.warn(`[Background] Ошибка на попытке #${attemptNum}:`, error.message);

            // 2. Проверка сетевого подключения после 5 неудач
            if (attemptNum === 5) {
                console.log("[Background] 5 попыток не удалось. Проверяем сетевое подключение...");
                try {
                    await fetch("https://www.google.com", { method: 'HEAD', mode: 'no-cors' });
                    console.log("[Background] Тест сети пройден. Продолжаем попытки.");
                } catch (networkTestError) {
                    console.error("[Background] Тест сети провалился. Прерываем запрос.", networkTestError);
                    throw new Error("Проблема с сетевым подключением");
                }
            }

            // Если это последняя попытка, запускаем финальную логику.
            if (attemptNum === retries) {
                console.error(`[Background] Все ${retries} попыток для ${url} провалились. Запускаем финальную проверку.`);
                
                // Новая логика: проверяем сеть и, если она в порядке, даем совет от LLM.
                try {
                    // Проверяем, доступен ли интернет в принципе.
                    await fetch("https://www.google.com", { method: 'HEAD', mode: 'no-cors' });
                    
                    // Если тест сети прошел, значит, проблема на стороне сервера.
                    console.log("[Background] Сеть в порядке. Проблема, вероятно, на стороне сервера. Запрашиваем совет у LLM...");
                    
                    // Передаем только валидную статистику
                    const advice = await hostApiImpl.getPredictiveConnectionAdvice({ hostname, stats: validHostStats });
                    const enhancedError = new Error(
                        `Сервис '${hostname}' недоступен после ${retries} попыток. Рекомендация: ${advice}`
                    );
                    throw enhancedError;

                } catch (finalError: any) {
                    // Если мы сами сгенерировали ошибку с советом, перебрасываем ее.
                    if (finalError.message.includes("Рекомендация:")) {
                        throw finalError;
                    }
                    
                    // Если же провалился тест сети, значит, проблема у пользователя.
                    console.error("[Background] Финальный тест сети провалился. Проблема с локальным подключением.");
                    throw new Error(`Все ${retries} попыток провалились, и проверка сети не удалась. Проверьте ваше интернет-соединение.`);
                }
            }

            // Экспоненциальная задержка перед следующей попыткой
            const delay = initialDelay * Math.pow(2, i);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

/**
 * Чистая функция для анализа массива статистики соединений.
 * @param stats - Массив объектов статистики.
 * @returns Объект с анализом по часам и дням недели.
 */
const analyze = (stats: { successful_attempt_number: number, success_timestamp: number }[]) => {
    const hourlyAttempts = new Array(24).fill(0);
    const dailyAttempts = new Array(7).fill(0);

    stats.forEach(stat => {
        const date = new Date(stat.success_timestamp * 1000);
        const hour = date.getHours();
        const day = date.getDay(); // 0 = Sunday, 1 = Monday, ...

        hourlyAttempts[hour]++;
        dailyAttempts[day]++;
    });

    // Для простоты возвращаем общее количество успешных попыток по срезам.
    // В реальном приложении здесь могла бы быть более сложная логика для вычисления "среднего".
    return {
        bestHours: hourlyAttempts,
        bestDays: dailyAttempts,
    };
};


/**
 * Объект, содержащий логику для всех инструментов, доступных в Host-API.
 */
const hostApiImpl = {
  /**
   * (Имитация) Получает предиктивные рекомендации от LLM по поводу соединения.
   * @param hostname Имя хоста.
   * @param stats Собранная статистика по попыткам.
   */
  async getPredictiveConnectionAdvice({ hostname, stats }: { hostname: string, stats: any[] }): Promise<string> {
    console.log(`[Background] Запрос рекомендаций LLM для ${hostname}`);

    // 1. Формирование промпта для LLM
    const prompt = `
      Анализ стабильности соединения для хоста: ${hostname}.
      
      Вот история успешных подключений (в формате JSON):
      ${JSON.stringify(stats, null, 2)}

      Основываясь на этих данных, дай краткий (1-2 предложения) совет пользователю.
      Когда лучше всего пробовать подключиться? Есть ли какие-то паттерны?
      Например: "Лучшее время для подключения - рабочие часы, особенно после обеда. Избегайте подключения ранним утром."
      Ответ должен быть только текстом совета, без лишних фраз.
    `;

    console.log("[Background] Сформированный промпт для LLM:", prompt);

    // 2. Плейсхолдер для вызова LLM API
    // =======================================================================
    // TODO: ВСТАВИТЬ РЕАЛЬНЫЙ ВЫЗОВ LLM API (GEMINI FLASH) ЗДЕСЬ
    // Примерный код:
    // const apiKey = 'YOUR_GEMINI_API_KEY';
    // const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash:generateContent?key=${apiKey}`;
    // const response = await fetch(apiUrl, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    // });
    // const data = await response.json();
    // const advice = data.candidates[0].content.parts[0].text;
    // return advice;
    // =======================================================================
    
    // 3. Возвращаем моковый (заранее заготовленный) ответ
    const mockAdvice = "По нашим данным, соединение с этим сервисом наиболее стабильно в будние дни после полудня. Попробуйте повторить запрос в это время.";
    
    // Имитируем небольшую задержку, как при реальном API вызове
    await new Promise(resolve => setTimeout(resolve, 300));

    console.log("[Background] Моковый ответ от LLM:", mockAdvice);
    return mockAdvice;
  },

  /**
   * Анализирует статистику соединений для заданного хоста.
   * @param hostname Имя хоста для анализа.
   */
  async analyzeConnectionStats({ hostname }: { hostname: string }): Promise<any> {
    try {
      console.log(`[Background] Анализ статистики для: ${hostname}`);
      const result = await chrome.storage.local.get("fetch_stats");
      const stats: any[] = result.fetch_stats?.[hostname] || [];
      
      // Фильтруем статистику перед анализом
      const validStats = stats.filter(isValidStatObject);

      if (validStats.length === 0) {
        return { bestHours: new Array(24).fill(0), bestDays: new Array(7).fill(0), message: "Статистика отсутствует или невалидна." };
      }

      // Используем чистую функцию для анализа
      return analyze(validStats);

    } catch (e: any) {
      console.error(`[Background] Ошибка в analyzeConnectionStats:`, e);
      return { error: e.message };
    }
  },

  /**
   * Получает базовый контент (заголовок и весь текст) со страницы.
   * @param tabId ID вкладки для анализа.
   */
  async getActivePageContent(tabId: number): Promise<any> {
    try {
      console.log(`[Background] Выполняем getActivePageContent для вкладки ${tabId}...`);
      const results = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: () => ({
          title: document.title,
          content: document.body.innerText,
          html: document.documentElement.outerHTML,
          url: window.location.href
        }),
      });

      if (results && results[0]) {
        return results[0].result;
      }
      return { error: "Could not retrieve content." };
    } catch (e: any) {
      console.error(`[Background] Ошибка в getActivePageContent:`, e);
      return { error: e.message };
    }
  },

  /**
   * Находит элементы по CSS-селектору и извлекает их текст или атрибут.
   * @param tabId ID целевой вкладки.
   * @param options Опции парсинга.
   */
  async getElements(tabId: number, options: { selector: string; attribute: string }): Promise<any> {
    try {
      console.log(`[Background] Выполняем getElements для вкладки ${tabId} с селектором "${options.selector}"`);
      const results = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        args: [options],
        func: (opts) => {
          const elements = document.querySelectorAll(opts.selector);
          return Array.from(elements).map(el => {
            if (opts.attribute === 'textContent' || opts.attribute === 'innerText') {
              return (el as HTMLElement).textContent?.trim() || '';
            }
            if (opts.attribute === 'innerHTML') {
                return el.innerHTML;
            }
            return el.getAttribute(opts.attribute);
          });
        },
      });

      if (results && results[0]) {
        return results[0].result;
      }
      return [];
    } catch (e: any) {
      console.error(`[Background] Ошибка в getElements:`, e);
      return { error: e.message };
    }
  }
};

//================================================================//
//  2. УТИЛИТЫ ДЛЯ SIDEBAR
//================================================================//

/**
 * Получает список доступных плагинов для указанного URL
 */
async function getPluginsList(url?: string): Promise<any[]> {
  try {
    // Получаем список плагинов из папки public/plugins
    const plugins = [];
    
    // Для простоты пока возвращаем статический список
    // В будущем можно добавить динамическое сканирование папки
    const knownPlugins = [
      {
        name: 'ozon-analyzer',
        description: 'Анализатор товаров Ozon с проверкой соответствия описания и состава',
        version: '1.0.0',
        auto: false,
        host_permissions: ['*://*.ozon.ru/*']
      },
      {
        name: 'time-test',
        description: 'Тестовый плагин для проверки запросов времени',
        version: '1.0.0',
        auto: false,
        host_permissions: ['*://*.worldtimeapi.org/*']
      },
      {
        name: 'google-helper',
        description: 'Помощник для работы с Google сервисами',
        version: '1.0.0',
        auto: false,
        host_permissions: ['*://*.google.com/*', '*://*.google.ru/*']
      }
    ];

    // Фильтруем плагины по домену
    if (url) {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      
      return knownPlugins.filter(plugin => {
        return plugin.host_permissions.some(permission => {
          if (permission === '<all_urls>') return true;
          
          // Простая проверка домена (можно улучшить)
          const permissionPattern = permission.replace('*://*.', '').replace('/*', '');
          return hostname.includes(permissionPattern);
        });
      });
    }

    return knownPlugins;
  } catch (error) {
    console.error('[Background] Ошибка получения списка плагинов:', error);
    return [];
  }
}

/**
 * Запускает плагин
 */
async function runPluginCommand(pluginName: string, tabId?: number): Promise<any> {
  try {
    console.log(`[Background] Запуск плагина ${pluginName} для вкладки ${tabId}`);
    
    if (tabId) {
      // Обновляем состояние вкладки
      const state = getOrCreateTabState(tabId);
      state.activePlugins.add(pluginName);
      
      // Добавляем сообщение о запуске плагина
      const pluginMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'plugin',
        content: `Плагин ${pluginName} запущен`,
        timestamp: Date.now(),
        pluginName
      };
      state.chatHistory.push(pluginMessage);
      
      await setTabState(tabId, state);
    }
    
    // Здесь будет интеграция с существующей системой плагинов
    // Пока возвращаем успех для тестирования
    return { success: true, message: `Плагин ${pluginName} запущен` };
  } catch (error) {
    console.error(`[Background] Ошибка запуска плагина ${pluginName}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Прерывает выполнение плагина
 */
async function interruptPluginCommand(pluginName: string, sessionId?: string): Promise<any> {
  try {
    console.log(`[Background] Прерывание плагина ${pluginName}, сессия ${sessionId}`);
    
    // Находим вкладку, на которой работает плагин
    for (const [tabId, state] of tabStates.entries()) {
      if (state.activePlugins.has(pluginName)) {
        // Удаляем плагин из активных
        state.activePlugins.delete(pluginName);
        
        // Добавляем сообщение о прерывании плагина
        const pluginMessage: ChatMessage = {
          id: Date.now().toString(),
          type: 'plugin',
          content: `Плагин ${pluginName} прерван`,
          timestamp: Date.now(),
          pluginName
        };
        state.chatHistory.push(pluginMessage);
        
        await setTabState(tabId, state);
        break;
      }
    }
    
    // Здесь будет логика прерывания плагина
    // Пока возвращаем успех для тестирования
    return { success: true, message: `Плагин ${pluginName} прерван` };
  } catch (error) {
    console.error(`[Background] Ошибка прерывания плагина ${pluginName}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Переключает sidebar напрямую из background script
 */
async function toggleSidebarDirectly(tabId: number): Promise<void> {
  try {
    console.log(`[Background] Переключение sidebar напрямую для вкладки ${tabId}`);
    
    // Проверяем текущее состояние sidebar
    const sidePanelInfo = await chrome.sidePanel.getOptions({ tabId });
    console.log('[Background] Текущее состояние sidebar:', sidePanelInfo);
    
    if (sidePanelInfo.enabled) {
      // Если sidebar включен, пытаемся его открыть
      try {
        await chrome.sidePanel.open({ tabId: tabId });
        console.log('[Background] Sidebar открыт успешно');
      } catch (openError) {
        console.log('[Background] Не удалось открыть sidebar:', openError.message);
        // Если не удалось открыть, отключаем его
        await chrome.sidePanel.setOptions({
          tabId: tabId,
          enabled: false
        });
        console.log('[Background] Sidebar отключен');
      }
    } else {
      // Если sidebar отключен, включаем его
      const tab = await chrome.tabs.get(tabId);
      const sidebarUrl = `sidepanel.html?tabId=${tabId}&url=${encodeURIComponent(tab.url || '')}`;
      
      await chrome.sidePanel.setOptions({
        tabId: tabId,
        path: sidebarUrl,
        enabled: true
      });
      console.log('[Background] Sidebar включен с URL:', sidebarUrl);
      
      // Пытаемся открыть sidebar
      try {
        await chrome.sidePanel.open({ tabId: tabId });
        console.log('[Background] Sidebar открыт успешно');
      } catch (openError) {
        console.log('[Background] Не удалось открыть sidebar автоматически:', openError.message);
        console.log('[Background] Пользователь может открыть sidebar вручную через меню браузера');
      }
    }
  } catch (error) {
    console.error('[Background] Ошибка переключения sidebar:', error);
  }
}

//================================================================//
//  3. ГЛАВНЫЙ СЛУШАТЕЛЬ СООБЩЕНИЙ
//================================================================//

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Обработка сообщений от sidebar
  if (request.type === 'GET_PLUGINS') {
    (async () => {
      try {
        console.log('[Background] Запрос плагинов для URL:', request.url);
        const plugins = await getPluginsList(request.url);
        console.log('[Background] Найдено плагинов:', plugins.length, plugins);
        sendResponse({ success: true, plugins });
      } catch (error) {
        console.error('[Background] Ошибка получения списка плагинов:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  // Обработка сообщений управления состоянием от sidebar
  if (['UPDATE_INPUT', 'SEND_MESSAGE', 'CLEAR_CHAT', 'GET_STATE', 'RUN_PLUGIN', 'INTERRUPT_PLUGIN'].includes(request.type)) {
    (async () => {
      try {
        const result = await handleSidebarMessage(request, sender);
        sendResponse(result || { success: true });
      } catch (error) {
        console.error('[Background] Ошибка обработки сообщения sidebar:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  // Обработка запроса на получение текущего tabId
  if (request.type === 'GET_CURRENT_TAB_ID') {
    (async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        sendResponse({ success: true, tabId: tab.id });
      } catch (error) {
        console.error('[Background] Ошибка получения tabId:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  // Обработка запроса на переключение sidebar
  if (request.type === 'TOGGLE_SIDEBAR_REQUEST') {
    (async () => {
      try {
        const tabId = request.tabId;
        if (tabId) {
          // Проверяем, открыт ли sidebar
          const sidePanelInfo = await chrome.sidePanel.getOptions({ tabId });
          
          if (sidePanelInfo.enabled) {
            // Если sidebar включен, отключаем его
            await chrome.sidePanel.setOptions({
              tabId: tabId,
              enabled: false
            });
            console.log('[Background] Sidebar отключен для вкладки', tabId);
          } else {
            // Если sidebar отключен, включаем его
            const tab = await chrome.tabs.get(tabId);
            const sidebarUrl = `sidepanel.html?tabId=${tabId}&url=${encodeURIComponent(tab.url || '')}`;
            
            await chrome.sidePanel.setOptions({
              tabId: tabId,
              path: sidebarUrl,
              enabled: true
            });
            console.log('[Background] Sidebar включен для вкладки', tabId);
          }
        }
        sendResponse({ success: true });
      } catch (error) {
        console.error('[Background] Ошибка переключения sidebar:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  // Обработка сообщений от Host API
  if (request.source !== "app-host-api") return;

  const { command, data, targetTabId } = request;
  console.log(`[Background] Получена команда '${command}' для вкладки ${targetTabId || 'N/A'}.`);

  // Маршрутизация команд
  switch (command) {
    case "getActivePageContent":
      if (!targetTabId) {
        sendResponse({ error: "Target tab ID was not provided." });
        return false;
      }
      hostApiImpl.getActivePageContent(targetTabId).then(sendResponse);
      return true;

    case "getElements":
      if (!targetTabId) {
        sendResponse({ error: "Target tab ID was not provided." });
        return false;
      }
      hostApiImpl.getElements(targetTabId, data).then(sendResponse);
      return true;

      case "host_fetch":
        const url = data.url;
        console.log(`[Background] Получена задача на отказоустойчивый fetch для: ${url}`);
        
        // Оборачиваем вызов в try...catch, чтобы поймать ошибки до самого fetch
        (async () => {
            try {
                const jsonData = await fetchWithRetry(url);
                sendResponse({ error: false, data: jsonData });
            } catch (err: any) {
                console.error('[Background] КРИТИЧЕСКАЯ ОШИБКА в fetchWithRetry:', err);
                sendResponse({ error: true, error_message: err.message });
            }
        })();
        
        return true; // Асинхронный ответ

    case "analyzeConnectionStats":
      if (!data || !data.hostname) {
        sendResponse({ error: "Hostname was not provided." });
        return false;
      }
      hostApiImpl.analyzeConnectionStats(data).then(sendResponse);
      return true;

    case "run_plugin":
      if (!data || !data.pluginName) {
        sendResponse({ success: false, error: "Plugin name was not provided." });
        return false;
      }
      runPluginCommand(data.pluginName, sender.tab?.id).then(sendResponse);
      return true;

    case "interrupt_plugin":
      if (!data || !data.pluginName) {
        sendResponse({ success: false, error: "Plugin name was not provided." });
        return false;
      }
      interruptPluginCommand(data.pluginName, data.sessionId).then(sendResponse);
      return true;

    default:
      sendResponse({ error: `Unknown command: ${command}` });
      return false;
  }
});

//================================================================//
//  4. СОЗДАНИЕ КОНТЕКСТНОГО МЕНЮ
//================================================================//

chrome.runtime.onInstalled.addListener(async () => {
  // Создаем контекстное меню
  chrome.contextMenus.create({
    id: 'open-platform',
    title: 'Открыть панель управления APP',
    contexts: ['action']
  });

  // Настраиваем поведение sidebar
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    console.log('[Background] Sidebar поведение настроено: клик по иконке будет открывать sidebar');
  } catch (error) {
    console.error('[Background] Ошибка настройки поведения sidebar:', error);
  }
});

//================================================================//
//  5. ОБРАБОТЧИК КЛИКА ПО ИКОНКЕ РАСШИРЕНИЯ
//================================================================//

chrome.action.onClicked.addListener(async (tab) => {
  console.log('[Background] Клик по иконке расширения для вкладки:', tab.id, tab.url);
  
  // Переключаем sidebar для текущей вкладки
  if (tab.id) {
    try {
      // Создаем URL с параметрами вкладки
      const sidebarUrl = `sidepanel.html?tabId=${tab.id}&url=${encodeURIComponent(tab.url || '')}`;
      console.log('[Background] Создан URL sidebar:', sidebarUrl);
      
      // Устанавливаем опции sidebar для вкладки
      await chrome.sidePanel.setOptions({
        tabId: tab.id,
        path: sidebarUrl,
        enabled: true
      });
      
      console.log('[Background] Sidebar настроен для вкладки', tab.id);
      
      // Пытаемся открыть sidebar напрямую
      try {
        await chrome.sidePanel.open({ tabId: tab.id });
        console.log('[Background] Sidebar открыт успешно');
      } catch (openError) {
        console.log('[Background] Не удалось открыть sidebar:', openError.message);
        console.log('[Background] Пользователь может открыть sidebar вручную через меню браузера');
      }
      
    } catch (error) {
      console.log('[Background] Ошибка настройки sidebar:', error);
    }
  } else {
    console.log('[Background] Tab ID не найден');
  }
});

//================================================================//
//  6. ОБРАБОТЧИК СМЕНЫ ВКЛАДОК
//================================================================//

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  console.log('[Background] Активирована вкладка:', activeInfo.tabId);
  try {
    // Получаем информацию о вкладке
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url) {
      // Обновляем состояние вкладки с новым URL
      const state = getOrCreateTabState(activeInfo.tabId, tab.url);
      await sendStateToSidePanel(activeInfo.tabId);
    }
  } catch (error) {
    console.error('[Background] Ошибка обработки смены вкладки:', error);
  }
});

//================================================================//
//  6.1. ОБРАБОТЧИК ИЗМЕНЕНИЯ URL ВКЛАДКИ
//================================================================//

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url && tab.url) {
    console.log('[Background] Изменен URL вкладки:', tabId, 'новый URL:', changeInfo.url);
    try {
      // Обновляем состояние вкладки с новым URL
      const state = getOrCreateTabState(tabId, changeInfo.url);
      await sendStateToSidePanel(tabId);
    } catch (error) {
      console.error('[Background] Ошибка обработки изменения URL:', error);
    }
  }
});

//================================================================//
//  7. ОБРАБОТЧИК КОНТЕКСТНОГО МЕНЮ
//================================================================//

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'open-platform') {
  const platformPageUrl = chrome.runtime.getURL('index.html');
  chrome.tabs.query({ url: platformPageUrl }, (tabs) => {
    if (tabs.length > 0) {
      chrome.tabs.update(tabs[0].id!, { active: true });
      if (tabs[0].windowId) {
          chrome.windows.update(tabs[0].windowId, { focused: true });
      }
    } else {
      chrome.tabs.create({ url: platformPageUrl });
    }
  });
  }
});