/**
 * VibeLogger設定 - いごぽん
 * 
 * AIアシスタント向けの構造化ログを出力
 * デバッグ時はブラウザコンソールを参照
 */

// ブラウザ環境ではコンソール出力
interface LogOptions {
    context?: Record<string, any>;
    human_note?: string;
    ai_todo?: string;
}

class BrowserLogger {
    private projectName: string;

    constructor(projectName: string) {
        this.projectName = projectName;
    }

    private formatLog(level: string, operation: string, message: string, options?: LogOptions) {
        return {
            timestamp: new Date().toISOString(),
            level,
            project: this.projectName,
            operation,
            message,
            context: options?.context || {},
            human_note: options?.human_note || null,
            ai_todo: options?.ai_todo || null
        };
    }

    info(operation: string, message: string, options?: LogOptions) {
        const entry = this.formatLog('INFO', operation, message, options);
        console.log('[VibeLog]', JSON.stringify(entry));
        return entry;
    }

    warn(operation: string, message: string, options?: LogOptions) {
        const entry = this.formatLog('WARN', operation, message, options);
        console.warn('[VibeLog]', JSON.stringify(entry));
        return entry;
    }

    error(operation: string, message: string, options?: LogOptions) {
        const entry = this.formatLog('ERROR', operation, message, options);
        console.error('[VibeLog]', JSON.stringify(entry));
        return entry;
    }

    debug(operation: string, message: string, options?: LogOptions) {
        const entry = this.formatLog('DEBUG', operation, message, options);
        console.debug('[VibeLog]', JSON.stringify(entry));
        return entry;
    }
}

// シングルトンインスタンス
const loggerInstance = new BrowserLogger('igopon');

// 便利関数としてエクスポート
export const logger = {
    info: (operation: string, message: string, options?: LogOptions) =>
        loggerInstance.info(operation, message, options),
    warn: (operation: string, message: string, options?: LogOptions) =>
        loggerInstance.warn(operation, message, options),
    error: (operation: string, message: string, options?: LogOptions) =>
        loggerInstance.error(operation, message, options),
    debug: (operation: string, message: string, options?: LogOptions) =>
        loggerInstance.debug(operation, message, options),
};

export default logger;
