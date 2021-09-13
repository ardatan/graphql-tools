import { __assign, __awaiter, __generator, __read } from "tslib";
/* eslint-disable no-case-declarations */
/// <reference lib="dom" />
import { print, buildASTSchema, buildSchema, getOperationAST } from 'graphql';
import { observableToAsyncIterable, isAsyncIterable, mapAsyncIterator, withCancel, parseGraphQLSDL, } from '@graphql-tools/utils';
import { isWebUri } from 'valid-url';
import { fetch as crossFetch } from 'cross-fetch';
import { introspectSchema, wrapSchema } from '@graphql-tools/wrap';
import { createClient } from 'graphql-ws';
import WebSocket from 'isomorphic-ws';
import syncFetchImported from 'sync-fetch';
import isPromise from 'is-promise';
import { extractFiles, isExtractableFile } from 'extract-files';
import FormData from 'form-data';
import { fetchEventSource } from '@ardatan/fetch-event-source';
import { SubscriptionClient as LegacySubscriptionClient } from 'subscriptions-transport-ws';
import AbortController from 'abort-controller';
import { meros } from 'meros';
import _ from 'lodash';
import { ValueOrPromise } from 'value-or-promise';
import { isLiveQueryOperationDefinitionNode } from '@n1ru4l/graphql-live-query';
var syncFetch = function (input, init) {
    if (typeof input === 'string') {
        init === null || init === void 0 ? true : delete init.signal;
    }
    else {
        delete input.signal;
    }
    return syncFetchImported(input, init);
};
var asyncImport = function (moduleName) { return import(moduleName); };
var syncImport = function (moduleName) { return require(moduleName); };
export var SubscriptionProtocol;
(function (SubscriptionProtocol) {
    SubscriptionProtocol["WS"] = "WS";
    /**
     * Use legacy web socket protocol `graphql-ws` instead of the more current standard `graphql-transport-ws`
     */
    SubscriptionProtocol["LEGACY_WS"] = "LEGACY_WS";
    /**
     * Use SSE for subscription instead of WebSocket
     */
    SubscriptionProtocol["SSE"] = "SSE";
})(SubscriptionProtocol || (SubscriptionProtocol = {}));
var isCompatibleUri = function (uri) {
    if (isWebUri(uri)) {
        return true;
    }
    // we just replace the url part, the remaining validation is the same
    var wsUri = uri.replace('wss://', 'http://').replace('ws://', 'http://');
    return !!isWebUri(wsUri);
};
/**
 * This loader loads a schema from a URL. The loaded schema is a fully-executable,
 * remote schema since it's created using [@graphql-tools/wrap](/docs/remote-schemas).
 *
 * ```
 * const schema = await loadSchema('http://localhost:3000/graphql', {
 *   loaders: [
 *     new UrlLoader(),
 *   ]
 * });
 * ```
 */
