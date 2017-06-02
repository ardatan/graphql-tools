import { chainResolvers } from './schemaGenerator';
export function autopublishMutationResults(schema, pubsub) {
    // decorate the mutations with your thingy
    const mutationFields = schema.getMutationType().getFields();
    Object.keys(mutationFields).forEach(fieldName => {
        const field = mutationFields[fieldName];
        // define the function
        const publishMutatedValue = (source, args, ctx, info) => {
            pubsub.publish(fieldName, source);
            return source;
        };
        field.resolve = chainResolvers([field.resolve, publishMutatedValue]);
    });
}
//# sourceMappingURL=autopublish.js.map