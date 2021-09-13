import { __assign, __awaiter, __generator, __read, __spreadArray } from "tslib";
import { parseGraphQLSDL, AggregateError } from '@graphql-tools/utils';
import { fetch } from 'cross-fetch';
import syncFetch from 'sync-fetch';
var DEFAULT_APOLLO_ENDPOINT = 'https://engine-graphql.apollographql.com/api/graphql';
/**
 * This loader loads a schema from Apollo Engine
 */
var ApolloEngineLoader = /** @class */ (function () {
    function ApolloEngineLoader() {
    }
    ApolloEngineLoader.prototype.getFetchArgs = function (options) {
        return [
            options.engine.endpoint || DEFAULT_APOLLO_ENDPOINT,
            {
                method: 'POST',
                headers: __assign({ 'x-api-key': options.engine.apiKey, 'apollo-client-name': 'Apollo Language Server', 'apollo-client-reference-id': '146d29c0-912c-46d3-b686-920e52586be6', 'apollo-client-version': '2.6.8', 'Content-Type': 'application/json', Accept: 'application/json' }, options.headers),
                body: JSON.stringify({
                    query: SCHEMA_QUERY,
                    variables: {
                        id: options.graph,
                        tag: options.variant,
                    },
                }),
            },
        ];
    };
    ApolloEngineLoader.prototype.canLoad = function (ptr) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.canLoadSync(ptr)];
            });
        });
    };
    ApolloEngineLoader.prototype.canLoadSync = function (ptr) {
        return typeof ptr === 'string' && ptr === 'apollo-engine';
    };
    ApolloEngineLoader.prototype.load = function (pointer, options) {
        return __awaiter(this, void 0, void 0, function () {
            var fetchArgs, response, _a, data, errors, source;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.canLoad(pointer)];
                    case 1:
                        if (!(_b.sent())) {
                            return [2 /*return*/, []];
                        }
                        fetchArgs = this.getFetchArgs(options);
                        return [4 /*yield*/, fetch.apply(void 0, __spreadArray([], __read(fetchArgs), false))];
                    case 2:
                        response = _b.sent();
                        return [4 /*yield*/, response.json()];
                    case 3:
                        _a = _b.sent(), data = _a.data, errors = _a.errors;
                        if (errors) {
                            throw new AggregateError(errors, 'Introspection from Apollo Engine failed');
                        }
                        source = parseGraphQLSDL(pointer, data.service.schema.document, options);
                        return [2 /*return*/, [source]];
                }
            });
        });
    };
    ApolloEngineLoader.prototype.loadSync = function (pointer, options) {
        if (!this.canLoadSync(pointer)) {
            return [];
        }
        var fetchArgs = this.getFetchArgs(options);
        var response = syncFetch.apply(void 0, __spreadArray([], __read(fetchArgs), false));
        var _a = response.json(), data = _a.data, errors = _a.errors;
        if (errors) {
            throw new AggregateError(errors, 'Introspection from Apollo Engine failed');
        }
        var source = parseGraphQLSDL(pointer, data.service.schema.document, options);
        return [source];
    };
    return ApolloEngineLoader;
}());
export { ApolloEngineLoader };
/**
 * @internal
 */
export var SCHEMA_QUERY = /* GraphQL */ "\n  query GetSchemaByTag($tag: String!, $id: ID!) {\n    service(id: $id) {\n      ... on Service {\n        __typename\n        schema(tag: $tag) {\n          document\n        }\n      }\n    }\n  }\n";
