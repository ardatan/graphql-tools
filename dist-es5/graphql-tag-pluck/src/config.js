import { __read, __spreadArray } from "tslib";
import { getExtNameFromFilePath } from './libs/extname';
export default function generateConfig(filePath, code, _options) {
    var plugins = [
        'asyncGenerators',
        'bigInt',
        'classProperties',
        'classPrivateProperties',
        'classPrivateMethods',
        'decorators-legacy',
        'doExpressions',
        'dynamicImport',
        'exportDefaultFrom',
        'exportNamespaceFrom',
        'functionBind',
        'functionSent',
        'importMeta',
        'logicalAssignment',
        'nullishCoalescingOperator',
        'numericSeparator',
        'objectRestSpread',
        'optionalCatchBinding',
        'optionalChaining',
        ['pipelineOperator', { proposal: 'smart' }],
        'throwExpressions',
    ];
    // { all: true } option is bullshit thus I do it manually, just in case
    // I still specify it
    var flowPlugins = [['flow', { all: true }], 'flowComments'];
    // If line has @flow header, include flow plug-ins
    var dynamicFlowPlugins = code.includes('@flow') ? flowPlugins : [];
    var fileExt = getExtNameFromFilePath(filePath);
    switch (fileExt) {
        case '.ts':
            plugins.push('typescript');
            break;
        case '.tsx':
            plugins.push('typescript', 'jsx');
            break;
        // Adding .jsx extension by default because it doesn't affect other syntax features
        // (unlike .tsx) and because people are seem to use it with regular file extensions
        // (e.g. .js) see https://github.com/dotansimha/graphql-code-generator/issues/1967
        case '.js':
            plugins.push.apply(plugins, __spreadArray(['jsx'], __read(dynamicFlowPlugins), false));
            break;
        case '.jsx':
            plugins.push.apply(plugins, __spreadArray(['jsx'], __read(dynamicFlowPlugins), false));
            break;
        case '.flow.js':
            plugins.push.apply(plugins, __spreadArray(['jsx'], __read(flowPlugins), false));
            break;
        case '.flow.jsx':
            plugins.push.apply(plugins, __spreadArray(['jsx'], __read(flowPlugins), false));
            break;
        case '.flow':
            plugins.push.apply(plugins, __spreadArray(['jsx'], __read(flowPlugins), false));
            break;
        case '.vue':
            plugins.push('typescript', 'vue');
            break;
        default:
            plugins.push.apply(plugins, __spreadArray(['jsx'], __read(dynamicFlowPlugins), false));
            break;
    }
    // The _options filed will be used to retrieve the original options.
    // Useful when we wanna get not config related options later on
    return {
        sourceType: 'module',
        plugins: plugins,
        allowUndeclaredExports: true,
    };
}
