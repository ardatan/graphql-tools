import { __awaiter, __generator } from "tslib";
import { PrismaDefinitionClass } from './PrismaDefinition';
import * as fs from 'fs';
import * as path from 'path';
import { getTmpDir } from './test/getTmpDir';
import { makeEnv } from './Environment.test';
var defaultGlobalRC = "prisma-1.0:\n  clusters:\n    local:\n      host: 'http://localhost:4466'\n    remote:\n      host: 'https://remote.graph.cool'\n      clusterSecret: 'here-is-a-token'\n";
function makeDefinition(yml, datamodel, _, __, envVars) {
    if (_ === void 0) { _ = {}; }
    if (__ === void 0) { __ = defaultGlobalRC; }
    if (envVars === void 0) { envVars = process.env; }
    var definitionDir = getTmpDir();
    var definitionPath = path.join(definitionDir, 'prisma.yml');
    var modelPath = path.join(definitionDir, 'datamodel.prisma');
    var env = makeEnv(defaultGlobalRC);
    var definition = new PrismaDefinitionClass(env, definitionPath, envVars);
    fs.writeFileSync(modelPath, datamodel);
    fs.writeFileSync(definitionPath, yml);
    return { env: env, definition: definition };
}
function loadDefinition(yml, datamodel, args, envPath, globalRC) {
    if (args === void 0) { args = {}; }
    if (globalRC === void 0) { globalRC = defaultGlobalRC; }
    return __awaiter(this, void 0, void 0, function () {
        var _a, env, definition;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = makeDefinition(yml, datamodel, args, globalRC), env = _a.env, definition = _a.definition;
                    return [4 /*yield*/, env.load()];
                case 1:
                    _b.sent();
                    return [4 /*yield*/, definition.load(args, envPath)];
                case 2:
                    _b.sent();
                    return [2 /*return*/, { env: env, definition: definition }];
            }
        });
    });
}
describe('prisma definition', function () {
    test('load basic yml, provide cluster', function () { return __awaiter(void 0, void 0, void 0, function () {
        var yml, datamodel, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    yml = "service: jj\nstage: dev\ncluster: local\n\ndatamodel:\n- datamodel.prisma\n\nsecret: some-secret\n\nschema: schemas/database.graphql\n    ";
                    datamodel = "\ntype User @model {\n  id: ID! @isUnique\n  name: String!\n  lol: Int\n  what: String\n}\n";
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, loadDefinition(yml, datamodel)];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    e_1 = _a.sent();
                    expect(e_1).toMatchSnapshot();
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); });
    test('load yml with secret and env var', function () { return __awaiter(void 0, void 0, void 0, function () {
        var secret, yml, datamodel, e_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    secret = 'this-is-a-long-secret';
                    process.env['MY_TEST_SECRET'] = secret;
                    yml = "service: jj\nstage: dev\ncluster: local\n\ndatamodel:\n- datamodel.prisma\n\nsecret: ${env:MY_TEST_SECRET}\n\nschema: schemas/database.graphql\n    ";
                    datamodel = "\ntype User @model {\n  id: ID! @isUnique\n  name: String!\n  lol: Int\n  what: String\n}\n";
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, loadDefinition(yml, datamodel)];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    e_2 = _a.sent();
                    expect(e_2).toMatchSnapshot();
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); });
    test('load yml with secret and env var in .env', function () { return __awaiter(void 0, void 0, void 0, function () {
        var yml, datamodel, _a, definition, env, envPath, e_3;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    yml = "service: jj\nstage: dev\ncluster: local\n\ndatamodel:\n- datamodel.prisma\n\nsecret: ${env:MY_DOT_ENV_SECRET}\n\nschema: schemas/database.graphql\n    ";
                    datamodel = "\ntype User @model {\n  id: ID! @isUnique\n  name: String!\n  lol: Int\n  what: String\n}\n";
                    _a = makeDefinition(yml, datamodel, {}), definition = _a.definition, env = _a.env;
                    envPath = path.join(definition.definitionDir, '.env');
                    fs.mkdirSync(path.dirname(envPath), { recursive: true });
                    fs.writeFileSync(envPath, "MY_DOT_ENV_SECRET=this-is-very-secret,and-comma,seperated");
                    return [4 /*yield*/, env.load()];
                case 1:
                    _b.sent();
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, loadDefinition(yml, datamodel)];
                case 3:
                    _b.sent();
                    return [3 /*break*/, 5];
                case 4:
                    e_3 = _b.sent();
                    expect(e_3).toMatchSnapshot();
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    }); });
    test('load yml with injected env var', function () { return __awaiter(void 0, void 0, void 0, function () {
        var yml, datamodel, envVars, env, e_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    yml = "service: jj\nstage: dev\ncluster: local\n\ndatamodel:\n- datamodel.prisma\n\nsecret: ${env:MY_INJECTED_ENV_SECRET}\n\nschema: schemas/database.graphql\n    ";
                    datamodel = "\ntype User @model {\n  id: ID! @isUnique\n  name: String!\n  lol: Int\n  what: String\n}\n";
                    envVars = {
                        MY_INJECTED_ENV_SECRET: 'some-secret',
                    };
                    env = makeDefinition(yml, datamodel, {}, defaultGlobalRC, envVars).env;
                    return [4 /*yield*/, env.load()];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, loadDefinition(yml, datamodel)];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 5];
                case 4:
                    e_4 = _a.sent();
                    expect(e_4).toMatchSnapshot();
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    }); });
    /**
     * This test ensures, that GRAPHCOOL_SECRET can't be injected anymore
     */
    test("don't load yml with secret and env var in args", function () { return __awaiter(void 0, void 0, void 0, function () {
        var yml, datamodel, definitionDir, definitionPath, modelPath, env, definition, error, e_5;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    yml = "service: jj\nstage: dev\ncluster: local\n\ndatamodel:\n- datamodel.prisma\n\nschema: schemas/database.graphql\n    ";
                    datamodel = "\ntype User @model {\n  id: ID! @isUnique\n  name: String!\n  lol: Int\n  what: String\n}\n";
                    definitionDir = getTmpDir();
                    definitionPath = path.join(definitionDir, 'prisma.yml');
                    modelPath = path.join(definitionDir, 'datamodel.prisma');
                    env = makeEnv(defaultGlobalRC);
                    definition = new PrismaDefinitionClass(env, definitionPath, {
                        GRAPHCOOL_SECRET: 'this-is-secret',
                    });
                    fs.writeFileSync(modelPath, datamodel);
                    fs.writeFileSync(definitionPath, yml);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, env.load()];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, definition.load({})];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 5];
                case 4:
                    e_5 = _a.sent();
                    error = e_5;
                    return [3 /*break*/, 5];
                case 5:
                    expect(error).toMatchSnapshot();
                    return [2 /*return*/];
            }
        });
    }); });
    test('load yml with disableAuth: true', function () { return __awaiter(void 0, void 0, void 0, function () {
        var yml, datamodel, _a, definition, env, envPath, e_6;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    yml = "service: jj\nstage: dev\ncluster: local\n\ndatamodel:\n- datamodel.prisma\n\ndisableAuth: true\n\nschema: schemas/database.graphql\n    ";
                    datamodel = "\ntype User @model {\n  id: ID! @isUnique\n  name: String!\n  lol: Int\n  what: String\n}\n";
                    _a = makeDefinition(yml, datamodel), definition = _a.definition, env = _a.env;
                    envPath = path.join(definition.definitionDir, '.env');
                    fs.mkdirSync(path.dirname(envPath), { recursive: true });
                    fs.writeFileSync(envPath, "MY_DOT_ENV_SECRET=this-is-very-secret,and-comma,seperated");
                    return [4 /*yield*/, env.load()];
                case 1:
                    _b.sent();
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, loadDefinition(yml, datamodel)];
                case 3:
                    _b.sent();
                    return [3 /*break*/, 5];
                case 4:
                    e_6 = _b.sent();
                    expect(e_6).toMatchSnapshot();
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    }); });
    test('throw when no secret or disable auth provided', function () { return __awaiter(void 0, void 0, void 0, function () {
        var yml, datamodel, error, e_7;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    yml = "service: jj\nstage: dev\ncluster: local\n\ndatamodel:\n- datamodel.prisma\n\nschema: schemas/database.graphql\n    ";
                    datamodel = "\ntype User @model {\n  id: ID! @isUnique\n  name: String!\n  lol: Int\n  what: String\n}\n";
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, loadDefinition(yml, datamodel)];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    e_7 = _a.sent();
                    error = e_7;
                    return [3 /*break*/, 4];
                case 4:
                    expect(error).toMatchSnapshot();
                    return [2 /*return*/];
            }
        });
    }); });
    test('throws when stages key apparent', function () { return __awaiter(void 0, void 0, void 0, function () {
        var yml, datamodel, error, e_8;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    yml = "service: jj\nstage: dev\ncluster: local\n\ndatamodel:\n- datamodel.prisma\n\nschema: schemas/database.graphql\n\nstages:\n  dev: local\n    ";
                    datamodel = "\ntype User @model {\n  id: ID! @isUnique\n  name: String!\n  lol: Int\n  what: String\n}\n";
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, loadDefinition(yml, datamodel)];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    e_8 = _a.sent();
                    error = e_8;
                    return [3 /*break*/, 4];
                case 4:
                    expect(error).toMatchSnapshot();
                    return [2 /*return*/];
            }
        });
    }); });
});
