// Простой content script для тестирования
console.log('=== SIMPLE CONTENT SCRIPT START ===');

try {
    window.APP_EXTENSION_LOADED = true;
    console.log('✅ Маркер установлен:', window.APP_EXTENSION_LOADED);
} catch (error) {
    console.error('❌ Ошибка установки маркера:', error);
}

try {
    console.log('✅ Chrome API доступен:', !!window.chrome);
    console.log('✅ Chrome runtime доступен:', !!window.chrome?.runtime);
} catch (error) {
    console.error('❌ Ошибка доступа к Chrome API:', error);
}

console.log('=== SIMPLE CONTENT SCRIPT END ==='); 