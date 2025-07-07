// @ts-check
const { devices } = require('@playwright/test');

/**
 * @see https://playwright.dev/docs/test-configuration
 */
const config = {
  testDir: './tests',
  /* Таймаут для каждого теста, включая teardown. */
  timeout: 30 * 1000,
  expect: {
    /**
     * Максимальное время ожидания для ассертов `expect()`.
     */
    timeout: 5000
  },
  /* Запускать тесты в файлах параллельно */
  fullyParallel: true,
  /* Запретить параллельный запуск тестов в одном файле */
  forbidOnly: !!process.env.CI,
  /* Количество повторных попыток при падении теста */
  retries: process.env.CI ? 2 : 0,
  /* Количество воркеров для параллельного запуска */
  workers: process.env.CI ? 1 : undefined,
  /* Репортер для вывода результатов */
  reporter: 'html',
  /* Глобальные настройки для всех проектов */
  use: {
    /* Максимальное время для каждого действия (например, `click()`) */
    actionTimeout: 0,
    /* Базовый URL для навигации */
    // baseURL: 'http://localhost:3000',

    /* Собирать трейс при падении теста */
    trace: 'on-first-retry',
    
    /* Отладочный режим - показывать браузер */
    headless: false,
    
    /* Замедлить действия для отладки */
    launchOptions: {
      slowMo: 1000,
    },
  },

  /* Настройка проектов для разных браузеров */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
};

module.exports = config;