import { Source } from '@graphql-tools/utils';
import { Kind } from 'graphql';
import { LoadTypedefsOptions, loadTypedefs, loadTypedefsSync, UnnormalizedTypeDefPointer } from './load-typedefs';

export const OPERATION_KINDS = [Kind.OPERATION_DEFINITION, Kind.FRAGMENT_DEFINITION];
export const NON_OPERATION_KINDS = Object.keys(Kind)
  .reduce((prev, v) => [...prev, Kind[v]], [])
  .filter(v => !OPERATION_KINDS.includes(v));

export function loadDocuments(
  documentDef: UnnormalizedTypeDefPointer | UnnormalizedTypeDefPointer[],
  options: LoadTypedefsOptions
): Promise<Source[]> {
  return loadTypedefs(documentDef, { noRequire: true, filterKinds: NON_OPERATION_KINDS, ...options });
}

export function loadDocumentsSync(
  documentDef: UnnormalizedTypeDefPointer | UnnormalizedTypeDefPointer[],
  options: LoadTypedefsOptions
): Source[] {
  return loadTypedefsSync(documentDef, { noRequire: true, filterKinds: NON_OPERATION_KINDS, ...options });
}
