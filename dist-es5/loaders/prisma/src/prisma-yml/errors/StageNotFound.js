import { __extends } from "tslib";
var StageNotFound = /** @class */ (function (_super) {
    __extends(StageNotFound, _super);
    function StageNotFound(name) {
        var _this = this;
        if (name) {
            _this = _super.call(this, "Stage '" + name + "' could not be found in the local prisma.yml") || this;
        }
        else {
            _this = _super.call(this, "No stage provided and no default stage set") || this;
        }
        return _this;
    }
    return StageNotFound;
}(Error));
export { StageNotFound };
