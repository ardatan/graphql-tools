export class Output {
  log(...args: any) {
    console.log(args);
  }

  warn(...args: any) {
    console.warn(args);
  }

  getErrorPrefix(fileName: string, type: 'error' | 'warning' = 'error') {
    return `[${type.toUpperCase()}] in ${fileName}: `;
  }
}

export class TestOutput {
  output: string[];

  constructor() {
    this.output = [];
  }

  log(...args: any) {
    this.output = this.output.concat(args);
  }

  warn(...args: any) {
    this.output = this.output.concat(args);
  }

  getErrorPrefix(fileName: string, type: 'error' | 'warning' = 'error') {
    return `[${type.toUpperCase()}] in ${fileName}: `;
  }
}

export interface IOutput {
  warn: (...args: any) => void;
  log: (...args: any) => void;
  getErrorPrefix: (fileName: string, type?: 'error' | 'warning') => string;
}
