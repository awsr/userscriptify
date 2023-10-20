export interface UserscriptifyOptions {
    metadata?: string | object;
    replace?: string;
    indent?: number;
    style?: string;
    styleRaw?: string;
}
export declare function userscriptify(content: string, options?: undefined | UserscriptifyOptions): string;
export declare function userscriptifyAsync(content: string, options?: undefined | UserscriptifyOptions): Promise<string>;
