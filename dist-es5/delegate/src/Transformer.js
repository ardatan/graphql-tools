import { __assign, __values } from "tslib";
import { prepareGatewayDocument } from './prepareGatewayDocument';
import { finalizeGatewayRequest } from './finalizeGatewayRequest';
import { checkResultAndHandleErrors } from './checkResultAndHandleErrors';
var Transformer = /** @class */ (function () {
    function Transformer(context) {
        var e_1, _a;
        this.transformations = [];
        this.delegationContext = context;
        var transforms = context.transforms;
        var delegationTransforms = transforms.slice().reverse();
        try {
            for (var delegationTransforms_1 = __values(delegationTransforms), delegationTransforms_1_1 = delegationTransforms_1.next(); !delegationTransforms_1_1.done; delegationTransforms_1_1 = delegationTransforms_1.next()) {
                var transform = delegationTransforms_1_1.value;
                this.addTransform(transform, {});
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (delegationTransforms_1_1 && !delegationTransforms_1_1.done && (_a = delegationTransforms_1.return)) _a.call(delegationTransforms_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
    }
    Transformer.prototype.addTransform = function (transform, context) {
        if (context === void 0) { context = {}; }
        this.transformations.push({ transform: transform, context: context });
    };
    Transformer.prototype.transformRequest = function (originalRequest) {
        var e_2, _a;
        var _b;
        var request = __assign(__assign({}, originalRequest), { document: prepareGatewayDocument(originalRequest.document, this.delegationContext.transformedSchema, this.delegationContext.returnType, (_b = this.delegationContext.info) === null || _b === void 0 ? void 0 : _b.schema) });
        try {
            for (var _c = __values(this.transformations), _d = _c.next(); !_d.done; _d = _c.next()) {
                var transformation = _d.value;
                if (transformation.transform.transformRequest) {
                    request = transformation.transform.transformRequest(request, this.delegationContext, transformation.context);
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
            }
            finally { if (e_2) throw e_2.error; }
        }
        return finalizeGatewayRequest(request, this.delegationContext);
    };
    Transformer.prototype.transformResult = function (originalResult) {
        var result = originalResult;
        // from rigth to left
        for (var i = this.transformations.length - 1; i >= 0; i--) {
            var transformation = this.transformations[i];
            if (transformation.transform.transformResult) {
                result = transformation.transform.transformResult(result, this.delegationContext, transformation.context);
            }
        }
        return checkResultAndHandleErrors(result, this.delegationContext);
    };
    return Transformer;
}());
export { Transformer };
