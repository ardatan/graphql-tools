import { __extends } from "tslib";
var ClusterNotFound = /** @class */ (function (_super) {
    __extends(ClusterNotFound, _super);
    function ClusterNotFound(name) {
        return _super.call(this, "Cluster '" + name + "' is neither a known shared cluster nor defined in your global .prismarc.") || this;
    }
    return ClusterNotFound;
}(Error));
export { ClusterNotFound };
