/*
 * A very simple class for logging errors
 */
export class Logger {
    constructor(name, callback) {
        this.name = name;
        this.errors = [];
        this.callback = callback;
        // TODO: should assert that callback is a function
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
        return this.errors.reduce((agg, e) => `${agg}\n${this.printOneError(e)}`, '');
    }
}
//# sourceMappingURL=Logger.js.map