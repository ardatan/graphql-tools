import { applySchemaTransforms } from './applySchemaTransforms';
export function isSubschema(value) {
    return Boolean(value.transformedSchema);
}
var Subschema = /** @class */ (function () {
    function Subschema(config) {
        var _a;
        this.schema = config.schema;
        this.executor = config.executor;
        this.batch = config.batch;
        this.batchingOptions = config.batchingOptions;
        this.createProxyingResolver = config.createProxyingResolver;
        this.transforms = (_a = config.transforms) !== null && _a !== void 0 ? _a : [];
        this.transformedSchema = applySchemaTransforms(this.schema, config);
        this.merge = config.merge;
    }
    return Subschema;
}());
export { Subschema };
