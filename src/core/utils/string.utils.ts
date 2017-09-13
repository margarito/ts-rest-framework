export class StringUtils {
    public static isString(variable: any) {
        return typeof variable === 'string' || variable instanceof String;
    }
}
