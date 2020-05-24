import { ILogger } from '../Interfaces';
export declare class Logger implements ILogger {
    errors: Array<Error>;
    name: string | undefined;
    private readonly callback;
    constructor(name?: string, callback?: Function);
    log(err: Error): void;
    printOneError(e: Error): string;
    printAllErrors(): string;
}
