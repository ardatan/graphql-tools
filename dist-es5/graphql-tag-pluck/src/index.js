import { __awaiter, __generator } from "tslib";
import generateConfig from './config';
import { parse } from '@babel/parser';
import { getExtNameFromFilePath } from './libs/extname';
import createVisitor from './visitor';
import traversePkg from '@babel/traverse';
import { freeText } from './utils';
import { Source } from 'graphql';
function getDefault(module) {
    return module.default || module;
}
var traverse = getDefault(traversePkg);
var supportedExtensions = ['.js', '.jsx', '.ts', '.tsx', '.flow', '.flow.js', '.flow.jsx', '.vue'];
// tslint:disable-next-line: no-implicit-dependencies
function parseWithVue(vueTemplateCompiler, fileData) {
    var descriptor = vueTemplateCompiler.parse(fileData).descriptor;
    return descriptor.script || descriptor.scriptSetup
        ? vueTemplateCompiler.compileScript(descriptor, { id: Date.now().toString() }).content
        : '';
}
/**
 * Asynchronously plucks GraphQL template literals from a single file.
 *
 * Supported file extensions include: `.js`, `.jsx`, `.ts`, `.tsx`, `.flow`, `.flow.js`, `.flow.jsx`, `.vue`
 *
 * @param filePath Path to the file containing the code. Required to detect the file type
 * @param code The contents of the file being parsed.
 * @param options Additional options for determining how a file is parsed.
 */
export var gqlPluckFromCodeString = function (filePath, code, options) {
    if (options === void 0) { options = {}; }
    return __awaiter(void 0, void 0, void 0, function () {
        var fileExt;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    validate({ code: code, options: options });
                    fileExt = extractExtension(filePath);
                    if (!(fileExt === '.vue')) return [3 /*break*/, 2];
                    return [4 /*yield*/, pluckVueFileScript(code)];
                case 1:
                    code = _a.sent();
                    _a.label = 2;
                case 2: return [2 /*return*/, parseCode({ code: code, filePath: filePath, options: options }).map(function (t) { return new Source(t.content, filePath, t.loc.start); })];
            }
        });
    });
};
/**
 * Synchronously plucks GraphQL template literals from a single file
 *
 * Supported file extensions include: `.js`, `.jsx`, `.ts`, `.tsx`, `.flow`, `.flow.js`, `.flow.jsx`, `.vue`
 *
 * @param filePath Path to the file containing the code. Required to detect the file type
 * @param code The contents of the file being parsed.
 * @param options Additional options for determining how a file is parsed.
 */
export var gqlPluckFromCodeStringSync = function (filePath, code, options) {
    if (options === void 0) { options = {}; }
    validate({ code: code, options: options });
    var fileExt = extractExtension(filePath);
    if (fileExt === '.vue') {
        code = pluckVueFileScriptSync(code);
    }
    return parseCode({ code: code, filePath: filePath, options: options }).map(function (t) { return new Source(t.content, filePath, t.loc.start); });
};
export function parseCode(_a) {
    var code = _a.code, filePath = _a.filePath, options = _a.options;
    var out = { returnValue: null };
    var ast = parse(code, generateConfig(filePath, code, options));
    var visitor = createVisitor(code, out, options);
    traverse(ast, visitor);
    return out.returnValue || [];
}
function validate(_a) {
    var code = _a.code, options = _a.options;
    if (typeof code !== 'string') {
        throw TypeError('Provided code must be a string');
    }
    if (!(options instanceof Object)) {
        throw TypeError("Options arg must be an object");
    }
}
function extractExtension(filePath) {
    var fileExt = getExtNameFromFilePath(filePath);
    if (fileExt) {
        if (!supportedExtensions.includes(fileExt)) {
            throw TypeError("Provided file type must be one of " + supportedExtensions.join(', ') + " ");
        }
    }
    return fileExt;
}
var MissingVueTemplateCompilerError = new Error(freeText("\n    GraphQL template literals cannot be plucked from a Vue template code without having the \"@vue/compiler-sfc\" package installed.\n    Please install it and try again.\n\n    Via NPM:\n\n        $ npm install @vue/compiler-sfc\n\n    Via Yarn:\n\n        $ yarn add @vue/compiler-sfc\n  "));
function pluckVueFileScript(fileData) {
    return __awaiter(this, void 0, void 0, function () {
        var vueTemplateCompiler, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, import('@vue/compiler-sfc')];
                case 1:
                    // tslint:disable-next-line: no-implicit-dependencies
                    vueTemplateCompiler = _a.sent();
                    return [3 /*break*/, 3];
                case 2:
                    e_1 = _a.sent();
                    throw MissingVueTemplateCompilerError;
                case 3: return [2 /*return*/, parseWithVue(vueTemplateCompiler, fileData)];
            }
        });
    });
}
function pluckVueFileScriptSync(fileData) {
    // tslint:disable-next-line: no-implicit-dependencies
    var vueTemplateCompiler;
    try {
        // tslint:disable-next-line: no-implicit-dependencies
        vueTemplateCompiler = require('@vue/compiler-sfc');
    }
    catch (e) {
        throw MissingVueTemplateCompilerError;
    }
    return parseWithVue(vueTemplateCompiler, fileData);
}