var UrlLoader = /** @class */ (function () {
    function UrlLoader() {
    }
    UrlLoader.prototype.canLoad = function (pointer, options) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.canLoadSync(pointer, options)];
            });
        });
    };
    UrlLoader.prototype.canLoadSync = function (pointer, _options) {
        return isCompatibleUri(pointer);
    };
    UrlLoader.prototype.createFormDataFromVariables = function (_a) {
        var query = _a.query, variables = _a.variables, operationName = _a.operationName, extensions = _a.extensions;
        var vars = Object.assign({}, variables);
        var _b = extractFiles(vars, 'variables', (function (v) { return isExtractableFile(v) || (v === null || v === void 0 ? void 0 : v.promise) || isAsyncIterable(v) || isPromise(v); })), clone = _b.clone, files = _b.files;
        var map = Array.from(files.values()).reduce(function (prev, curr, currIndex) {
            prev[currIndex] = curr;
            return prev;
        }, {});
        var uploads = new Map(Array.from(files.keys()).map(function (u, i) { return [i, u]; }));
        var form = new FormData();
        form.append('operations', JSON.stringify({
            query: query,
            variables: clone,
            operationName: operationName,
            extensions: extensions,
        }));
        form.append('map', JSON.stringify(map));
        return ValueOrPromise.all(Array.from(uploads.entries()).map(function (params) {
            return new ValueOrPromise(function () {
                var _a = __read(params, 2), i = _a[0], u$ = _a[1];
                return new ValueOrPromise(function () { return u$; }).then(function (u) { return [i, u]; }).resolve();
            }).then(function (_a) {
                var _b = __read(_a, 2), i = _b[0], u = _b[1];
                if (u === null || u === void 0 ? void 0 : u.promise) {
                    return u.promise.then(function (upload) {
                        var stream = upload.createReadStream();
                        form.append(i.toString(), stream, {
                            filename: upload.filename,
                            contentType: upload.mimetype,
                        });
                    });
                }
                else {
                    form.append(i.toString(), u, {
                        filename: 'name' in u ? u['name'] : i,
                        contentType: u.type,
                    });
                }
            });
        }))
            .then(function () { return form; })
            .resolve();
    };
    UrlLoader.prototype.prepareGETUrl = function (_a) {
        var baseUrl = _a.baseUrl, query = _a.query, variables = _a.variables, operationName = _a.operationName, extensions = _a.extensions;
        var HTTP_URL = switchProtocols(baseUrl, {
            wss: 'https',
            ws: 'http',
        });
        var dummyHostname = 'https://dummyhostname.com';
        var validUrl = HTTP_URL.startsWith('http')
            ? HTTP_URL
            : HTTP_URL.startsWith('/')
                ? "" + dummyHostname + HTTP_URL
                : dummyHostname + "/" + HTTP_URL;
        var urlObj = new URL(validUrl);
        urlObj.searchParams.set('query', query);
        if (variables && Object.keys(variables).length > 0) {
            urlObj.searchParams.set('variables', JSON.stringify(variables));
        }
        if (operationName) {
            urlObj.searchParams.set('operationName', operationName);
        }
        if (extensions) {
            urlObj.searchParams.set('extensions', JSON.stringify(extensions));
        }
        var finalUrl = urlObj.toString().replace(dummyHostname, '');
        return finalUrl;
    };
    UrlLoader.prototype.buildHTTPExecutor = function (endpoint, fetch, options) {
        var _this = this;
        var defaultMethod = this.getDefaultMethodFromOptions(options === null || options === void 0 ? void 0 : options.method, 'POST');
        var HTTP_URL = switchProtocols(endpoint, {
            wss: 'https',
            ws: 'http',
        });
        var executor = function (_a) {
            var document = _a.document, variables = _a.variables, operationName = _a.operationName, extensions = _a.extensions, operationType = _a.operationType;
            var controller = new AbortController();
            var method = defaultMethod;
            if (options === null || options === void 0 ? void 0 : options.useGETForQueries) {
                if (operationType === 'query') {
                    method = 'GET';
                }
                else {
                    method = defaultMethod;
                }
            }
            var headers = Object.assign({}, options === null || options === void 0 ? void 0 : options.headers, (extensions === null || extensions === void 0 ? void 0 : extensions.headers) || {});
            return new ValueOrPromise(function () {
                var query = print(document);
                switch (method) {
                    case 'GET':
                        var finalUrl = _this.prepareGETUrl({ baseUrl: endpoint, query: query, variables: variables, operationName: operationName, extensions: extensions });
                        return fetch(finalUrl, {
                            method: 'GET',
                            credentials: 'include',
                            headers: __assign({ accept: 'application/json' }, headers),
                        });
                    case 'POST':
                        if (options === null || options === void 0 ? void 0 : options.multipart) {
                            return new ValueOrPromise(function () {
                                return _this.createFormDataFromVariables({ query: query, variables: variables, operationName: operationName, extensions: extensions });
                            })
                                .then(function (form) {
                                return fetch(HTTP_URL, {
                                    method: 'POST',
                                    credentials: 'include',
                                    body: form,
                                    headers: __assign({ accept: 'application/json' }, headers),
                                    signal: controller.signal,
                                });
                            })
                                .resolve();
                        }
                        else {
                            return fetch(HTTP_URL, {
                                method: 'POST',
                                credentials: 'include',
                                body: JSON.stringify({
                                    query: query,
                                    variables: variables,
                                    operationName: operationName,
                                    extensions: extensions,
                                }),
                                headers: __assign({ accept: 'application/json, multipart/mixed', 'content-type': 'application/json' }, headers),
                                signal: controller.signal,
                            });
                        }
                }
            })
                .then(function (fetchResult) {
                var response = {};
                var contentType = fetchResult.headers.get
                    ? fetchResult.headers.get('content-type')
                    : fetchResult['content-type'];
                if (contentType === null || contentType === void 0 ? void 0 : contentType.includes('multipart/mixed')) {
                    return meros(fetchResult).then(function (maybeStream) {
                        if (isAsyncIterable(maybeStream)) {
                            return withCancel(mapAsyncIterator(maybeStream, function (part) {
                                if (part.json) {
                                    var chunk = part.body;
                                    if (chunk.path) {
                                        if (chunk.data) {
                                            var path = ['data'];
                                            _.merge(response, _.set({}, path.concat(chunk.path), chunk.data));
                                        }
                                        if (chunk.errors) {
                                            response.errors = (response.errors || []).concat(chunk.errors);
                                        }
                                    }
                                    else {
                                        if (chunk.data) {
                                            response.data = chunk.data;
                                        }
                                        if (chunk.errors) {
                                            response.errors = chunk.errors;
                                        }
                                    }
                                    return response;
                                }
                            }), function () { return controller.abort(); });
                        }
                        else {
                            return maybeStream.json();
                        }
                    });
                }
                return fetchResult.json();
            })
                .resolve();
        };
        return executor;
    };
    UrlLoader.prototype.buildWSExecutor = function (subscriptionsEndpoint, webSocketImpl, connectionParams) {
        var _this = this;
        var WS_URL = switchProtocols(subscriptionsEndpoint, {
            https: 'wss',
            http: 'ws',
        });
        var subscriptionClient = createClient({
            url: WS_URL,
            webSocketImpl: webSocketImpl,
            connectionParams: connectionParams,
            lazy: true,
        });
        return function (_a) {
            var document = _a.document, variables = _a.variables, operationName = _a.operationName, extensions = _a.extensions;
            return __awaiter(_this, void 0, void 0, function () {
                var query;
                return __generator(this, function (_b) {
                    query = print(document);
                    return [2 /*return*/, observableToAsyncIterable({
                            subscribe: function (observer) {
                                var unsubscribe = subscriptionClient.subscribe({
                                    query: query,
                                    variables: variables,
                                    operationName: operationName,
                                    extensions: extensions,
                                }, observer);
                                return {
                                    unsubscribe: unsubscribe,
                                };
                            },
                        })];
                });
            });
        };
    };
    UrlLoader.prototype.buildWSLegacyExecutor = function (subscriptionsEndpoint, webSocketImpl, connectionParams) {
        var _this = this;
        var WS_URL = switchProtocols(subscriptionsEndpoint, {
            https: 'wss',
            http: 'ws',
        });
        var subscriptionClient = new LegacySubscriptionClient(WS_URL, {
            connectionParams: connectionParams,
            lazy: true,
        }, webSocketImpl);
        return function (_a) {
            var document = _a.document, variables = _a.variables, operationName = _a.operationName;
            return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_b) {
                    return [2 /*return*/, observableToAsyncIterable(subscriptionClient.request({
                            query: document,
                            variables: variables,
                            operationName: operationName,
                        }))];
                });
            });
        };
    };
    UrlLoader.prototype.buildSSEExecutor = function (endpoint, fetch, options) {
        var _this = this;
        return function (_a) {
            var document = _a.document, variables = _a.variables, extensions = _a.extensions, operationName = _a.operationName;
            return __awaiter(_this, void 0, void 0, function () {
                var controller, query, finalUrl;
                var _this = this;
                return __generator(this, function (_b) {
                    controller = new AbortController();
                    query = print(document);
                    finalUrl = this.prepareGETUrl({ baseUrl: endpoint, query: query, variables: variables, operationName: operationName, extensions: extensions });
                    return [2 /*return*/, observableToAsyncIterable({
                            subscribe: function (observer) {
                                var headers = Object.assign({}, (options === null || options === void 0 ? void 0 : options.headers) || {}, (extensions === null || extensions === void 0 ? void 0 : extensions.headers) || {});
                                fetchEventSource(finalUrl, __assign({ credentials: 'include', headers: headers, method: 'GET', onerror: function (error) {
                                        observer.error(error);
                                    }, onmessage: function (event) {
                                        observer.next(JSON.parse(event.data || '{}'));
                                    }, onopen: function (response) { return __awaiter(_this, void 0, void 0, function () {
                                        var contentType, error, errors, error_1;
                                        return __generator(this, function (_a) {
                                            switch (_a.label) {
                                                case 0:
                                                    contentType = response.headers.get('content-type');
                                                    if (!!(contentType === null || contentType === void 0 ? void 0 : contentType.startsWith('text/event-stream'))) return [3 /*break*/, 5];
                                                    error = void 0;
                                                    _a.label = 1;
                                                case 1:
                                                    _a.trys.push([1, 3, , 4]);
                                                    return [4 /*yield*/, response.json()];
                                                case 2:
                                                    errors = (_a.sent()).errors;
                                                    error = errors[0];
                                                    return [3 /*break*/, 4];
                                                case 3:
                                                    error_1 = _a.sent();
                                                    return [3 /*break*/, 4];
                                                case 4:
                                                    if (error) {
                                                        throw error;
                                                    }
                                                    throw new Error("Expected content-type to be " + 'text/event-stream' + " but got \"" + contentType + "\".");
                                                case 5: return [2 /*return*/];
                                            }
                                        });
                                    }); }, fetch: fetch, signal: controller.signal }, ((options === null || options === void 0 ? void 0 : options.eventSourceOptions) || {})));
                                return {
                                    unsubscribe: function () { return controller.abort(); },
                                };
                            },
                        })];
                });
            });
        };
    };
    UrlLoader.prototype.getFetch = function (customFetch, importFn) {
        if (customFetch) {
            if (typeof customFetch === 'string') {
                var _a = __read(customFetch.split('#'), 2), moduleName_1 = _a[0], fetchFnName_1 = _a[1];
                return new ValueOrPromise(function () { return importFn(moduleName_1); })
                    .then(function (module) { return (fetchFnName_1 ? module[fetchFnName_1] : module); })
                    .resolve();
            }
            else {
                return customFetch;
            }
        }
        if (importFn === asyncImport) {
            if (typeof fetch === 'undefined') {
                return crossFetch;
            }
            return fetch;
        }
        else {
            return syncFetch;
        }
    };
    UrlLoader.prototype.getDefaultMethodFromOptions = function (method, defaultMethod) {
        if (method) {
            defaultMethod = method;
        }
        return defaultMethod;
    };
    UrlLoader.prototype.getWebSocketImpl = function (importFn, options) {
        if (typeof (options === null || options === void 0 ? void 0 : options.webSocketImpl) === 'string') {
            var _a = __read(options.webSocketImpl.split('#'), 2), moduleName_2 = _a[0], webSocketImplName_1 = _a[1];
            return new ValueOrPromise(function () { return importFn(moduleName_2); })
                .then(function (importedModule) { return (webSocketImplName_1 ? importedModule[webSocketImplName_1] : importedModule); })
                .resolve();
        }
        else {
            var websocketImpl = (options === null || options === void 0 ? void 0 : options.webSocketImpl) || WebSocket;
            return websocketImpl;
        }
    };
    UrlLoader.prototype.buildSubscriptionExecutor = function (subscriptionsEndpoint, fetch, options) {
        return __awaiter(this, void 0, void 0, function () {
            var webSocketImpl, connectionParams;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!((options === null || options === void 0 ? void 0 : options.subscriptionsProtocol) === SubscriptionProtocol.SSE)) return [3 /*break*/, 1];
                        return [2 /*return*/, this.buildSSEExecutor(subscriptionsEndpoint, fetch, options)];
                    case 1: return [4 /*yield*/, this.getWebSocketImpl(asyncImport, options)];
                    case 2:
                        webSocketImpl = _a.sent();
                        connectionParams = function () { return ({ headers: options === null || options === void 0 ? void 0 : options.headers }); };
                        if ((options === null || options === void 0 ? void 0 : options.subscriptionsProtocol) === SubscriptionProtocol.LEGACY_WS) {
                            return [2 /*return*/, this.buildWSLegacyExecutor(subscriptionsEndpoint, webSocketImpl, connectionParams)];
                        }
                        else {
                            return [2 /*return*/, this.buildWSExecutor(subscriptionsEndpoint, webSocketImpl, connectionParams)];
                        }
                        _a.label = 3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    UrlLoader.prototype.getExecutorAsync = function (endpoint, options) {
        return __awaiter(this, void 0, void 0, function () {
            var fetch, httpExecutor, subscriptionsEndpoint, subscriptionExecutor;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getFetch(options === null || options === void 0 ? void 0 : options.customFetch, asyncImport)];
                    case 1:
                        fetch = _a.sent();
                        httpExecutor = this.buildHTTPExecutor(endpoint, fetch, options);
                        subscriptionsEndpoint = (options === null || options === void 0 ? void 0 : options.subscriptionsEndpoint) || endpoint;
                        return [4 /*yield*/, this.buildSubscriptionExecutor(subscriptionsEndpoint, fetch, options)];
                    case 2:
                        subscriptionExecutor = _a.sent();
                        return [2 /*return*/, function (params) {
                                var operationAst = getOperationAST(params.document, params.operationName);
                                if (!operationAst) {
                                    throw new Error("No valid operations found: " + (params.operationName || ''));
                                }
                                if (params.operationType === 'subscription' ||
                                    isLiveQueryOperationDefinitionNode(operationAst, params.variables)) {
                                    return subscriptionExecutor(params);
                                }
                                return httpExecutor(params);
                            }];
                }
            });
        });
    };
    UrlLoader.prototype.getExecutorSync = function (endpoint, options) {
        var fetch = this.getFetch(options === null || options === void 0 ? void 0 : options.customFetch, syncImport);
        var executor = this.buildHTTPExecutor(endpoint, fetch, options);
        return executor;
    };
    UrlLoader.prototype.handleSDL = function (pointer, fetch, options) {
        var defaultMethod = this.getDefaultMethodFromOptions(options === null || options === void 0 ? void 0 : options.method, 'GET');
        return new ValueOrPromise(function () {
            return fetch(pointer, {
                method: defaultMethod,
                headers: options.headers,
            });
        })
            .then(function (response) { return response.text(); })
            .then(function (schemaString) { return parseGraphQLSDL(pointer, schemaString, options); })
            .resolve();
    };
    UrlLoader.prototype.load = function (pointer, options) {
        return __awaiter(this, void 0, void 0, function () {
            var source, fetch, executor, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.canLoad(pointer, options)];
                    case 1:
                        if (!(_b.sent())) {
                            return [2 /*return*/, []];
                        }
                        source = {
                            location: pointer,
                        };
                        return [4 /*yield*/, this.getFetch(options === null || options === void 0 ? void 0 : options.customFetch, asyncImport)];
                    case 2:
                        fetch = _b.sent();
                        return [4 /*yield*/, this.getExecutorAsync(pointer, options)];
                    case 3:
                        executor = _b.sent();
                        if (!((options === null || options === void 0 ? void 0 : options.handleAsSDL) || pointer.endsWith('.graphql'))) return [3 /*break*/, 5];
                        return [4 /*yield*/, this.handleSDL(pointer, fetch, options)];
                    case 4:
                        source = _b.sent();
                        if (!source.schema && !source.document && !source.rawSDL) {
                            throw new Error("Invalid SDL response");
                        }
                        source.schema =
                            source.schema ||
                                (source.document
                                    ? buildASTSchema(source.document, options)
                                    : source.rawSDL
                                        ? buildSchema(source.rawSDL, options)
                                        : undefined);
                        return [3 /*break*/, 7];
                    case 5:
                        _a = source;
                        return [4 /*yield*/, introspectSchema(executor, {}, options)];
                    case 6:
                        _a.schema = _b.sent();
                        _b.label = 7;
                    case 7:
                        if (!source.schema) {
                            throw new Error("Invalid introspected schema");
                        }
                        if (!(options === null || options === void 0 ? void 0 : options.endpoint)) return [3 /*break*/, 9];
                        return [4 /*yield*/, this.getExecutorAsync(options.endpoint, options)];
                    case 8:
                        executor = _b.sent();
                        _b.label = 9;
                    case 9:
                        source.schema = wrapSchema({
                            schema: source.schema,
                            executor: executor,
                        });
                        return [2 /*return*/, [source]];
                }
            });
        });
    };
    UrlLoader.prototype.loadSync = function (pointer, options) {
        if (!this.canLoadSync(pointer, options)) {
            return [];
        }
        var source = {
            location: pointer,
        };
        var fetch = this.getFetch(options === null || options === void 0 ? void 0 : options.customFetch, syncImport);
        var executor = this.getExecutorSync(pointer, options);
        if ((options === null || options === void 0 ? void 0 : options.handleAsSDL) || pointer.endsWith('.graphql')) {
            source = this.handleSDL(pointer, fetch, options);
            if (!source.schema && !source.document && !source.rawSDL) {
                throw new Error("Invalid SDL response");
            }
            source.schema =
                source.schema ||
                    (source.document
                        ? buildASTSchema(source.document, options)
                        : source.rawSDL
                            ? buildSchema(source.rawSDL, options)
                            : undefined);
        }
        else {
            source.schema = introspectSchema(executor, {}, options);
        }
        if (!source.schema) {
            throw new Error("Invalid introspected schema");
        }
        if (options === null || options === void 0 ? void 0 : options.endpoint) {
            executor = this.getExecutorSync(options.endpoint, options);
        }
        source.schema = wrapSchema({
            schema: source.schema,
            executor: executor,
        });
        return [source];
    };
    return UrlLoader;
}());
export { UrlLoader };
function switchProtocols(pointer, protocolMap) {
    return Object.entries(protocolMap).reduce(function (prev, _a) {
        var _b = __read(_a, 2), source = _b[0], target = _b[1];
        return prev.replace(source + "://", target + "://").replace(source + ":\\", target + ":\\");
    }, pointer);
}
