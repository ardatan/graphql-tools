import { __assign } from "tslib";
import { printSchemaWithDirectives, parseGraphQLSDL, printWithComments, resetComments, } from '@graphql-tools/utils';
import { filterKind } from '../filter-document-kind';
export function parseSource(_a) {
    var partialSource = _a.partialSource, options = _a.options, pointerOptionMap = _a.pointerOptionMap, addValidSource = _a.addValidSource;
    if (partialSource) {
        var input = prepareInput({
            source: partialSource,
            options: options,
            pointerOptionMap: pointerOptionMap,
        });
        parseSchema(input);
        parseRawSDL(input);
        if (input.source.document) {
            useKindsFilter(input);
            useComments(input);
            collectValidSources(input, addValidSource);
        }
    }
}
//
function prepareInput(_a) {
    var source = _a.source, options = _a.options, pointerOptionMap = _a.pointerOptionMap;
    var specificOptions = __assign({}, options);
    if (source.location) {
        specificOptions = __assign(__assign({}, specificOptions), pointerOptionMap[source.location]);
    }
    return { source: __assign({}, source), options: specificOptions };
}
function parseSchema(input) {
    if (input.source.schema) {
        input.source.rawSDL = printSchemaWithDirectives(input.source.schema, input.options);
    }
}
function parseRawSDL(input) {
    if (input.source.rawSDL) {
        input.source.document = parseGraphQLSDL(input.source.location, input.source.rawSDL, input.options).document;
    }
}
function useKindsFilter(input) {
    if (input.options.filterKinds) {
        input.source.document = filterKind(input.source.document, input.options.filterKinds);
    }
}
function useComments(input) {
    if (!input.source.rawSDL && input.source.document) {
        input.source.rawSDL = printWithComments(input.source.document);
        resetComments();
    }
}
function collectValidSources(input, addValidSource) {
    var _a;
    if (((_a = input.source.document) === null || _a === void 0 ? void 0 : _a.definitions) && input.source.document.definitions.length > 0) {
        addValidSource(input.source);
    }
}
