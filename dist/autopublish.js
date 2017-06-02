"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var schemaGenerator_1 = require("./schemaGenerator");
function autopublishMutationResults(schema, pubsub) {
    // decorate the mutations with your thingy
    var mutationFields = schema.getMutationType().getFields();
    Object.keys(mutationFields).forEach(function (fieldName) {
        var field = mutationFields[fieldName];
        // define the function
        var publishMutatedValue = function (source, args, ctx, info) {
            pubsub.publish(fieldName, source);
            return source;
        };
        field.resolve = schemaGenerator_1.chainResolvers([field.resolve, publishMutatedValue]);
    });
}
exports.autopublishMutationResults = autopublishMutationResults;
//# sourceMappingURL=autopublish.js.map