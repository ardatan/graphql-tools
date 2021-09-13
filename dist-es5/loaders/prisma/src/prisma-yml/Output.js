var Output = /** @class */ (function () {
    function Output() {
    }
    Output.prototype.log = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        console.log(args);
    };
    Output.prototype.warn = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        console.warn(args);
    };
    Output.prototype.getErrorPrefix = function (fileName, type) {
        if (type === void 0) { type = 'error'; }
        return "[" + type.toUpperCase() + "] in " + fileName + ": ";
    };
    return Output;
}());
export { Output };
var TestOutput = /** @class */ (function () {
    function TestOutput() {
        this.output = [];
    }
    TestOutput.prototype.log = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        this.output = this.output.concat(args);
    };
    TestOutput.prototype.warn = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        this.output = this.output.concat(args);
    };
    TestOutput.prototype.getErrorPrefix = function (fileName, type) {
        if (type === void 0) { type = 'error'; }
        return "[" + type.toUpperCase() + "] in " + fileName + ": ";
    };
    return TestOutput;
}());
export { TestOutput };
