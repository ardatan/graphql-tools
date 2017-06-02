import { ILogger } from './Interfaces';
export declare class Logger implements ILogger {
    errors: Error[];
    name: string;
    private callback;
    constructor(name?: string, callback?: Function);
    log(err: Error): void;
    printOneError(e: Error): string;
    printAllErrors(): string;
}
