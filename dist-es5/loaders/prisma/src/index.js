import { __awaiter, __extends, __generator } from "tslib";
import { UrlLoader } from '@graphql-tools/url-loader';
import { PrismaDefinitionClass, Environment } from './prisma-yml';
import { join } from 'path';
import { promises as fsPromises } from 'fs';
import { homedir } from 'os';
import { cwd } from 'process';
var access = fsPromises.access;
/**
 * This loader loads a schema from a `prisma.yml` file
 */
var PrismaLoader = /** @class */ (function (_super) {
    __extends(PrismaLoader, _super);
    function PrismaLoader() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    PrismaLoader.prototype.canLoadSync = function () {
        return false;
    };
    PrismaLoader.prototype.canLoad = function (prismaConfigFilePath, options) {
        return __awaiter(this, void 0, void 0, function () {
            var joinedYmlPath, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!(typeof prismaConfigFilePath === 'string' && prismaConfigFilePath.endsWith('prisma.yml'))) return [3 /*break*/, 4];
                        joinedYmlPath = join(options.cwd || cwd(), prismaConfigFilePath);
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, access(joinedYmlPath)];
                    case 2:
                        _b.sent();
                        return [2 /*return*/, true];
                    case 3:
                        _a = _b.sent();
                        return [2 /*return*/, false];
                    case 4: return [2 /*return*/, false];
                }
            });
        });
    };
    PrismaLoader.prototype.load = function (prismaConfigFilePath, options) {
        return __awaiter(this, void 0, void 0, function () {
            var graceful, envVars, home, env, joinedYmlPath, definition, serviceName, stage, clusterName, cluster, token, url, headers;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.canLoad(prismaConfigFilePath, options)];
                    case 1:
                        if (!(_a.sent())) {
                            return [2 /*return*/, []];
                        }
                        graceful = options.graceful, envVars = options.envVars;
                        home = homedir();
                        env = new Environment(home);
                        return [4 /*yield*/, env.load()];
                    case 2:
                        _a.sent();
                        joinedYmlPath = join(options.cwd || cwd(), prismaConfigFilePath);
                        definition = new PrismaDefinitionClass(env, joinedYmlPath, envVars);
                        return [4 /*yield*/, definition.load({}, undefined, graceful)];
                    case 3:
                        _a.sent();
                        serviceName = definition.service;
                        stage = definition.stage;
                        clusterName = definition.cluster;
                        if (!clusterName) {
                            throw new Error("No cluster set. Please set the \"cluster\" property in your prisma.yml");
                        }
                        return [4 /*yield*/, definition.getCluster()];
                    case 4:
                        cluster = _a.sent();
                        if (!cluster) {
                            throw new Error("Cluster " + clusterName + " provided in prisma.yml could not be found in global ~/.prisma/config.yml.\n      Please check in ~/.prisma/config.yml, if the cluster exists.\n      You can use `docker-compose up -d` to start a new cluster.");
                        }
                        token = definition.getToken(serviceName, stage);
                        url = cluster.getApiEndpoint(serviceName, stage, definition.getWorkspace() || undefined);
                        headers = token
                            ? {
                                Authorization: "Bearer " + token,
                            }
                            : undefined;
                        return [2 /*return*/, _super.prototype.load.call(this, url, { headers: headers })];
                }
            });
        });
    };
    return PrismaLoader;
}(UrlLoader));
export { PrismaLoader };
