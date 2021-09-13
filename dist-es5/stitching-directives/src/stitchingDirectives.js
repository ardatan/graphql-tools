import { __assign } from "tslib";
import { GraphQLDirective, GraphQLList, GraphQLNonNull, GraphQLString } from 'graphql';
import { defaultStitchingDirectiveOptions } from './defaultStitchingDirectiveOptions';
import { stitchingDirectivesValidator } from './stitchingDirectivesValidator';
import { stitchingDirectivesTransformer } from './stitchingDirectivesTransformer';
export function stitchingDirectives(options) {
    if (options === void 0) { options = {}; }
    var finalOptions = __assign(__assign({}, defaultStitchingDirectiveOptions), options);
    var keyDirectiveName = finalOptions.keyDirectiveName, computedDirectiveName = finalOptions.computedDirectiveName, mergeDirectiveName = finalOptions.mergeDirectiveName, canonicalDirectiveName = finalOptions.canonicalDirectiveName;
    var keyDirectiveTypeDefs = /* GraphQL */ "directive @" + keyDirectiveName + "(selectionSet: String!) on OBJECT";
    var computedDirectiveTypeDefs = /* GraphQL */ "directive @" + computedDirectiveName + "(selectionSet: String!) on FIELD_DEFINITION";
    var mergeDirectiveTypeDefs = /* GraphQL */ "directive @" + mergeDirectiveName + "(argsExpr: String, keyArg: String, keyField: String, key: [String!], additionalArgs: String) on FIELD_DEFINITION";
    var canonicalDirectiveTypeDefs = /* GraphQL */ "directive @" + canonicalDirectiveName + " on OBJECT | INTERFACE | INPUT_OBJECT | UNION | ENUM | SCALAR | FIELD_DEFINITION | INPUT_FIELD_DEFINITION";
    var keyDirective = new GraphQLDirective({
        name: keyDirectiveName,
        locations: ['OBJECT'],
        args: {
            selectionSet: { type: new GraphQLNonNull(GraphQLString) },
        },
    });
    var computedDirective = new GraphQLDirective({
        name: computedDirectiveName,
        locations: ['FIELD_DEFINITION'],
        args: {
            selectionSet: { type: new GraphQLNonNull(GraphQLString) },
        },
    });
    var mergeDirective = new GraphQLDirective({
        name: mergeDirectiveName,
        locations: ['FIELD_DEFINITION'],
        args: {
            argsExpr: { type: GraphQLString },
            keyArg: { type: GraphQLString },
            keyField: { type: GraphQLString },
            key: { type: new GraphQLList(new GraphQLNonNull(GraphQLString)) },
            additionalArgs: { type: GraphQLString },
        },
    });
    var canonicalDirective = new GraphQLDirective({
        name: canonicalDirectiveName,
        locations: [
            'OBJECT',
            'INTERFACE',
            'INPUT_OBJECT',
            'UNION',
            'ENUM',
            'SCALAR',
            'FIELD_DEFINITION',
            'INPUT_FIELD_DEFINITION',
        ],
    });
    var allStitchingDirectivesTypeDefs = [
        keyDirectiveTypeDefs,
        computedDirectiveTypeDefs,
        mergeDirectiveTypeDefs,
        canonicalDirectiveTypeDefs,
    ].join('\n');
    return {
        keyDirectiveTypeDefs: keyDirectiveTypeDefs,
        computedDirectiveTypeDefs: computedDirectiveTypeDefs,
        mergeDirectiveTypeDefs: mergeDirectiveTypeDefs,
        canonicalDirectiveTypeDefs: canonicalDirectiveTypeDefs,
        stitchingDirectivesTypeDefs: allStitchingDirectivesTypeDefs,
        allStitchingDirectivesTypeDefs: allStitchingDirectivesTypeDefs,
        keyDirective: keyDirective,
        computedDirective: computedDirective,
        mergeDirective: mergeDirective,
        canonicalDirective: canonicalDirective,
        allStitchingDirectives: [keyDirective, computedDirective, mergeDirective, canonicalDirective],
        stitchingDirectivesValidator: stitchingDirectivesValidator(finalOptions),
        stitchingDirectivesTransformer: stitchingDirectivesTransformer(finalOptions),
    };
}
