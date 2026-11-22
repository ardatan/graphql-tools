import { DocumentNode, FieldNode, FragmentSpreadNode, InlineFragmentNode, Kind } from 'graphql';
import { shouldIncludeNode, VariableValues } from '@graphql-tools/utils';

export type IncludePredicate = (variableValues: VariableValues) => boolean;

export const ALWAYS_INCLUDE: IncludePredicate = (_variableValues: VariableValues): boolean => true;
export const NEVER_INCLUDE: IncludePredicate = (_variableValues: VariableValues): boolean => false;

type SkipIncludeNode = FieldNode | InlineFragmentNode | FragmentSpreadNode;
/**
 * True when every `@skip`/`@include` in the document sits on a Field node
 * (not fragment spreads / inline fragments). Kept for tests / diagnostics;
 * plan and collect-layer now support fragment-level predicates via
 * `conditionalCollect.ts`.
 */
export function documentHasOnlyFieldSkipInclude(document: DocumentNode): boolean {
  for (const definition of document.definitions) {
    if (
      definition.kind !== Kind.OPERATION_DEFINITION &&
      definition.kind !== Kind.FRAGMENT_DEFINITION
    ) {
      continue;
    }
    if (!selectionSetHasOnlyFieldSkipInclude(definition.selectionSet)) {
      return false;
    }
  }
  return true;
}

function selectionSetHasOnlyFieldSkipInclude(selectionSet: {
  selections: ReadonlyArray<{
    kind: string;
    directives?: ReadonlyArray<{ name: { value: string } }>;
    selectionSet?: { selections: ReadonlyArray<any> };
  }>;
}): boolean {
  for (const selection of selectionSet.selections) {
    const directives = selection.directives;
    if (directives) {
      for (const directive of directives) {
        const name = directive.name.value;
        if (name !== 'skip' && name !== 'include') {
          continue;
        }
        if (selection.kind !== Kind.FIELD) {
          return false;
        }
      }
    }
    if (selection.selectionSet && !selectionSetHasOnlyFieldSkipInclude(selection.selectionSet)) {
      return false;
    }
  }
  return true;
}

/**
 * AND two include predicates. Identity / never shortcuts avoid extra closures.
 */
export function andIncludePredicates(a: IncludePredicate, b: IncludePredicate): IncludePredicate {
  if (a === ALWAYS_INCLUDE) {
    return b;
  }
  if (b === ALWAYS_INCLUDE) {
    return a;
  }
  if (a === NEVER_INCLUDE || b === NEVER_INCLUDE) {
    return NEVER_INCLUDE;
  }
  return variableValues => a(variableValues) && b(variableValues);
}

/**
 * OR include predicates (collectFields merge: any contributing path includes).
 */
export function orIncludePredicates(predicates: ReadonlyArray<IncludePredicate>): IncludePredicate {
  if (predicates.length === 0) {
    return ALWAYS_INCLUDE;
  }
  if (predicates.length === 1) {
    return predicates[0]!;
  }
  if (predicates.every(p => p === ALWAYS_INCLUDE)) {
    return ALWAYS_INCLUDE;
  }
  if (predicates.every(p => p === NEVER_INCLUDE)) {
    return NEVER_INCLUDE;
  }
  return variableValues => {
    for (const predicate of predicates) {
      if (predicate(variableValues)) {
        return true;
      }
    }
    return false;
  };
}

/**
 * Compile `@skip`/`@include` on a Field, inline fragment, or fragment spread.
 * Fast path for strict booleans; null / missing `Boolean!` falls back to
 * classic `shouldIncludeNode` so errors still fire before resolvers run.
 */
export function compileSkipIncludePredicate(node: SkipIncludeNode): IncludePredicate {
  const directives = node.directives;
  if (directives == null || directives.length === 0) {
    return ALWAYS_INCLUDE;
  }

  let skipVar: string | undefined;
  let skipLiteral: boolean | undefined;
  let includeVar: string | undefined;
  let includeLiteral: boolean | undefined;

  for (const directive of directives) {
    const name = directive.name.value;
    if (name !== 'skip' && name !== 'include') {
      continue;
    }
    for (const arg of directive.arguments ?? []) {
      if (arg.name.value !== 'if') {
        continue;
      }
      if (arg.value.kind === Kind.VARIABLE) {
        if (name === 'skip') {
          skipVar = arg.value.name.value;
        } else {
          includeVar = arg.value.name.value;
        }
      } else if (arg.value.kind === Kind.BOOLEAN) {
        if (name === 'skip') {
          skipLiteral = arg.value.value;
        } else {
          includeLiteral = arg.value.value;
        }
      }
    }
  }

  if (
    skipVar == null &&
    includeVar == null &&
    skipLiteral === undefined &&
    includeLiteral === undefined
  ) {
    return ALWAYS_INCLUDE;
  }

  if (skipLiteral === true || includeLiteral === false) {
    return NEVER_INCLUDE;
  }

  const skipVariable = skipVar;
  const includeVariable = includeVar;
  return variableValues => {
    const coerced = variableValues.coerced as Record<string, unknown>;
    // Fast path only for strict booleans. Null / missing values must use
    // classic getDirectiveValues so `@skip`/`@include` `Boolean!` args still
    // error before resolvers run (skip-before-include order preserved).
    if (skipVariable != null) {
      const value = coerced[skipVariable];
      if (value !== true && value !== false) {
        return shouldIncludeNode(variableValues, node);
      }
      if (value === true) {
        return false;
      }
    }
    if (includeVariable != null) {
      const value = coerced[includeVariable];
      if (value !== true && value !== false) {
        return shouldIncludeNode(variableValues, node);
      }
      if (value === false) {
        return false;
      }
    }
    return true;
  };
}

/**
 * Compile `@skip`/`@include` on one field node into an include predicate.
 */
export function compileSingleFieldIncludePredicate(fieldNode: FieldNode): IncludePredicate {
  return compileSkipIncludePredicate(fieldNode);
}

/**
 * Compile `@skip`/`@include` across merged field nodes into a single predicate.
 * A response name is included when any contributing field node is included
 * (matches collectFields merge semantics). Field-directives only — for
 * fragment path gates use `conditionalCollect` grouping instead.
 */
export function compileFieldNodesIncludePredicate(
  fieldNodes: ReadonlyArray<FieldNode>,
): IncludePredicate {
  return orIncludePredicates(fieldNodes.map(compileSingleFieldIncludePredicate));
}
