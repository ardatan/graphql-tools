import { __extends } from "tslib";
var AggregateErrorImpl = globalThis.AggregateError;
if (typeof AggregateErrorImpl === 'undefined') {
    var AggregateErrorClass_1 = /** @class */ (function (_super) {
        __extends(AggregateErrorClass, _super);
        function AggregateErrorClass(errors, message) {
            if (message === void 0) { message = ''; }
            var _this = _super.call(this, message) || this;
            _this.errors = errors;
            _this.name = 'AggregateError';
            Error.captureStackTrace(_this, AggregateErrorClass);
            return _this;
        }
        return AggregateErrorClass;
    }(Error));
    AggregateErrorImpl = function (errors, message) {
        return new AggregateErrorClass_1(errors, message);
    };
}
export { AggregateErrorImpl as AggregateError };
