export function applySchemaTransforms(originalWrappingSchema, subschemaConfig, transformedSchema) {
    var schemaTransforms = subschemaConfig.transforms;
    if (schemaTransforms == null) {
        return originalWrappingSchema;
    }
    return schemaTransforms.reduce(function (schema, transform) {
        return transform.transformSchema != null
            ? transform.transformSchema(schema, subschemaConfig, transformedSchema)
            : schema;
    }, originalWrappingSchema);
}
