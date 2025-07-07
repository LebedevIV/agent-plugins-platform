const { test, expect } = require('@playwright/test');
const path = require('path');

test('Проверка загрузки расширения', async () => {
  // Путь к папке с распакованным расширением.
  // Мы предполагаем, что сборка проекта находится в папке 'dist'.
  const pathToExtension = path.join(__dirname, '..', 'dist');

  // Запускаем постоянный контекст браузера с загруженным расширением.
  // Это позволяет нам взаимодействовать с расширением на протяжении всего теста.
  const context = await test.chromium.launchPersistentContext('', {
    headless: false, // Установите true для запуска в headless-режиме (например, в CI)
    args: [
      `--disable-extensions-except=${pathToExtension}`,
      `--load-extension=${pathToExtension}`,
    ],
  });

  // Проверяем, что у нашего расширения есть фоновый процесс (service worker).
  // Это основной способ убедиться, что расширение успешно загрузилось.
  const serviceWorker = context.serviceWorkers()[0];
  await expect(serviceWorker).toBeTruthy();

  // Открываем новую страницу, чтобы убедиться, что браузер работает.
  const page = await context.newPage();
  await page.goto('about:blank');
  
  // Закрываем контекст браузера после завершения теста.
  await context.close();
});