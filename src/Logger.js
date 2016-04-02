/*
 * A very simple class for logging errors
 */

class Logger {
  constructor(name, callback) {
    this.name = name;
    this.errors = [];
    this.callback = callback;
  }

  log(err) {
    this.errors.push(err);
    if (typeof this.callback === 'function') {
      this.callback(err);
    }
  }

  printOneError(e) {
    return e.stack;
  }

  printAllErrors() {
    return this.errors.reduce(e => this.printError(e), '');
  }
}

export { Logger };
