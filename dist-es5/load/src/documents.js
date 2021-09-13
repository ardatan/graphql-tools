import { __assign, __read, __spreadArray } from "tslib";
import { Kind } from 'graphql';
import { loadTypedefs, loadTypedefsSync } from './load-typedefs';
/**
 * Kinds of AST nodes that are included in executable documents
 */
export var OPERATION_KINDS = [Kind.OPERATION_DEFINITION, Kind.FRAGMENT_DEFINITION];
/**
 * Kinds of AST nodes that are included in type system definition documents
 */
export var NON_OPERATION_KINDS = Object.keys(Kind)
    .reduce(function (prev, v) { return __spreadArray(__spreadArray([], __read(prev), false), [Kind[v]], false); }, [])
    .filter(function (v) { return !OPERATION_KINDS.includes(v); });
/**
 * Asynchronously loads executable documents (i.e. operations and fragments) from
 * the provided pointers. The pointers may be individual files or a glob pattern.
 * The files themselves may be `.graphql` files or `.js` and `.ts` (in which
 * case they will be parsed using graphql-tag-pluck).
 * @param pointerOrPointers Pointers to the files to load the documents from
 * @param options Additional options
 */
export function loadDocuments(pointerOrPointers, options) {
    return loadTypedefs(pointerOrPointers, __assign({ noRequire: true, filterKinds: NON_OPERATION_KINDS }, options));
}
/**
 * Synchronously loads executable documents (i.e. operations and fragments) from
 * the provided pointers. The pointers may be individual files or a glob pattern.
 * The files themselves may be `.graphql` files or `.js` and `.ts` (in which
 * case they will be parsed using graphql-tag-pluck).
 * @param pointerOrPointers Pointers to the files to load the documents from
 * @param options Additional options
 */
export function loadDocumentsSync(pointerOrPointers, options) {
    return loadTypedefsSync(pointerOrPointers, __assign({ noRequire: true, filterKinds: NON_OPERATION_KINDS }, options));
}
