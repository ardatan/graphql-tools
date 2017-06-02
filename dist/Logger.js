"use strict";
/*
 * A very simple class for logging errors
 */
Object.defineProperty(exports, "__esModule", { value: true });
var Logger = (function () {
    function Logger(name, callback) {
        this.name = name;
        this.errors = [];
        this.callback = callback;
        // TODO: should assert that callback is a function
    }
    Logger.prototype.log = function (err) {
        this.errors.push(err);
        if (typeof this.callback === 'function') {
            this.callback(err);
        }
    };
    Logger.prototype.printOneError = function (e) {
        return e.stack;
    };
    Logger.prototype.printAllErrors = function () {
        var _this = this;
        return this.errors.reduce(function (agg, e) { return agg + "\n" + _this.printOneError(e); }, '');
    };
    return Logger;
}());
exports.Logger = Logger;
//# sourceMappingURL=Logger.js.map