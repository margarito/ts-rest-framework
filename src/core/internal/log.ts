import { IDbLogger, QueryManager } from 'ts-db-helper';

export class Log {
    private static loggerValue: IDbLogger;
    private static get logger() {
        if (!Log.loggerValue) {
            Log.loggerValue = QueryManager.getInstance().logger;
        }
        return Log.loggerValue;
    }
    public static init(logger: IDbLogger) {
        this.loggerValue = logger;
    }

    public static l(...args: any[]) {
        Log.logger.log(...args);
    }

    public static d(...args: any[]) {
        Log.logger.debug(...args);
    }

    public static t(...args: any[]) {
        Log.logger.trace(...args);
    }

    public static i(...args: any[]) {
        Log.logger.info(...args);
    }

    public static w(...args: any[]) {
        Log.logger.warn(...args);
    }

    public static e(...args: any[]) {
        Log.logger.error(...args);
    }

    public static f(...args: any[]) {
        Log.logger.fatal(...args);
    }
}
