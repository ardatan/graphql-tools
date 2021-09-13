export declare class Output {
  log(...args: any): void;
  warn(...args: any): void;
  getErrorPrefix(fileName: string, type?: 'error' | 'warning'): string;
}
export declare class TestOutput {
  output: string[];
  constructor();
  log(...args: any): void;
  warn(...args: any): void;
  getErrorPrefix(fileName: string, type?: 'error' | 'warning'): string;
}
export interface IOutput {
  warn: (...args: any) => void;
  log: (...args: any) => void;
  getErrorPrefix: (fileName: string, type?: 'error' | 'warning') => string;
}
