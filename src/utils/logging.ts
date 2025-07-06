/**
 * src/utils/logging.ts
 * 
 * Централизованная система логирования
 */

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}

interface LogConfig {
    level: LogLevel;
    prefix: string;
    enableConsole: boolean;
}

class Logger {
    private config: LogConfig;

    constructor(prefix: string = 'APP', level: LogLevel = LogLevel.INFO) {
        this.config = {
            level,
            prefix,
            enableConsole: true
        };
    }

    private shouldLog(level: LogLevel): boolean {
        return level >= this.config.level;
    }

    private formatMessage(level: string, message: string, ...args: any[]): string {
        const timestamp = new Date().toISOString();
        const prefix = `[${this.config.prefix}]`;
        const levelStr = `[${level}]`;
        const formattedArgs = args.length > 0 ? ' ' + args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ') : '';
        
        return `${timestamp} ${prefix} ${levelStr} ${message}${formattedArgs}`;
    }

    debug(message: string, ...args: any[]): void {
        if (this.shouldLog(LogLevel.DEBUG)) {
            const formatted = this.formatMessage('DEBUG', message, ...args);
            if (this.config.enableConsole) {
                console.debug(formatted);
            }
        }
    }

    info(message: string, ...args: any[]): void {
        if (this.shouldLog(LogLevel.INFO)) {
            const formatted = this.formatMessage('INFO', message, ...args);
            if (this.config.enableConsole) {
                console.info(formatted);
            }
        }
    }

    warn(message: string, ...args: any[]): void {
        if (this.shouldLog(LogLevel.WARN)) {
            const formatted = this.formatMessage('WARN', message, ...args);
            if (this.config.enableConsole) {
                console.warn(formatted);
            }
        }
    }

    error(message: string, ...args: any[]): void {
        if (this.shouldLog(LogLevel.ERROR)) {
            const formatted = this.formatMessage('ERROR', message, ...args);
            if (this.config.enableConsole) {
                console.error(formatted);
            }
        }
    }

    setLevel(level: LogLevel): void {
        this.config.level = level;
    }

    setPrefix(prefix: string): void {
        this.config.prefix = prefix;
    }

    enableConsole(enable: boolean): void {
        this.config.enableConsole = enable;
    }
}

// Создаем логгеры для разных частей приложения
export const backgroundLogger = new Logger('Background', LogLevel.INFO);
export const sidebarLogger = new Logger('Sidebar', LogLevel.INFO);
export const pluginLogger = new Logger('Plugin', LogLevel.INFO);
export const hostApiLogger = new Logger('HostAPI', LogLevel.INFO);

// Удобные функции для быстрого логирования
export function logDebug(message: string, ...args: any[]): void {
    backgroundLogger.debug(message, ...args);
}

export function logInfo(message: string, ...args: any[]): void {
    backgroundLogger.info(message, ...args);
}

export function logWarn(message: string, ...args: any[]): void {
    backgroundLogger.warn(message, ...args);
}

export function logError(message: string, ...args: any[]): void {
    backgroundLogger.error(message, ...args);
} 