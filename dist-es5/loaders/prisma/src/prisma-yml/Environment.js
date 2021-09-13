import { __assign, __awaiter, __generator, __read, __spreadArray, __values } from "tslib";
import { Cluster } from './Cluster';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { ClusterNotFound } from './errors/ClusterNotFound';
import { Variables } from './Variables';
import { Output } from './Output';
import * as path from 'path';
import 'isomorphic-fetch';
import { ClusterNotSet } from './errors/ClusterNotSet';
import { clusterEndpointMap } from './constants';
import { getProxyAgent } from './utils/getProxyAgent';
// eslint-disable-next-line
// @ts-ignore
import jwt from 'jsonwebtoken';
import debugPkg from 'debug';
var debug = debugPkg('Environment');
var Environment = /** @class */ (function () {
    function Environment(home, out, version) {
        if (out === void 0) { out = new Output(); }
        this.sharedClusters = ['prisma-eu1', 'prisma-us1'];
        this.clusterEndpointMap = clusterEndpointMap;
        this.globalRC = {};
        this.clustersFetched = false;
        this.out = out;
        this.home = home;
        this.version = version;
        this.rcPath = path.join(this.home, '.prisma/config.yml');
        fs.mkdirSync(path.dirname(this.rcPath), { recursive: true });
    }
    Environment.prototype._getClusters = function () {
        var clusters = this.clusters;
        if (clusters === undefined) {
            throw new Error("Cannot get clusters. Did you forget to call \"Environment.load()\"?");
        }
        return clusters;
    };
    Environment.prototype.load = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.loadGlobalRC()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Object.defineProperty(Environment.prototype, "cloudSessionKey", {
        get: function () {
            return process.env['PRISMA_CLOUD_SESSION_KEY'] || this.globalRC.cloudSessionKey;
        },
        enumerable: false,
        configurable: true
    });
    Environment.prototype.renewToken = function () {
        return __awaiter(this, void 0, void 0, function () {
            var data, timeLeft, res, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.cloudSessionKey) return [3 /*break*/, 4];
                        data = jwt.decode(this.cloudSessionKey);
                        if (!data.exp) {
                            return [2 /*return*/];
                        }
                        timeLeft = data.exp * 1000 - Date.now();
                        if (!(timeLeft < 1000 * 60 * 60 * 24 && timeLeft > 0)) return [3 /*break*/, 4];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.requestCloudApi("\n          mutation {\n            renewToken\n          }\n        ")];
                    case 2:
                        res = _a.sent();
                        if (res.renewToken) {
                            this.globalRC.cloudSessionKey = res.renewToken;
                            this.saveGlobalRC();
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        e_1 = _a.sent();
                        debug(e_1);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    Environment.prototype.fetchClusters = function () {
        return __awaiter(this, void 0, void 0, function () {
            var renewPromise, res, _a, _b, m, _c, _d, cluster, endpoint, e_2;
            var e_3, _e, e_4, _f;
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0:
                        if (!(!this.clustersFetched && this.cloudSessionKey)) return [3 /*break*/, 6];
                        renewPromise = this.renewToken();
                        _g.label = 1;
                    case 1:
                        _g.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, Promise.race([
                                this.requestCloudApi("\n            query prismaCliGetClusters {\n              me {\n                memberships {\n                  workspace {\n                    id\n                    slug\n                    clusters {\n                      id\n                      name\n                      connectInfo {\n                        endpoint\n                      }\n                      customConnectionInfo {\n                        endpoint\n                      }\n                    }\n                  }\n                }\n              }\n            }\n          "),
                                // eslint-disable-next-line
                                new Promise(function (_, r) { return setTimeout(function () { return r(); }, 6000); }),
                            ])];
                    case 2:
                        res = (_g.sent());
                        if (!res) {
                            return [2 /*return*/];
                        }
                        if (res.me && res.me.memberships && Array.isArray(res.me.memberships)) {
                            // clean up all prisma-eu1 and prisma-us1 clusters if they already exist
                            this.clusters = this._getClusters().filter(function (c) { return c.name !== 'prisma-eu1' && c.name !== 'prisma-us1'; });
                            try {
                                for (_a = __values(res.me.memberships), _b = _a.next(); !_b.done; _b = _a.next()) {
                                    m = _b.value;
                                    try {
                                        for (_c = (e_4 = void 0, __values(m.workspace.clusters)), _d = _c.next(); !_d.done; _d = _c.next()) {
                                            cluster = _d.value;
                                            endpoint = cluster.connectInfo
                                                ? cluster.connectInfo.endpoint
                                                : cluster.customConnectionInfo
                                                    ? cluster.customConnectionInfo.endpoint
                                                    : this.clusterEndpointMap[cluster.name];
                                            this.addCluster(new Cluster(this.out, cluster.name, endpoint, this.globalRC.cloudSessionKey, false, ['prisma-eu1', 'prisma-us1'].includes(cluster.name), !['prisma-eu1', 'prisma-us1'].includes(cluster.name), m.workspace.slug));
                                        }
                                    }
                                    catch (e_4_1) { e_4 = { error: e_4_1 }; }
                                    finally {
                                        try {
                                            if (_d && !_d.done && (_f = _c.return)) _f.call(_c);
                                        }
                                        finally { if (e_4) throw e_4.error; }
                                    }
                                }
                            }
                            catch (e_3_1) { e_3 = { error: e_3_1 }; }
                            finally {
                                try {
                                    if (_b && !_b.done && (_e = _a.return)) _e.call(_a);
                                }
                                finally { if (e_3) throw e_3.error; }
                            }
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        e_2 = _g.sent();
                        debug(e_2);
                        return [3 /*break*/, 4];
                    case 4: return [4 /*yield*/, renewPromise];
                    case 5:
                        _g.sent();
                        _g.label = 6;
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    Environment.prototype.clusterByName = function (name, throws) {
        if (throws === void 0) { throws = false; }
        if (!this.clusters) {
            return;
        }
        var cluster = this.clusters.find(function (c) { return c.name === name; });
        if (!throws) {
            return cluster;
        }
        if (!cluster) {
            if (!name) {
                throw new ClusterNotSet();
            }
            throw new ClusterNotFound(name);
        }
        return cluster;
    };
    Environment.prototype.setToken = function (token) {
        this.globalRC.cloudSessionKey = token;
    };
    Environment.prototype.addCluster = function (cluster) {
        var clusters = this._getClusters();
        var existingClusterIndex = clusters.findIndex(function (c) {
            if (cluster.workspaceSlug) {
                return c.workspaceSlug === cluster.workspaceSlug && c.name === cluster.name;
            }
            else {
                return c.name === cluster.name;
            }
        });
        if (existingClusterIndex > -1) {
            clusters.splice(existingClusterIndex, 1);
        }
        clusters.push(cluster);
    };
    Environment.prototype.removeCluster = function (name) {
        this.clusters = this._getClusters().filter(function (c) { return c.name !== name; });
    };
    Environment.prototype.saveGlobalRC = function () {
        var rc = {
            cloudSessionKey: this.globalRC.cloudSessionKey ? this.globalRC.cloudSessionKey.trim() : undefined,
            clusters: this.getLocalClusterConfig(),
        };
        // parse & stringify to rm undefined for yaml parser
        var rcString = yaml.dump(JSON.parse(JSON.stringify(rc)));
        fs.writeFileSync(this.rcPath, rcString);
    };
    Environment.prototype.setActiveCluster = function (cluster) {
        this.activeCluster = cluster;
    };
    Environment.prototype.loadGlobalRC = function () {
        return __awaiter(this, void 0, void 0, function () {
            var globalFile, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!this.rcPath) return [3 /*break*/, 6];
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 5]);
                        fs.accessSync(this.rcPath);
                        globalFile = fs.readFileSync(this.rcPath, 'utf-8');
                        return [4 /*yield*/, this.parseGlobalRC(globalFile)];
                    case 2:
                        _b.sent();
                        return [3 /*break*/, 5];
                    case 3:
                        _a = _b.sent();
                        return [4 /*yield*/, this.parseGlobalRC()];
                    case 4:
                        _b.sent();
                        return [3 /*break*/, 5];
                    case 5: return [3 /*break*/, 8];
                    case 6: return [4 /*yield*/, this.parseGlobalRC()];
                    case 7:
                        _b.sent();
                        _b.label = 8;
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    Environment.prototype.parseGlobalRC = function (globalFile) {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!globalFile) return [3 /*break*/, 2];
                        _a = this;
                        return [4 /*yield*/, this.loadYaml(globalFile, this.rcPath)];
                    case 1:
                        _a.globalRC = _b.sent();
                        _b.label = 2;
                    case 2:
                        this.clusters = this.initClusters(this.globalRC);
                        return [2 /*return*/];
                }
            });
        });
    };
    Environment.prototype.loadYaml = function (file, filePath) {
        if (filePath === void 0) { filePath = null; }
        return __awaiter(this, void 0, void 0, function () {
            var content, variables;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!file) return [3 /*break*/, 2];
                        content = void 0;
                        try {
                            content = yaml.load(file);
                        }
                        catch (e) {
                            throw new Error("Yaml parsing error in " + filePath + ": " + e.message);
                        }
                        variables = new Variables(filePath || 'no filepath provided', this.args, this.out);
                        return [4 /*yield*/, variables.populateJson(content)];
                    case 1:
                        content = _a.sent();
                        return [2 /*return*/, content];
                    case 2: return [2 /*return*/, {}];
                }
            });
        });
    };
    Environment.prototype.initClusters = function (rc) {
        var sharedClusters = this.getSharedClusters(rc);
        return __spreadArray([], __read(sharedClusters), false);
    };
    Environment.prototype.getSharedClusters = function (rc) {
        var _this = this;
        return this.sharedClusters.map(function (clusterName) {
            return new Cluster(_this.out, clusterName, _this.clusterEndpointMap[clusterName], rc && rc.cloudSessionKey, false, true);
        });
    };
    Environment.prototype.getLocalClusterConfig = function () {
        var _this = this;
        return this._getClusters()
            .filter(function (c) { return !c.shared && c.clusterSecret !== _this.cloudSessionKey && !c.isPrivate; })
            .reduce(function (acc, cluster) {
            var _a;
            return __assign(__assign({}, acc), (_a = {}, _a[cluster.name] = {
                host: cluster.baseUrl,
                clusterSecret: cluster.clusterSecret,
            }, _a));
        }, {});
    };
    Environment.prototype.requestCloudApi = function (query) {
        return __awaiter(this, void 0, void 0, function () {
            var res, json;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, fetch('https://api.cloud.prisma.sh', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: "Bearer " + this.cloudSessionKey,
                                'X-Cli-Version': this.version,
                            },
                            body: JSON.stringify({
                                query: query,
                            }),
                            proxy: getProxyAgent('https://api.cloud.prisma.sh'),
                        })];
                    case 1:
                        res = _a.sent();
                        return [4 /*yield*/, res.json()];
                    case 2:
                        json = _a.sent();
                        return [2 /*return*/, json.data];
                }
            });
        });
    };
    return Environment;
}());
export { Environment };
export var isLocal = function (hostname) { return hostname.includes('localhost') || hostname.includes('127.0.0.1'); };
