import { __awaiter, __generator, __read, __values } from "tslib";
import { readDefinition } from './yaml';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import * as path from 'path';
// eslint-disable-next-line
// @ts-ignore
import jwt from 'jsonwebtoken';
import { Cluster } from './Cluster';
import chalk from 'chalk';
import { replaceYamlValue } from './utils/yamlComment';
import { parseEndpoint } from './utils/parseEndpoint';
var PrismaDefinitionClass = /** @class */ (function () {
    function PrismaDefinitionClass(env, definitionPath, envVars, out) {
        if (envVars === void 0) { envVars = process.env; }
        this.secrets = null;
        this.definitionPath = definitionPath;
        if (definitionPath) {
            this.definitionDir = path.dirname(definitionPath);
        }
        this.env = env;
        this.out = out;
        this.envVars = envVars;
    }
    PrismaDefinitionClass.prototype.load = function (args, envPath, graceful) {
        return __awaiter(this, void 0, void 0, function () {
            var flagPath;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!args['project']) return [3 /*break*/, 2];
                        flagPath = path.resolve(String(args['project']));
                        try {
                            fs.accessSync(flagPath);
                        }
                        catch (_b) {
                            throw new Error("Prisma definition path specified by --project '" + flagPath + "' does not exist");
                        }
                        this.definitionPath = flagPath;
                        this.definitionDir = path.dirname(flagPath);
                        return [4 /*yield*/, this.loadDefinition(args, graceful)];
                    case 1:
                        _a.sent();
                        this.validate();
                        return [2 /*return*/];
                    case 2:
                        if (envPath) {
                            try {
                                fs.accessSync(envPath);
                            }
                            catch (_c) {
                                envPath = path.join(process.cwd(), envPath);
                            }
                            try {
                                fs.accessSync(envPath);
                            }
                            catch (_d) {
                                throw new Error("--env-file path '" + envPath + "' does not exist");
                            }
                        }
                        dotenv.config({ path: envPath });
                        if (!this.definitionPath) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.loadDefinition(args, graceful)];
                    case 3:
                        _a.sent();
                        this.validate();
                        return [3 /*break*/, 5];
                    case 4: throw new Error("Couldn\u2019t find `prisma.yml` file. Are you in the right directory?");
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    PrismaDefinitionClass.prototype.loadDefinition = function (args, graceful) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, definition, rawJson, secrets;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, readDefinition(this.definitionPath, args, this.out, this.envVars, graceful)];
                    case 1:
                        _a = _b.sent(), definition = _a.definition, rawJson = _a.rawJson;
                        this.rawEndpoint = rawJson.endpoint;
                        this.definition = definition;
                        this.rawJson = rawJson;
                        this.definitionString = fs.readFileSync(this.definitionPath, 'utf-8');
                        this.typesString = this.getTypesString(this.definition);
                        secrets = this.definition.secret;
                        this.secrets = secrets ? secrets.replace(/\s/g, '').split(',') : null;
                        return [2 /*return*/];
                }
            });
        });
    };
    Object.defineProperty(PrismaDefinitionClass.prototype, "endpoint", {
        get: function () {
            return (this.definition && this.definition.endpoint) || process.env['PRISMA_MANAGEMENT_API_ENDPOINT'];
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(PrismaDefinitionClass.prototype, "clusterBaseUrl", {
        get: function () {
            if (!this.definition || !this.endpoint) {
                return undefined;
            }
            var clusterBaseUrl = parseEndpoint(this.endpoint).clusterBaseUrl;
            return clusterBaseUrl;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(PrismaDefinitionClass.prototype, "service", {
        get: function () {
            if (!this.definition) {
                return undefined;
            }
            if (!this.endpoint) {
                return undefined;
            }
            var service = parseEndpoint(this.endpoint).service;
            return service;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(PrismaDefinitionClass.prototype, "stage", {
        get: function () {
            if (!this.definition) {
                return undefined;
            }
            if (!this.endpoint) {
                return undefined;
            }
            var stage = parseEndpoint(this.endpoint).stage;
            return stage;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(PrismaDefinitionClass.prototype, "cluster", {
        get: function () {
            if (!this.definition) {
                return undefined;
            }
            if (!this.endpoint) {
                return undefined;
            }
            var clusterName = parseEndpoint(this.endpoint).clusterName;
            return clusterName;
        },
        enumerable: false,
        configurable: true
    });
    PrismaDefinitionClass.prototype.validate = function () {
        // shared clusters need a workspace
        var clusterName = this.getClusterName();
        var cluster = this.env.clusterByName(clusterName);
        if (this.definition &&
            clusterName &&
            cluster &&
            cluster.shared &&
            !cluster.isPrivate &&
            !this.getWorkspace() &&
            clusterName !== 'shared-public-demo') {
            throw new Error("Your `cluster` property in the prisma.yml is missing the workspace slug.\nMake sure that your `cluster` property looks like this: " + chalk.bold('<workspace>/<cluster-name>') + ". You can also remove the cluster property from the prisma.yml\nand execute " + chalk.bold.green('prisma deploy') + " again, to get that value auto-filled.");
        }
        if (this.definition &&
            this.definition.endpoint &&
            clusterName &&
            cluster &&
            cluster.shared &&
            !cluster.isPrivate &&
            !this.getWorkspace() &&
            clusterName !== 'shared-public-demo') {
            throw new Error("The provided endpoint " + this.definition.endpoint + " points to a demo cluster, but is missing the workspace slug. A valid demo endpoint looks like this: https://eu1.prisma.sh/myworkspace/service-name/stage-name");
        }
        if (this.definition && this.definition.endpoint && !this.definition.endpoint.startsWith('http')) {
            throw new Error(chalk.bold(this.definition.endpoint) + " is not a valid endpoint. It must start with http:// or https://");
        }
    };
    PrismaDefinitionClass.prototype.getToken = function (serviceName, stageName) {
        if (this.secrets) {
            var data = {
                data: {
                    service: serviceName + "@" + stageName,
                    roles: ['admin'],
                },
            };
            return jwt.sign(data, this.secrets[0], {
                expiresIn: '7d',
            });
        }
        return undefined;
    };
    PrismaDefinitionClass.prototype.getCluster = function (_) {
        if (_ === void 0) { _ = false; }
        return __awaiter(this, void 0, void 0, function () {
            var clusterData, cluster;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(this.definition && this.endpoint)) return [3 /*break*/, 2];
                        clusterData = parseEndpoint(this.endpoint);
                        return [4 /*yield*/, this.getClusterByEndpoint(clusterData)];
                    case 1:
                        cluster = _a.sent();
                        this.env.removeCluster(clusterData.clusterName);
                        this.env.addCluster(cluster);
                        return [2 /*return*/, cluster];
                    case 2: return [2 /*return*/, undefined];
                }
            });
        });
    };
    PrismaDefinitionClass.prototype.findClusterByBaseUrl = function (baseUrl) {
        var _a;
        return (_a = this.env.clusters) === null || _a === void 0 ? void 0 : _a.find(function (c) { return c.baseUrl.toLowerCase() === baseUrl; });
    };
    PrismaDefinitionClass.prototype.getClusterByEndpoint = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var cluster, clusterName, clusterBaseUrl, isPrivate, local, shared, workspaceSlug, cluster;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (data.clusterBaseUrl && !process.env['PRISMA_MANAGEMENT_API_SECRET']) {
                            cluster = this.findClusterByBaseUrl(data.clusterBaseUrl);
                            if (cluster) {
                                return [2 /*return*/, cluster];
                            }
                        }
                        clusterName = data.clusterName, clusterBaseUrl = data.clusterBaseUrl, isPrivate = data.isPrivate, local = data.local, shared = data.shared, workspaceSlug = data.workspaceSlug;
                        if (!!local) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.env.fetchClusters()];
                    case 1:
                        _a.sent();
                        cluster = this.findClusterByBaseUrl(data.clusterBaseUrl);
                        if (cluster) {
                            return [2 /*return*/, cluster];
                        }
                        _a.label = 2;
                    case 2: return [2 /*return*/, new Cluster(this.out, clusterName, clusterBaseUrl, shared || isPrivate ? this.env.cloudSessionKey : undefined, local, shared, isPrivate, workspaceSlug)];
                }
            });
        });
    };
    PrismaDefinitionClass.prototype.getTypesString = function (definition) {
        var e_1, _a;
        var typesPaths = definition.datamodel
            ? Array.isArray(definition.datamodel)
                ? definition.datamodel
                : [definition.datamodel]
            : [];
        var allTypes = '';
        try {
            for (var typesPaths_1 = __values(typesPaths), typesPaths_1_1 = typesPaths_1.next(); !typesPaths_1_1.done; typesPaths_1_1 = typesPaths_1.next()) {
                var unresolvedTypesPath = typesPaths_1_1.value;
                var typesPath = path.join(this.definitionDir, unresolvedTypesPath);
                try {
                    fs.accessSync(typesPath);
                    var types = fs.readFileSync(typesPath, 'utf-8');
                    allTypes += types + '\n';
                }
                catch (_b) {
                    throw new Error("The types definition file \"" + typesPath + "\" could not be found.");
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (typesPaths_1_1 && !typesPaths_1_1.done && (_a = typesPaths_1.return)) _a.call(typesPaths_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return allTypes;
    };
    PrismaDefinitionClass.prototype.getClusterName = function () {
        return this.cluster || null;
    };
    PrismaDefinitionClass.prototype.getWorkspace = function () {
        if (this.definition && this.endpoint) {
            var workspaceSlug = parseEndpoint(this.endpoint).workspaceSlug;
            if (workspaceSlug) {
                return workspaceSlug;
            }
        }
        return null;
    };
    PrismaDefinitionClass.prototype.getDeployName = function () {
        return __awaiter(this, void 0, void 0, function () {
            var cluster;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getCluster()];
                    case 1:
                        cluster = _a.sent();
                        return [2 /*return*/, concatName(cluster, this.service, this.getWorkspace())];
                }
            });
        });
    };
    PrismaDefinitionClass.prototype.getSubscriptions = function () {
        var _this = this;
        if (this.definition && this.definition.subscriptions) {
            return Object.entries(this.definition.subscriptions).map(function (_a) {
                var _b = __read(_a, 2), name = _b[0], subscription = _b[1];
                var url = typeof subscription.webhook === 'string' ? subscription.webhook : subscription.webhook.url;
                var headers = typeof subscription.webhook === 'string' ? [] : transformHeaders(subscription.webhook.headers);
                var query = subscription.query;
                if (subscription.query.endsWith('.graphql')) {
                    var queryPath = path.join(_this.definitionDir, subscription.query);
                    try {
                        fs.accessSync(queryPath);
                    }
                    catch (_c) {
                        throw new Error("Subscription query " + queryPath + " provided in subscription \"" + name + "\" in prisma.yml does not exist.");
                    }
                    query = fs.readFileSync(queryPath, 'utf-8');
                }
                return {
                    name: name,
                    query: query,
                    headers: headers,
                    url: url,
                };
            });
        }
        return [];
    };
    PrismaDefinitionClass.prototype.replaceEndpoint = function (newEndpoint) {
        this.definitionString = replaceYamlValue(this.definitionString, 'endpoint', newEndpoint);
        fs.writeFileSync(this.definitionPath, this.definitionString);
    };
    PrismaDefinitionClass.prototype.addDatamodel = function (datamodel) {
        this.definitionString += "\ndatamodel: " + datamodel;
        fs.writeFileSync(this.definitionPath, this.definitionString);
        this.definition.datamodel = datamodel;
    };
    PrismaDefinitionClass.prototype.getEndpoint = function (serviceInput, stageInput) {
        return __awaiter(this, void 0, void 0, function () {
            var cluster, service, stage, workspace;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getCluster()];
                    case 1:
                        cluster = _a.sent();
                        service = serviceInput || this.service;
                        stage = stageInput || this.stage;
                        workspace = this.getWorkspace();
                        if (service && stage && cluster) {
                            return [2 /*return*/, cluster.getApiEndpoint(service, stage, workspace)];
                        }
                        return [2 /*return*/, null];
                }
            });
        });
    };
    PrismaDefinitionClass.prototype.getHooks = function (hookType) {
        if (this.definition && this.definition.hooks && this.definition.hooks[hookType]) {
            var hooks = this.definition.hooks[hookType];
            if (typeof hooks !== 'string' && !Array.isArray(hooks)) {
                throw new Error("Hook " + hookType + " provided in prisma.yml must be string or an array of strings.");
            }
            return typeof hooks === 'string' ? [hooks] : hooks;
        }
        return [];
    };
    return PrismaDefinitionClass;
}());
export { PrismaDefinitionClass };
export function concatName(cluster, name, workspace) {
    if (cluster.shared) {
        var workspaceString = workspace ? workspace + "~" : '';
        return "" + workspaceString + name;
    }
    return name;
}
function transformHeaders(headers) {
    if (!headers) {
        return [];
    }
    return Object.entries(headers).map(function (_a) {
        var _b = __read(_a, 2), name = _b[0], value = _b[1];
        return ({ name: name, value: value });
    });
}
