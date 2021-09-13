import { __awaiter, __generator } from "tslib";
import { Environment } from './Environment';
import { getTmpDir } from './test/getTmpDir';
import * as fs from 'fs';
import { Cluster } from './Cluster';
import { Output } from './Output';
export function makeEnv(_) {
    var tmpDir = getTmpDir();
    return new Environment(tmpDir);
}
var out = new Output();
describe('Environment', function () {
    test('non-existent global prisma rc', function () { return __awaiter(void 0, void 0, void 0, function () {
        var env;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    env = makeEnv();
                    return [4 /*yield*/, env.load()];
                case 1:
                    _a.sent();
                    expect(env.clusters).toMatchSnapshot();
                    return [2 /*return*/];
            }
        });
    }); });
    test('persists .prisma correctly', function () { return __awaiter(void 0, void 0, void 0, function () {
        var env, cluster;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    env = makeEnv();
                    return [4 /*yield*/, env.load()];
                case 1:
                    _a.sent();
                    cluster = new Cluster(out, 'cluster', "http://localhost:60000", '');
                    env.addCluster(cluster);
                    env.saveGlobalRC();
                    expect(fs.readFileSync(env.rcPath, 'utf-8')).toMatchSnapshot();
                    expect(env.clusters).toMatchSnapshot();
                    return [2 /*return*/];
            }
        });
    }); });
    test('empty global prisma rc', function () { return __awaiter(void 0, void 0, void 0, function () {
        var env;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    env = makeEnv('');
                    return [4 /*yield*/, env.load()];
                case 1:
                    _a.sent();
                    expect(env.clusters).toMatchSnapshot();
                    return [2 /*return*/];
            }
        });
    }); });
    test('sets the platform token correctly', function () { return __awaiter(void 0, void 0, void 0, function () {
        var env;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    env = makeEnv("platformToken: asdf");
                    return [4 /*yield*/, env.load()];
                case 1:
                    _a.sent();
                    expect(env.clusters).toMatchSnapshot();
                    return [2 /*return*/];
            }
        });
    }); });
    test('interpolates env vars', function () { return __awaiter(void 0, void 0, void 0, function () {
        var env;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    process.env['SPECIAL_TEST_ENV_VAR'] = 'this-is-so-special';
                    env = makeEnv("platformToken: ${env:SPECIAL_TEST_ENV_VAR}");
                    return [4 /*yield*/, env.load()];
                case 1:
                    _a.sent();
                    expect(env.clusters).toMatchSnapshot();
                    return [2 /*return*/];
            }
        });
    }); });
    test('loads multiple cluster definitions correctly + gives cluster by name', function () { return __awaiter(void 0, void 0, void 0, function () {
        var rc, env, cluster;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    rc = "clusters:\n    local:\n      host: 'http://localhost:60000'\n    remote:\n      host: 'https://remote.graph.cool'\n      clusterSecret: 'here-is-a-token'\n  ";
                    env = makeEnv(rc);
                    return [4 /*yield*/, env.load()];
                case 1:
                    _a.sent();
                    expect(env.clusters).toMatchSnapshot();
                    cluster = env.clusterByName('remote');
                    expect(cluster).toMatchSnapshot();
                    return [2 /*return*/];
            }
        });
    }); });
});
