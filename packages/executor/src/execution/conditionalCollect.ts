import {
  FieldNode,
  FragmentDefinitionNode,
  GraphQLObjectType,
  GraphQLSchema,
  Kind,
  SelectionSetNode,
} from 'graphql';
import { doesFragmentConditionMatch, getFieldEntryKey } from '@graphql-tools/utils';
import {
  ALWAYS_INCLUDE,
  andIncludePredicates,
  compileSkipIncludePredicate,
  NEVER_INCLUDE,
  orIncludePredicates,
  type IncludePredicate,
} from './skipIncludePredicates.js';

/**
 * One compiled field selection: response name + AST node + include predicate
 * (field directives ANDed with any enclosing fragment `@skip`/`@include`).
 */
export type ConditionalFieldEntry = {
  responseName: string;
  fieldNode: FieldNode;
  include: IncludePredicate;
};

export type ConditionalCollectProgram = ReadonlyArray<ConditionalFieldEntry> | null;

/**
 * Compile a selection set into field entries with path-aware `@skip`/`@include`
 * predicates (fields and enclosing inline fragments / fragment spreads).
 * Returns `false` when the shape needs classic collect (`@defer` / `@stream`,
 * or a second conditional spread of a fragment that cannot be represented).
 */
export function compileConditionalSelectionSet(
  schema: GraphQLSchema,
  fragments: Record<string, FragmentDefinitionNode>,
  runtimeType: GraphQLObjectType,
  selectionSet: SelectionSetNode,
  entries: ConditionalFieldEntry[],
  visitedFragmentNames: Set<string>,
  parentInclude: IncludePredicate = ALWAYS_INCLUDE,
  /**
   * Fragment spreads whose first visit was gated by a non-always predicate.
   * Shared across the whole walk (including multiple parent field nodes).
   */
  conditionalVisits: Set<string> = new Set(),
): boolean {
  for (const selection of selectionSet.selections) {
    switch (selection.kind) {
      case Kind.FIELD: {
        if (selectionHasDeferOrStream(selection)) {
          return false;
        }
        const include = andIncludePredicates(parentInclude, compileSkipIncludePredicate(selection));
        entries.push({
          responseName: getFieldEntryKey(selection),
          fieldNode: selection,
          include,
        });
        break;
      }
      case Kind.INLINE_FRAGMENT: {
        if (selectionHasDeferOrStream(selection)) {
          return false;
        }
        if (!doesFragmentConditionMatch(schema, selection, runtimeType)) {
          continue;
        }
        const fragInclude = andIncludePredicates(
          parentInclude,
          compileSkipIncludePredicate(selection),
        );
        if (fragInclude === NEVER_INCLUDE) {
          // Literal `@skip(if: true)` / `@include(if: false)` — omit subtree.
          break;
        }
        if (
          !compileConditionalSelectionSet(
            schema,
            fragments,
            runtimeType,
            selection.selectionSet,
            entries,
            visitedFragmentNames,
            fragInclude,
            conditionalVisits,
          )
        ) {
          return false;
        }
        break;
      }
      case Kind.FRAGMENT_SPREAD: {
        if (selectionHasDeferOrStream(selection)) {
          return false;
        }
        const fragName = selection.name.value;
        if (visitedFragmentNames.has(fragName)) {
          // Classic collect marks a spread visited only after it is included.
          // A prior conditional visit cannot stand in for a later spread.
          if (conditionalVisits.has(fragName)) {
            return false;
          }
          continue;
        }
        const fragment = fragments[fragName];
        if (!fragment || !doesFragmentConditionMatch(schema, fragment, runtimeType)) {
          continue;
        }
        visitedFragmentNames.add(fragName);
        const spreadInclude = andIncludePredicates(
          parentInclude,
          compileSkipIncludePredicate(selection),
        );
        if (spreadInclude !== ALWAYS_INCLUDE) {
          conditionalVisits.add(fragName);
        }
        if (spreadInclude === NEVER_INCLUDE) {
          break;
        }
        if (
          !compileConditionalSelectionSet(
            schema,
            fragments,
            runtimeType,
            fragment.selectionSet,
            entries,
            visitedFragmentNames,
            spreadInclude,
            conditionalVisits,
          )
        ) {
          return false;
        }
        break;
      }
      default:
        return false;
    }
  }
  return true;
}

function selectionHasDeferOrStream(selection: {
  directives?: ReadonlyArray<{ name: { value: string } }>;
}): boolean {
  for (const directive of selection.directives ?? []) {
    const name = directive.name.value;
    if (name === 'defer' || name === 'stream') {
      return true;
    }
  }
  return false;
}

/**
 * Group conditional entries by response name (OR of path predicates, merge
 * field nodes) — same merge semantics as collectFields.
 */
export function groupConditionalEntriesByResponseName(
  entries: ReadonlyArray<ConditionalFieldEntry>,
): Map<string, { fieldNodes: FieldNode[]; include: IncludePredicate }> {
  const grouped = new Map<string, { fieldNodes: FieldNode[]; predicates: IncludePredicate[] }>();
  for (const entry of entries) {
    const existing = grouped.get(entry.responseName);
    if (existing != null) {
      existing.fieldNodes.push(entry.fieldNode);
      existing.predicates.push(entry.include);
    } else {
      grouped.set(entry.responseName, {
        fieldNodes: [entry.fieldNode],
        predicates: [entry.include],
      });
    }
  }
  const out = new Map<string, { fieldNodes: FieldNode[]; include: IncludePredicate }>();
  for (const [responseName, group] of grouped) {
    out.set(responseName, {
      fieldNodes: group.fieldNodes,
      include: orIncludePredicates(group.predicates),
    });
  }
  return out;
}
