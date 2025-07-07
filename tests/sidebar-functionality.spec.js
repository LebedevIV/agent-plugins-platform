const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Проверка функциональности боковой панели', () => {
  let browserContext;
  let page;
  let serviceWorker;

  test.beforeAll(async () => {
    // Используем постоянную папку для данных пользователя, чтобы сохранять сессии
    const userDataDir = path.join(__dirname, '..', 'playwright-user-data');
    const pathToExtension = path.join(__dirname, '..', 'dist');
    
    browserContext = await test.chromium.launchPersistentContext(userDataDir, {
      headless: false,
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    });
    
    serviceWorker = browserContext.serviceWorkers()[0];
    if (!serviceWorker) {
      serviceWorker = await browserContext.waitForEvent('serviceworker');
    }
  });

  test.afterAll(async () => {
    await browserContext.close();
  });

  test.beforeEach(async () => {
    page = await browserContext.newPage();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('Кнопки настроек и контекста должны работать, и в консоли не должно быть ошибок', async () => {
    // 1. Переходим на нашу локальную тестовую страницу
    await page.goto(`file://${path.join(__dirname, 'test-page.html')}`);

    // Ждем, пока API расширения будет доступно на странице.
    await page.waitForFunction(() => window.chrome && window.chrome.runtime && window.chrome.runtime.sendMessage);

    // 2. Открываем боковую панель через background script для стабильности теста
    const openResponse = await page.evaluate(() => {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: '_TEST_OPEN_SIDE_PANEL' }, (response) => {
          if (chrome.runtime.lastError) {
            resolve({ success: false, error: chrome.runtime.lastError.message });
          } else {
            resolve(response);
          }
        });
      });
    });

    // Проверяем, что боковая панель была успешно открыта
    expect(openResponse.success).toBe(true, `Не удалось открыть боковую панель: ${openResponse.error}`);

    // 3. Находим боковую панель (она является фреймом)
    // Ждем ее появления
    const sidebarFrame = await page.waitForSelector('iframe[src*="sidepanel.html"]');
    const sidebar = await sidebarFrame.contentFrame();
    
    // Массив для хранения ошибок консоли
    const consoleErrors = [];
    sidebar.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`ОШИБКА В КОНСОЛИ БОКОВОЙ ПАНЕЛИ: ${msg.text()}`);
        consoleErrors.push(msg.text());
      }
    });

    // 4. Проверяем кнопку настроек
    const settingsButton = await sidebar.waitForSelector('#settings-btn');
    expect(settingsButton).toBeTruthy();
    
    const newPagePromise = browserContext.waitForEvent('page');
    await settingsButton.click();
    const newPage = await newPagePromise;
    await newPage.waitForLoadState();
    
    console.log('Новая страница открыта:', newPage.url());
    expect(newPage.url()).toContain('options.html');
    await newPage.close(); // Закрываем вкладку настроек

    // 5. Проверяем кнопку контекста
    const contextButton = await sidebar.waitForSelector('#context-check-btn');
    expect(contextButton).toBeTruthy();
    await contextButton.click();
    
    const contextUrlDisplay = await sidebar.waitForSelector('#context-url-display');
    const isVisible = await contextUrlDisplay.isVisible();
    expect(isVisible).toBe(true);

    // 6. Проверяем, были ли ошибки в консоли
    expect(consoleErrors.length).toBe(0, `В консоли боковой панели обнаружены ошибки: \n${consoleErrors.join('\n')}`);
  });
}); 