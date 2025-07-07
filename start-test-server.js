const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const server = http.createServer((req, res) => {
  console.log(`📡 ${req.method} ${req.url}`);
  
  let filePath = '';
  let contentType = 'text/html';
  
  if (req.url === '/' || req.url === '/test-page.html') {
    filePath = path.join(__dirname, 'test-page.html');
  } else if (req.url === '/style.css') {
    filePath = path.join(__dirname, 'style.css');
    contentType = 'text/css';
  } else {
    res.writeHead(404);
    res.end('404 Not Found');
    return;
  }
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      console.error(`❌ Ошибка чтения файла ${filePath}:`, err);
      res.writeHead(500);
      res.end('500 Internal Server Error');
      return;
    }
    
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log('🚀 ТЕСТОВЫЙ СЕРВЕР ЗАПУЩЕН!');
  console.log('=====================================');
  console.log(`📄 Тестовая страница: http://localhost:${PORT}`);
  console.log('');
  console.log('📋 ИНСТРУКЦИИ ДЛЯ ТЕСТИРОВАНИЯ:');
  console.log('1. Откройте браузер Chrome');
  console.log('2. Перейдите на http://localhost:3000');
  console.log('3. Откройте chrome://extensions/');
  console.log('4. Включите "Developer mode"');
  console.log('5. Нажмите "Load unpacked" и выберите папку dist/');
  console.log('6. Включите расширение "Agent-Plugins-Platform"');
  console.log('7. Вернитесь на тестовую страницу');
  console.log('8. Нажмите кнопки тестирования');
  console.log('9. Проверьте результаты в консоли страницы');
  console.log('');
  console.log('⏹️  Для остановки сервера нажмите Ctrl+C');
  console.log('');
});

process.on('SIGINT', () => {
  console.log('\n🛑 Останавливаем сервер...');
  server.close(() => {
    console.log('✅ Сервер остановлен');
    process.exit(0);
  });
}); 