import { __read, __spreadArray } from "tslib";
import loader from '@graphql-tools/webpack-loader';
var GraphQLTransformer = /** @class */ (function () {
    function GraphQLTransformer() {
    }
    GraphQLTransformer.prototype.process = function (input, _filePath, jestConfig) {
        var _a;
        var config = ((_a = jestConfig.config.globals) === null || _a === void 0 ? void 0 : _a['graphql']) || {};
        // call directly the webpack loader with a mocked context
        // as the loader leverages `this.cacheable()`
        return loader.call({
            cacheable: function () { },
            query: config,
        }, input);
    };
    return GraphQLTransformer;
}());
var transformer;
function defaultTransformer() {
    return transformer || (transformer = new GraphQLTransformer());
}
export function process() {
    var _a;
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    return (_a = defaultTransformer()).process.apply(_a, __spreadArray([], __read(args), false));
}
