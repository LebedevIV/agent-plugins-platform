const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const server = http.createServer((req, res) => {
  console.log(`📡 ${req.method} ${req.url}`);
  
  let filePath = '';
  let contentType = 'text/html';
  
  if (req.url === '/' || req.url === '/test-page.html') {
    filePath = path.join(__dirname, 'test-page-fixed.html');
  } else if (req.url === '/style.css') {
    filePath = path.join(__dirname, 'style.css');
    contentType = 'text/css';
  } else if (req.url === '/favicon.ico') {
    res.writeHead(404);
    res.end('404 Not Found');
    return;
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
  console.log(`🚀 Тестовый сервер запущен на http://localhost:${PORT}`);
  console.log(`📄 Тестовая страница: http://localhost:${PORT}/test-page.html`);
  console.log(`⏹️  Для остановки нажмите Ctrl+C`);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Останавливаем сервер...');
  server.close(() => {
    console.log('✅ Сервер остановлен');
    process.exit(0);
  });
}); 