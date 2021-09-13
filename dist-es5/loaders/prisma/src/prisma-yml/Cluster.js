import { __awaiter, __generator } from "tslib";
import 'isomorphic-fetch';
import jwt from 'jsonwebtoken';
import { cloudApiEndpoint } from './constants';
import { GraphQLClient } from 'graphql-request';
import chalk from 'chalk';
import { getProxyAgent } from './utils/getProxyAgent';
import debugPkg from 'debug';
var debug = debugPkg('Environment');
var Cluster = /** @class */ (function () {
    function Cluster(out, name, baseUrl, clusterSecret, local, shared, isPrivate, workspaceSlug) {
        if (local === void 0) { local = true; }
        if (shared === void 0) { shared = false; }
        if (isPrivate === void 0) { isPrivate = false; }
        this.out = out;
        this.name = name;
        // All `baseUrl` extension points in this class
        // adds a trailing slash. Here we remove it from
        // the passed `baseUrl` in order to avoid double
        // slashes.
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.clusterSecret = clusterSecret;
        this.local = local;
        this.shared = shared;
        this.isPrivate = isPrivate;
        this.workspaceSlug = workspaceSlug;
        this.hasOldDeployEndpoint = false;
    }
    Cluster.prototype.getToken = function (serviceName, workspaceSlug, stageName) {
        return __awaiter(this, void 0, void 0, function () {
            var needsAuth;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.needsAuth()];
                    case 1:
                        needsAuth = _a.sent();
                        debug({ needsAuth: needsAuth });
                        if (!needsAuth) {
                            return [2 /*return*/, null];
                        }
                        if (this.name === 'shared-public-demo') {
                            return [2 /*return*/, ''];
                        }
                        if (this.isPrivate && process.env['PRISMA_MANAGEMENT_API_SECRET']) {
                            return [2 /*return*/, this.getLocalToken()];
                        }
                        if (this.shared || (this.isPrivate && !process.env['PRISMA_MANAGEMENT_API_SECRET'])) {
                            return [2 /*return*/, this.generateClusterToken(serviceName, workspaceSlug, stageName)];
                        }
                        else {
                            return [2 /*return*/, this.getLocalToken()];
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    Cluster.prototype.getLocalToken = function () {
        if (!this.clusterSecret && !process.env['PRISMA_MANAGEMENT_API_SECRET']) {
            return null;
        }
        if (!this.cachedToken) {
            var grants = [{ target: "*/*", action: '*' }];
            var secret = process.env['PRISMA_MANAGEMENT_API_SECRET'] || this.clusterSecret;
            if (!secret) {
                throw new Error("Could not generate token for cluster " + chalk.bold(this.getDeployEndpoint()) + ". Did you provide the env var PRISMA_MANAGEMENT_API_SECRET?");
            }
            try {
                var algorithm = process.env['PRISMA_MANAGEMENT_API_SECRET'] ? 'HS256' : 'RS256';
                this.cachedToken = jwt.sign({ grants: grants }, secret, {
                    expiresIn: '5y',
                    algorithm: algorithm,
                });
            }
            catch (e) {
                throw new Error("Could not generate token for cluster " + chalk.bold(this.getDeployEndpoint()) + ".\nOriginal error: " + e.message);
            }
        }
        return this.cachedToken;
    };
    Object.defineProperty(Cluster.prototype, "cloudClient", {
        get: function () {
            return new GraphQLClient(cloudApiEndpoint, {
                headers: {
                    Authorization: "Bearer " + this.clusterSecret,
                },
                agent: getProxyAgent(cloudApiEndpoint),
            });
        },
        enumerable: false,
        configurable: true
    });
    Cluster.prototype.generateClusterToken = function (serviceName, workspaceSlug, stageName) {
        if (workspaceSlug === void 0) { workspaceSlug = this.workspaceSlug || '*'; }
        return __awaiter(this, void 0, void 0, function () {
            var query, clusterToken;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = "\n      mutation ($input: GenerateClusterTokenRequest!) {\n        generateClusterToken(input: $input) {\n          clusterToken\n        }\n      }\n    ";
                        return [4 /*yield*/, this.cloudClient.request(query, {
                                input: {
                                    workspaceSlug: workspaceSlug,
                                    clusterName: this.name,
                                    serviceName: serviceName,
                                    stageName: stageName,
                                },
                            })];
                    case 1:
                        clusterToken = (_a.sent()).generateClusterToken.clusterToken;
                        return [2 /*return*/, clusterToken];
                }
            });
        });
    };
    Cluster.prototype.addServiceToCloudDBIfMissing = function (serviceName, workspaceSlug, stageName) {
        if (workspaceSlug === void 0) { workspaceSlug = this.workspaceSlug; }
        return __awaiter(this, void 0, void 0, function () {
            var query, serviceCreated;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        query = "\n      mutation ($input: GenerateClusterTokenRequest!) {\n        addServiceToCloudDBIfMissing(input: $input)\n      }\n    ";
                        return [4 /*yield*/, this.cloudClient.request(query, {
                                input: {
                                    workspaceSlug: workspaceSlug,
                                    clusterName: this.name,
                                    serviceName: serviceName,
                                    stageName: stageName,
                                },
                            })];
                    case 1:
                        serviceCreated = _a.sent();
                        return [2 /*return*/, serviceCreated.addServiceToCloudDBIfMissing];
                }
            });
        });
    };
    Cluster.prototype.getApiEndpoint = function (service, stage, workspaceSlug) {
        if (!this.shared && service === 'default' && stage === 'default') {
            return this.baseUrl;
        }
        if (!this.shared && stage === 'default') {
            return this.baseUrl + "/" + service;
        }
        if (this.isPrivate || this.local) {
            return this.baseUrl + "/" + service + "/" + stage;
        }
        var workspaceString = workspaceSlug ? workspaceSlug + "/" : '';
        return this.baseUrl + "/" + workspaceString + service + "/" + stage;
    };
    Cluster.prototype.getWSEndpoint = function (service, stage, workspaceSlug) {
        return this.getApiEndpoint(service, stage, workspaceSlug).replace(/^http/, 'ws');
    };
    Cluster.prototype.getImportEndpoint = function (service, stage, workspaceSlug) {
        return this.getApiEndpoint(service, stage, workspaceSlug) + "/import";
    };
    Cluster.prototype.getExportEndpoint = function (service, stage, workspaceSlug) {
        return this.getApiEndpoint(service, stage, workspaceSlug) + "/export";
    };
    Cluster.prototype.getDeployEndpoint = function () {
        return this.baseUrl + "/" + (this.hasOldDeployEndpoint ? 'cluster' : 'management');
    };
    Cluster.prototype.isOnline = function () {
        return __awaiter(this, void 0, void 0, function () {
            var version;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getVersion()];
                    case 1:
                        version = _a.sent();
                        return [2 /*return*/, typeof version === 'string'];
                }
            });
        });
    };
    Cluster.prototype.getVersion = function () {
        return __awaiter(this, void 0, void 0, function () {
            var result, res, data, errors, e_1, result, res, data, e_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 5, , 6]);
                        return [4 /*yield*/, this.request("{\n        serverInfo {\n          version\n        }\n      }")];
                    case 1:
                        result = _a.sent();
                        return [4 /*yield*/, result.json()];
                    case 2:
                        res = _a.sent();
                        data = res.data, errors = res.errors;
                        if (!(errors && errors[0].code === 3016 && errors[0].message.includes('management@default'))) return [3 /*break*/, 4];
                        this.hasOldDeployEndpoint = true;
                        return [4 /*yield*/, this.getVersion()];
                    case 3: return [2 /*return*/, _a.sent()];
                    case 4:
                        if (data && data.serverInfo) {
                            return [2 /*return*/, data.serverInfo.version];
                        }
                        return [3 /*break*/, 6];
                    case 5:
                        e_1 = _a.sent();
                        debug(e_1);
                        return [3 /*break*/, 6];
                    case 6:
                        _a.trys.push([6, 9, , 10]);
                        return [4 /*yield*/, this.request("{\n        serverInfo {\n          version\n        }\n      }")];
                    case 7:
                        result = _a.sent();
                        return [4 /*yield*/, result.json()];
                    case 8:
                        res = _a.sent();
                        data = res.data;
                        return [2 /*return*/, data.serverInfo.version];
                    case 9:
                        e_2 = _a.sent();
                        debug(e_2);
                        return [3 /*break*/, 10];
                    case 10: return [2 /*return*/, null];
                }
            });
        });
    };
    Cluster.prototype.request = function (query, variables) {
        return fetch(this.getDeployEndpoint(), {
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: query,
                variables: variables,
            }),
            agent: getProxyAgent(this.getDeployEndpoint()),
        });
    };
    Cluster.prototype.needsAuth = function () {
        return __awaiter(this, void 0, void 0, function () {
            var result, data, e_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.request("{\n        listProjects {\n          name\n        }\n      }")];
                    case 1:
                        result = _a.sent();
                        return [4 /*yield*/, result.json()];
                    case 2:
                        data = _a.sent();
                        if (data.errors && data.errors.length > 0) {
                            return [2 /*return*/, true];
                        }
                        return [2 /*return*/, false];
                    case 3:
                        e_3 = _a.sent();
                        debug('Assuming that the server needs authentication');
                        debug(e_3.toString());
                        return [2 /*return*/, true];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    Cluster.prototype.toJSON = function () {
        return {
            name: this.name,
            baseUrl: this.baseUrl,
            local: this.local,
            clusterSecret: this.clusterSecret,
            shared: this.shared,
            isPrivate: this.isPrivate,
            workspaceSlug: this.workspaceSlug,
        };
    };
    return Cluster;
}());
export { Cluster };
