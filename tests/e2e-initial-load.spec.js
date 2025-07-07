const { test, expect } = require('@playwright/test');
const path = require('path');
const http = require('http');
const fs = require('fs');
const url = require('url');

test('Полуавтоматическая проверка расширения и сайдпанели', async () => {
  // Запускаем простой HTTP сервер для тестовой страницы
  const server = http.createServer((req, res) => {
    const testPagePath = path.join(__dirname, 'test-page.html');
    const content = fs.readFileSync(testPagePath, 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(content);
  });
  const serverPort = 3001;
  await new Promise(resolve => server.listen(serverPort, resolve));

  // Путь к папке с распакованным расширением.
  const pathToExtension = path.join(__dirname, '..', 'dist');
  const context = await test.chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${pathToExtension}`,
      `--load-extension=${pathToExtension}`,
    ],
  });

  const serviceWorker = context.serviceWorkers()[0];
  await expect(serviceWorker).toBeTruthy();
  console.log('✅ Service Worker найден:', serviceWorker.url());

  const page = await context.newPage();
  console.log('🔍 Открываем локальную тестовую страницу через HTTP...');
  await page.goto(`http://localhost:${serverPort}`);
  console.log('⏸️ Пауза: Откройте сайдпанель вручную, выставьте нужные настройки расширения, затем нажмите "Продолжить" в Playwright Inspector.');
  await page.pause();

  // После ручных действий — автоматическая проверка
  console.log('▶️ Продолжаем тест: проверяем наличие сайдпанели и content script...');

  // Проверяем наличие сайдпанели
  const sidebarExists = await page.evaluate(() => {
    return !!document.querySelector('iframe[src*="sidepanel.html"]');
  });
  console.log('Сайдпанель найдена:', sidebarExists);
  expect(sidebarExists).toBe(true);

  // Проверяем наличие content script
  const contentScriptLoaded = await page.evaluate(() => {
    return window.APP_EXTENSION_LOADED === true;
  });
  console.log('Content script загружен:', contentScriptLoaded);
  expect(contentScriptLoaded).toBe(true);

  // Закрываем контекст браузера и HTTP сервер
  await context.close();
  server.close();
});