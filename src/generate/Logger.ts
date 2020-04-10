/*
 * A very simple class for logging errors
 */

import { ILogger } from '../Interfaces';

export class Logger implements ILogger {
  public errors: Array<Error>;
  public name: string | undefined;
  private readonly callback: Function | undefined;

  constructor(name?: string, callback?: Function) {
    this.name = name;
    this.errors = [];
    this.callback = callback;
    // TODO: should assert that callback is a function
  }

  public log(err: Error) {
    this.errors.push(err);
    if (typeof this.callback === 'function') {
      this.callback(err);
    }
  }

  public printOneError(e: Error): string {
    return e.stack ? e.stack : '';
  }

  public printAllErrors() {
    return this.errors.reduce(
      (agg: string, e: Error) => `${agg}\n${this.printOneError(e)}`,
      '',
    );
  }
}
