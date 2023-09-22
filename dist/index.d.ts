export interface USOptions {
    meta: string;
    replace: string;
    indent: number;
    style: string | undefined;
    styleRaw: string | undefined;
}
export declare function userscriptify(content: string, options?: undefined | Partial<USOptions>): Promise<string>;
