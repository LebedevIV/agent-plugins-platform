/**
 * src/modules/host-api-impl.ts
 * 
 * Реализация Host API. Этот модуль содержит функции, которые
 * могут быть вызваны из Python-плагинов. Он обеспечивает
 * контролируемый и безопасный доступ к API браузера и другим
 * внутренним функциям расширения.
 */

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
        console.error("[HostAPI] Некорректный URL:", url);
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
        console.error("[HostAPI] Не удалось сохранить статистику запросов:", e);
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

    return {
        bestHours: hourlyAttempts,
        bestDays: dailyAttempts,
    };
};

/**
 * Объект, содержащий логику для всех инструментов, доступных в Host-API.
 */
export const hostApiImpl = {
  /**
   * "Адаптивный Механизм Запросов v2.0"
   * Выполняет сетевые запросы с адаптивным количеством попыток и проверкой сети.
   * @param url - URL для запроса.
   * @param options - Опции для fetch.
   * @param initialDelay - Начальная задержка в мс.
   */
    async fetchWithRetry(url: string, options: RequestInit = {}, initialDelay = 500) {
        const hostname = getHostname(url);
        if (!hostname) {
            throw new Error("Некорректный URL для выполнения запроса.");
        }

        // 1. Адаптивный расчет количества попыток
        const statsData = await chrome.storage.local.get("fetch_stats");
        const hostStats: any[] = statsData.fetch_stats?.[hostname] || [];
        
        const validHostStats = hostStats.filter(isValidStatObject);

        const attemptNumbers = validHostStats.map(s => s.successful_attempt_number);
        const maxAttemptFromStats = attemptNumbers.length > 0 ? Math.max(...attemptNumbers) : 0;
        const retries = validHostStats.length > 0 ? Math.max(10, maxAttemptFromStats + 5) : 10;

        for (let i = 0; i < retries; i++) {
            const attemptNum = i + 1;
            try {
                const response = await fetch(url, options);

                if (!response.ok) {
                    throw new Error(`HTTP ошибка! Статус: ${response.status}`);
                }

                await saveSuccessfulAttempt(hostname, attemptNum);
                return await response.json();

            } catch (error: any) {
                if (attemptNum === 5) {
                    try {
                        await fetch("https://www.google.com", { method: 'HEAD', mode: 'no-cors' });
                    } catch (networkTestError) {
                        throw new Error("Проблема с сетевым подключением");
                    }
                }

                if (attemptNum === retries) {
                    try {
                        await fetch("https://www.google.com", { method: 'HEAD', mode: 'no-cors' });
                        const advice = await this.getPredictiveConnectionAdvice({ hostname, stats: validHostStats });
                        throw new Error(`Сервис '${hostname}' недоступен после ${retries} попыток. Рекомендация: ${advice}`);
                    } catch (finalError: any) {
                        if (finalError.message.includes("Рекомендация:")) {
                            throw finalError;
                        }
                        throw new Error(`Все ${retries} попыток провалились, и проверка сети не удалась. Проверьте ваше интернет-соединение.`);
                    }
                }
                const delay = initialDelay * Math.pow(2, i);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    },

  /**
   * (Имитация) Получает предиктивные рекомендации от LLM по поводу соединения.
   */
  async getPredictiveConnectionAdvice({ hostname, stats }: { hostname: string, stats: any[] }): Promise<string> {
    const prompt = `Анализ стабильности соединения для хоста: ${hostname}. Вот история успешных подключений: ${JSON.stringify(stats, null, 2)}. Дай краткий (1-2 предложения) совет.`;
    const mockAdvice = "По нашим данным, соединение с этим сервисом наиболее стабильно в будние дни после полудня.";
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockAdvice;
  },

  /**
   * Анализирует статистику соединений для заданного хоста.
   */
  async analyzeConnectionStats({ hostname }: { hostname: string }): Promise<any> {
    try {
      const result = await chrome.storage.local.get("fetch_stats");
      const stats: any[] = result.fetch_stats?.[hostname] || [];
      const validStats = stats.filter(isValidStatObject);

      if (validStats.length === 0) {
        return { bestHours: new Array(24).fill(0), bestDays: new Array(7).fill(0), message: "Статистика отсутствует или невалидна." };
      }
      return analyze(validStats);

    } catch (e: any) {
      return { error: e.message };
    }
  },

  /**
   * Получает базовый контент (заголовок и весь текст) со страницы.
   */
  async getActivePageContent(tabId: number): Promise<any> {
    try {
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
      return { error: e.message };
    }
  },

  /**
   * Находит элементы по CSS-селектору и извлекает их текст или атрибут.
   */
  async getElements(tabId: number, options: { selector: string; attribute: string }): Promise<any> {
    try {
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
      return { error: e.message };
    }
  }
}; 