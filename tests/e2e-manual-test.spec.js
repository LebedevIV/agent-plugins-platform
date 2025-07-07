const { test, expect } = require('@playwright/test');

test.describe('Manual Extension Testing', () => {
  test('Manual extension setup and verification', async ({ page }) => {
    // Загружаем тестовую страницу
    await page.goto('http://localhost:3000/test-page.html');
    
    console.log('🔧 РУЧНОЕ ТЕСТИРОВАНИЕ РАСШИРЕНИЯ');
    console.log('=====================================');
    console.log('');
    console.log('📋 ИНСТРУКЦИИ:');
    console.log('1. Откройте Chrome DevTools (F12)');
    console.log('2. Перейдите на вкладку "Console"');
    console.log('3. Настройте расширение:');
    console.log('   - Откройте chrome://extensions/');
    console.log('   - Найдите "Agent-Plugins-Platform"');
    console.log('   - Включите "Developer mode"');
    console.log('   - Нажмите "Load unpacked" и выберите папку dist/');
    console.log('   - Включите расширение');
    console.log('4. Вернитесь на тестовую страницу');
    console.log('5. Нажмите кнопки тестирования на странице');
    console.log('6. Проверьте результаты в консоли');
    console.log('');
    console.log('⏸️  Тест приостановлен на 60 секунд для настройки...');
    console.log('   Нажмите любую клавишу в консоли, чтобы продолжить автоматические проверки');
    
    // Ждем 60 секунд для ручной настройки
    await page.waitForTimeout(60000);
    
    console.log('');
    console.log('🔍 Запускаем автоматические проверки...');
    
    // Проверяем статус расширения
    const extensionStatus = await page.locator('#extension-status').textContent();
    console.log(`📊 Статус расширения: ${extensionStatus}`);
    
    // Проверяем статус content script
    const contentScriptStatus = await page.locator('#content-script-status').textContent();
    console.log(`📊 Статус content script: ${contentScriptStatus}`);
    
    // Проверяем статус сайдпанели
    const sidebarStatus = await page.locator('#sidebar-status').textContent();
    console.log(`📊 Статус сайдпанели: ${sidebarStatus}`);
    
    // Проверяем наличие Chrome API
    const hasChromeAPI = await page.evaluate(() => {
      return !!(window.chrome && window.chrome.runtime);
    });
    console.log(`🌐 Chrome API доступен: ${hasChromeAPI}`);
    
    // Проверяем наличие content script маркера
    const hasContentScript = await page.evaluate(() => {
      return !!window.APP_EXTENSION_LOADED;
    });
    console.log(`📜 Content script загружен: ${hasContentScript}`);
    
    // Проверяем наличие сайдпанели
    const hasSidebar = await page.evaluate(() => {
      return !!document.querySelector('iframe[src*="sidepanel.html"]');
    });
    console.log(`📋 Сайдпанель найдена: ${hasSidebar}`);
    
    // Тестируем API расширения
    console.log('');
    console.log('🧪 Тестируем API расширения...');
    await page.click('button:has-text("Проверить API расширения")');
    await page.waitForTimeout(2000);
    
    // Тестируем переключение сайдпанели
    console.log('🧪 Тестируем переключение сайдпанели...');
    await page.click('button:has-text("Переключить сайдпанель")');
    await page.waitForTimeout(2000);
    
    // Тестируем запуск плагина
    console.log('🧪 Тестируем запуск плагина...');
    await page.click('button:has-text("Запустить тестовый плагин")');
    await page.waitForTimeout(2000);
    
    // Получаем логи из консоли страницы
    const consoleOutput = await page.locator('#console-output').textContent();
    console.log('');
    console.log('📝 Логи тестовой страницы:');
    console.log(consoleOutput);
    
    console.log('');
    console.log('✅ Ручное тестирование завершено!');
    console.log('📋 РЕЗУЛЬТАТЫ:');
    console.log(`   - Расширение: ${extensionStatus}`);
    console.log(`   - Content Script: ${contentScriptStatus}`);
    console.log(`   - Сайдпанель: ${sidebarStatus}`);
    console.log(`   - Chrome API: ${hasChromeAPI ? '✅' : '❌'}`);
    console.log(`   - Content Script Marker: ${hasContentScript ? '✅' : '❌'}`);
    console.log(`   - Sidebar iframe: ${hasSidebar ? '✅' : '❌'}`);
    
    // Ждем еще 10 секунд для анализа результатов
    await page.waitForTimeout(10000);
  });
}); 