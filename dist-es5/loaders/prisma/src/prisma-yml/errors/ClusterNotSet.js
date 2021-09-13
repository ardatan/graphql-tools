import { __extends } from "tslib";
var ClusterNotSet = /** @class */ (function (_super) {
    __extends(ClusterNotSet, _super);
    function ClusterNotSet() {
        return _super.call(this, "No cluster set. In order to run this command, please set the \"cluster\" property in your prisma.yml") || this;
    }
    return ClusterNotSet;
}(Error));
export { ClusterNotSet };
