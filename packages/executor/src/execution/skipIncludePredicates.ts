import {
  DocumentNode,
  FieldNode,
  FragmentSpreadNode,
  GraphQLError,
  InlineFragmentNode,
  Kind,
  versionInfo,
} from 'graphql';
import { shouldIncludeNode, VariableValues } from '@graphql-tools/utils';

const isGraphQL17 = versionInfo.major >= 17;

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
  // Precompute error message strings + nodes at plan compile (Stage C #13).
  // Warm boolean path only reads skipVariable/includeVariable — same shape as
  // pre-#13; factories are not allocated, throws only on null/missing.
  const skipErr =
    skipVariable != null ? compileDirectiveIfErrorParts(node, 'skip', skipVariable) : undefined;
  const includeErr =
    includeVariable != null
      ? compileDirectiveIfErrorParts(node, 'include', includeVariable)
      : undefined;
  return variableValues => {
    const coerced = variableValues.coerced as Record<string, unknown>;
    // Strict-boolean warm path first (identical control flow to pre-#13).
    // Null / missing → plan-held GraphQLError; other non-booleans → classic.
    if (skipVariable != null) {
      const value = coerced[skipVariable];
      if (value === true) {
        return false;
      }
      if (value !== false) {
        return throwDirectiveIfError(skipErr!, skipVariable, coerced, value, variableValues, node);
      }
    }
    if (includeVariable != null) {
      const value = coerced[includeVariable];
      if (value === false) {
        return false;
      }
      if (value !== true) {
        return throwDirectiveIfError(
          includeErr!,
          includeVariable,
          coerced,
          value,
          variableValues,
          node,
        );
      }
    }
    return true;
  };
}

type DirectiveIfErrorParts = {
  nullMessage: string;
  missingMessage: string;
  nodes: SkipIncludeNode | import('graphql').ArgumentNode | import('graphql').ValueNode;
};

function compileDirectiveIfErrorParts(
  node: SkipIncludeNode,
  directiveName: 'skip' | 'include',
  variableName: string,
): DirectiveIfErrorParts {
  const directive = node.directives?.find(d => d.name.value === directiveName);
  const ifArg = directive?.arguments?.find(a => a.name.value === 'if');
  const variableNode = ifArg?.value.kind === Kind.VARIABLE ? ifArg.value : node;

  if (isGraphQL17) {
    return {
      nullMessage: `Argument "@${directiveName}(if:)" has invalid value: Expected variable "$${variableName}" provided to non-null type "Boolean!" not to be null.`,
      missingMessage: `Argument "@${directiveName}(if:)" has invalid value: Expected variable "$${variableName}" provided to type "Boolean!" to provide a runtime value.`,
      nodes: variableNode,
    };
  }
  return {
    nullMessage: 'Argument "if" of non-null type "Boolean!" must not be null.',
    missingMessage: `Argument "if" of required type "Boolean!" was provided the variable "$${variableName}" which was not provided a runtime value.`,
    nodes: ifArg ?? node,
  };
}

function throwDirectiveIfError(
  parts: DirectiveIfErrorParts,
  variableName: string,
  coerced: Record<string, unknown>,
  value: unknown,
  variableValues: VariableValues,
  node: SkipIncludeNode,
): boolean {
  if (value === null) {
    throw new GraphQLError(parts.nullMessage, { nodes: parts.nodes });
  }
  if (!Object.prototype.hasOwnProperty.call(coerced, variableName)) {
    throw new GraphQLError(parts.missingMessage, { nodes: parts.nodes });
  }
  // Non-boolean weird runtime value — classic getDirectiveValues parity.
  return shouldIncludeNode(variableValues, node);
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
