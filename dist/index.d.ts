export interface USOptions {
    metadata: string | object;
    replace: string;
    indent: number;
    style?: string;
    styleRaw?: string;
}
export declare function userscriptify(content: string, options?: undefined | Partial<USOptions>): Promise<string>;
