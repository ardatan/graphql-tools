import {
  defaultFieldResolver,
  FieldNode,
  FragmentDefinitionNode,
  getArgumentValues,
  GraphQLAbstractType,
  GraphQLError,
  GraphQLField,
  GraphQLLeafType,
  GraphQLObjectType,
  GraphQLOutputType,
  GraphQLSchema,
  isAbstractType,
  isLeafType,
  isListType,
  isNonNullType,
  isObjectType,
  Kind,
  OperationDefinitionNode,
  SchemaMetaFieldDef,
  TypeMetaFieldDef,
  TypeNameMetaFieldDef,
  versionInfo,
  type DocumentNode,
  type ValueNode,
} from 'graphql';
import {
  collectFields,
  collectFieldsDependsOnVariables,
  collectSubFields,
  getDefinedRootType,
  VariableValues,
} from '@graphql-tools/utils';
import { TypedDocumentNode } from '@graphql-typed-document-node/core';

const isGraphQL17 = versionInfo.major >= 17;

const EMPTY_ARGS: { [argument: string]: unknown } = Object.freeze(Object.create(null));
const EMPTY_VARIABLE_VALUES: VariableValues = Object.freeze({
  coerced: Object.freeze(Object.create(null)),
  sources: Object.freeze(Object.create(null)),
});

const INCREMENTAL_DIRECTIVES = new Set(['defer', 'stream']);

/**
 * When the field returns a list of scalars/enums (optionally non-null items),
 * the warm plan path can complete arrays without re-classifying the item type.
 */
export interface PlannedLeafList {
  leafType: GraphQLLeafType;
  /** True when list items are wrapped in NonNull. */
  itemNonNull: boolean;
}

/**
 * Compiled argument reader for the warm plan path.
 * - `empty` / `static`: no runtime coercion
 * - omitted (`undefined` on FieldPlan): fall back to `getArgumentValues`
 *   (including bare-variable args, so nullability / missing-variable errors
 *   stay identical to graphql-js)
 */
export type ArgumentReader =
  { kind: 'empty' } | { kind: 'static'; args: { [argument: string]: unknown } };

/**
 * Per-field static facts compiled once for a (schema, document, operation) plan.
 * Shared across warm executions so the thin interpreter can skip field lookup,
 * type classification, and (when safe) argument coercion / resolveInfo setup.
 */
export interface FieldPlan {
  fieldDef: GraphQLField<unknown, unknown>;
  fieldNodes: Array<FieldNode>;
  responseName: string;
  parentType: GraphQLObjectType;
  returnType: GraphQLOutputType;
  nonNull: boolean;
  leafType: GraphQLLeafType | undefined;
  /**
   * Set when the field's named return type (after NonNull) is a list of leaves.
   */
  listItemLeaf: PlannedLeafList | undefined;
  hasArgs: boolean;
  /**
   * When all argument ASTs are variable-free, args are coerced once at compile
   * time. Prefer `argumentReader` on the warm path; kept for callers that only
   * check static maps.
   */
  staticArgs: { [argument: string]: unknown } | undefined;
  /** Compiled argument strategy for this field (see ArgumentReader). */
  argumentReader: ArgumentReader | undefined;
  /**
   * True when `fieldDef.resolve` is unset or is the GraphQL default resolver.
   * Runtime still gates on `exeContext.fieldResolver === defaultFieldResolver`.
   */
  mayUseDefaultLeafPath: boolean;
}

/**
 * Cacheable execution plan (plan/compile path, not a generated executor).
 *
 * Holds pre-collected field maps and per-field static metadata for documents
 * whose collected field sets do not depend on variable values and that do not
 * use `@defer` / `@stream`. Stitching / federation can compile once and swap
 * the thin interpreter later; the default `execute` path uses this plan when
 * eligible.
 */
export interface ExecutionPlan {
  schema: GraphQLSchema;
  document: DocumentNode;
  operation: OperationDefinitionNode;
  operationName: string | undefined;
  fragments: Record<string, FragmentDefinitionNode>;
  rootType: GraphQLObjectType;
  /** Pre-collected root field map (stable documents only). */
  rootFields: Map<string, Array<FieldNode>>;
  /** Field plan keyed by the exact `fieldNodes` array identity from this plan. */
  fieldPlanByNodes: WeakMap<ReadonlyArray<FieldNode>, FieldPlan>;
  /**
   * Subfield maps keyed by parent fieldNodes array then concrete return type.
   * List items of the same type reuse the same map identity.
   */
  subfieldsByNodes: WeakMap<
    ReadonlyArray<FieldNode>,
    WeakMap<GraphQLObjectType, Map<string, Array<FieldNode>>>
  >;
}

export interface CompileExecutionPlanArgs {
  schema: GraphQLSchema;
  document: TypedDocumentNode<any, any> | DocumentNode;
  operationName?: string | null;
}

type PlanCacheEntry =
  | { kind: 'plan'; plan: ExecutionPlan }
  | { kind: 'ineligible' }
  | { kind: 'errors'; errors: ReadonlyArray<GraphQLError> };

/**
 * document → schema → operationName → compiled entry.
 * Ineligible documents are remembered so we do not re-walk the AST every time.
 */
const planCache = new WeakMap<DocumentNode, WeakMap<GraphQLSchema, Map<string, PlanCacheEntry>>>();

/**
 * True when `compileExecutionPlan` returned a usable plan (not errors / skip).
 */
export function isExecutionPlan(
  value: ExecutionPlan | ReadonlyArray<GraphQLError> | undefined | null,
): value is ExecutionPlan {
  return value != null && !Array.isArray(value);
}

/**
 * Compile a cacheable execution plan for a validated operation.
 *
 * Returns `undefined` when the document is not eligible (variable-conditional
 * `@skip` / `@include` / `@defer`, or any `@defer` / `@stream`). Returns a
 * GraphQL error list when the operation cannot be resolved.
 */
export function compileExecutionPlan(
  args: CompileExecutionPlanArgs,
): ExecutionPlan | ReadonlyArray<GraphQLError> | undefined {
  const cached = getCachedPlanEntry(args.schema, args.document, args.operationName);
  if (cached) {
    if (cached.kind === 'plan') {
      return cached.plan;
    }
    if (cached.kind === 'errors') {
      return cached.errors;
    }
    return undefined;
  }

  const entry = compileExecutionPlanUncached(args);
  setCachedPlanEntry(args.schema, args.document, args.operationName, entry);
  if (entry.kind === 'plan') {
    return entry.plan;
  }
  if (entry.kind === 'errors') {
    return entry.errors;
  }
  return undefined;
}

/**
 * Look up a previously compiled plan without compiling. Returns `undefined`
 * when missing or ineligible.
 */
export function getExecutionPlan(
  schema: GraphQLSchema,
  document: DocumentNode,
  operationName?: string | null,
): ExecutionPlan | undefined {
  const cached = getCachedPlanEntry(schema, document, operationName);
  return cached?.kind === 'plan' ? cached.plan : undefined;
}

/**
 * Drop cached plans for a document (all schemas / operations). Useful when a
 * test mutates schema field configs that plans may have captured.
 */
export function clearExecutionPlanCache(document?: DocumentNode): void {
  if (document) {
    planCache.delete(document);
  }
  // WeakMap has no clear; callers pass a document when they need invalidation.
}

function operationCacheKey(operationName: string | null | undefined): string {
  return operationName ?? '';
}

function getCachedPlanEntry(
  schema: GraphQLSchema,
  document: DocumentNode,
  operationName: string | null | undefined,
): PlanCacheEntry | undefined {
  return planCache.get(document)?.get(schema)?.get(operationCacheKey(operationName));
}

function setCachedPlanEntry(
  schema: GraphQLSchema,
  document: DocumentNode,
  operationName: string | null | undefined,
  entry: PlanCacheEntry,
): void {
  let bySchema = planCache.get(document);
  if (!bySchema) {
    bySchema = new WeakMap();
    planCache.set(document, bySchema);
  }
  let byOperation = bySchema.get(schema);
  if (!byOperation) {
    byOperation = new Map();
    bySchema.set(schema, byOperation);
  }
  byOperation.set(operationCacheKey(operationName), entry);
}

function compileExecutionPlanUncached(args: CompileExecutionPlanArgs): PlanCacheEntry {
  const { schema, document, operationName } = args;

  if (collectFieldsDependsOnVariables(document) || documentHasIncrementalDirectives(document)) {
    return { kind: 'ineligible' };
  }

  const fragments = collectFragments(document);
  const operationResult = resolveOperation(document, operationName);
  if ('errors' in operationResult) {
    return { kind: 'errors', errors: operationResult.errors };
  }
  const { operation } = operationResult;

  let rootType: GraphQLObjectType;
  try {
    rootType = getDefinedRootType(schema, operation.operation, [operation]);
  } catch (error) {
    return {
      kind: 'errors',
      errors: [error instanceof GraphQLError ? error : new GraphQLError(String(error))],
    };
  }

  const { fields: rootFields, patches } = collectFields(
    schema,
    fragments,
    EMPTY_VARIABLE_VALUES,
    rootType,
    operation.selectionSet,
  );
  if (patches.length > 0) {
    return { kind: 'ineligible' };
  }

  const fieldPlanByNodes = new WeakMap<ReadonlyArray<FieldNode>, FieldPlan>();
  const subfieldsByNodes = new WeakMap<
    ReadonlyArray<FieldNode>,
    WeakMap<GraphQLObjectType, Map<string, Array<FieldNode>>>
  >();

  const plan: ExecutionPlan = {
    schema,
    document,
    operation,
    operationName: operationName ?? undefined,
    fragments,
    rootType,
    rootFields,
    fieldPlanByNodes,
    subfieldsByNodes,
  };

  compileFieldMap(plan, rootType, rootFields);
  return { kind: 'plan', plan };
}

function compileFieldMap(
  plan: ExecutionPlan,
  parentType: GraphQLObjectType,
  fields: Map<string, Array<FieldNode>>,
): void {
  for (const [responseName, fieldNodes] of fields) {
    const fieldPlan = compileFieldPlan(plan, parentType, responseName, fieldNodes);
    if (fieldPlan) {
      plan.fieldPlanByNodes.set(fieldNodes, fieldPlan);
      compileReturnTypeSubfields(plan, fieldPlan);
    }
  }
}

function compileFieldPlan(
  plan: ExecutionPlan,
  parentType: GraphQLObjectType,
  responseName: string,
  fieldNodes: Array<FieldNode>,
): FieldPlan | undefined {
  const fieldDef = getFieldDefForPlan(plan.schema, parentType, fieldNodes[0]);
  if (!fieldDef) {
    return undefined;
  }

  let type: GraphQLOutputType = fieldDef.type;
  let nonNull = false;
  if (isNonNullType(type)) {
    nonNull = true;
    type = type.ofType;
  }

  const leafType = isLeafType(type) ? type : undefined;
  const listItemLeaf = compileListItemLeaf(type);
  const fieldResolve = fieldDef.resolve;
  // Unset resolve or explicit `resolve: defaultFieldResolver` may take the
  // leaf / leaf-list fast path when the effective runtime resolver is still default.
  const mayUseDefaultLeafPath =
    (leafType != null || listItemLeaf != null) &&
    (fieldResolve == null || fieldResolve === defaultFieldResolver);
  const hasArgs = fieldDef.args.length > 0;
  const { staticArgs, argumentReader } = compileArgumentReader(fieldDef, fieldNodes[0], hasArgs);

  return {
    fieldDef,
    fieldNodes,
    responseName,
    parentType,
    returnType: fieldDef.type,
    nonNull,
    leafType,
    listItemLeaf,
    hasArgs,
    staticArgs,
    argumentReader,
    mayUseDefaultLeafPath,
  };
}

/**
 * If `type` is List or NonNull(List) of (NonNull) leaf, return leaf completion facts.
 */
export function compileListItemLeaf(type: GraphQLOutputType): PlannedLeafList | undefined {
  let current: GraphQLOutputType = type;
  if (isNonNullType(current)) {
    current = current.ofType;
  }
  if (!isListType(current)) {
    return undefined;
  }
  let item: GraphQLOutputType = current.ofType;
  let itemNonNull = false;
  if (isNonNullType(item)) {
    itemNonNull = true;
    item = item.ofType;
  }
  if (!isLeafType(item)) {
    return undefined;
  }
  return { leafType: item, itemNonNull };
}

function compileArgumentReader(
  fieldDef: GraphQLField<unknown, unknown>,
  fieldNode: FieldNode,
  hasArgs: boolean,
): {
  staticArgs: { [argument: string]: unknown } | undefined;
  argumentReader: ArgumentReader | undefined;
} {
  if (!hasArgs) {
    return { staticArgs: EMPTY_ARGS, argumentReader: { kind: 'empty' } };
  }

  if (!fieldArgumentsContainVariable(fieldNode)) {
    // Pre-coerce only when literals are valid with empty variables. Missing
    // required args / bad literals must surface at execution time (same as
    // the classic path), so leave readers unset and coerce via getArgumentValues.
    try {
      const staticArgs = Object.freeze(
        Object.assign(
          Object.create(null),
          getArgumentValuesForPlan(fieldDef, fieldNode, EMPTY_VARIABLE_VALUES),
        ),
      );
      return { staticArgs, argumentReader: { kind: 'static', args: staticArgs } };
    } catch {
      return { staticArgs: undefined, argumentReader: undefined };
    }
  }

  return { staticArgs: undefined, argumentReader: undefined };
}

function compileReturnTypeSubfields(plan: ExecutionPlan, fieldPlan: FieldPlan): void {
  const namedType = unwrapToNamedOutputType(fieldPlan.fieldDef.type);

  if (isObjectType(namedType)) {
    const subfields = collectAndStoreSubfields(plan, fieldPlan.fieldNodes, namedType);
    if (subfields) {
      compileFieldMap(plan, namedType, subfields);
    }
    return;
  }

  if (isAbstractType(namedType)) {
    const possibleTypes = plan.schema.getPossibleTypes(namedType as GraphQLAbstractType);
    for (const concrete of possibleTypes) {
      const subfields = collectAndStoreSubfields(plan, fieldPlan.fieldNodes, concrete);
      if (subfields) {
        compileFieldMap(plan, concrete, subfields);
      }
    }
  }
}

function collectAndStoreSubfields(
  plan: ExecutionPlan,
  fieldNodes: Array<FieldNode>,
  returnType: GraphQLObjectType,
): Map<string, Array<FieldNode>> | undefined {
  const { fields, patches } = collectSubFields(
    plan.schema,
    plan.fragments,
    EMPTY_VARIABLE_VALUES,
    returnType,
    fieldNodes,
  );
  if (patches.length > 0) {
    return undefined;
  }

  let byType = plan.subfieldsByNodes.get(fieldNodes);
  if (!byType) {
    byType = new WeakMap();
    plan.subfieldsByNodes.set(fieldNodes, byType);
  }
  byType.set(returnType, fields);
  return fields;
}

function unwrapToNamedOutputType(type: GraphQLOutputType): GraphQLOutputType {
  let current: GraphQLOutputType = type;
  while (isNonNullType(current) || isListType(current)) {
    current = current.ofType;
  }
  return current;
}

function getArgumentValuesForPlan(
  fieldDef: GraphQLField<unknown, unknown>,
  fieldNode: FieldNode,
  variableValues: VariableValues,
): { [argument: string]: unknown } {
  const valuesForArgs = isGraphQL17 ? variableValues : variableValues.coerced;
  return getArgumentValues(fieldDef, fieldNode, valuesForArgs as any);
}

function fieldArgumentsContainVariable(fieldNode: FieldNode): boolean {
  if (!fieldNode.arguments?.length) {
    return false;
  }
  for (const arg of fieldNode.arguments) {
    if (valueContainsVariable(arg.value)) {
      return true;
    }
  }
  return false;
}

function valueContainsVariable(value: ValueNode): boolean {
  switch (value.kind) {
    case Kind.VARIABLE:
      return true;
    case Kind.LIST:
      return value.values.some(valueContainsVariable);
    case Kind.OBJECT:
      return value.fields.some(field => valueContainsVariable(field.value));
    default:
      return false;
  }
}

function documentHasIncrementalDirectives(document: DocumentNode): boolean {
  for (const definition of document.definitions) {
    if (
      definition.kind === Kind.OPERATION_DEFINITION ||
      definition.kind === Kind.FRAGMENT_DEFINITION
    ) {
      if (selectionSetHasIncremental(definition.selectionSet)) {
        return true;
      }
    }
  }
  return false;
}

function selectionSetHasIncremental(selectionSet: {
  selections: ReadonlyArray<{
    kind: string;
    directives?: ReadonlyArray<{ name: { value: string } }>;
    selectionSet?: { selections: ReadonlyArray<any> };
  }>;
}): boolean {
  for (const selection of selectionSet.selections) {
    if (selection.directives) {
      for (const directive of selection.directives) {
        if (INCREMENTAL_DIRECTIVES.has(directive.name.value)) {
          return true;
        }
      }
    }
    if (selection.kind === Kind.FIELD && selection.selectionSet) {
      if (selectionSetHasIncremental(selection.selectionSet)) {
        return true;
      }
    } else if (selection.kind === Kind.INLINE_FRAGMENT && selection.selectionSet) {
      if (selectionSetHasIncremental(selection.selectionSet)) {
        return true;
      }
    }
  }
  return false;
}

function collectFragments(document: DocumentNode): Record<string, FragmentDefinitionNode> {
  const fragments = Object.create(null) as Record<string, FragmentDefinitionNode>;
  for (const definition of document.definitions) {
    if (definition.kind === Kind.FRAGMENT_DEFINITION) {
      fragments[definition.name.value] = definition;
    }
  }
  return fragments;
}

function resolveOperation(
  document: DocumentNode,
  operationName: string | null | undefined,
): { operation: OperationDefinitionNode } | { errors: ReadonlyArray<GraphQLError> } {
  let operation: OperationDefinitionNode | undefined;
  for (const definition of document.definitions) {
    if (definition.kind !== Kind.OPERATION_DEFINITION) {
      continue;
    }
    if (operationName == null) {
      if (operation !== undefined) {
        return {
          errors: [
            new GraphQLError('Must provide operation name if query contains multiple operations.', {
              extensions: {
                code: 'OPERATION_RESOLUTION_FAILURE',
              },
            }),
          ],
        };
      }
      operation = definition;
    } else if (definition.name?.value === operationName) {
      operation = definition;
    }
  }

  if (operation == null) {
    if (operationName != null) {
      return {
        errors: [
          new GraphQLError(`Unknown operation named "${operationName}".`, {
            extensions: {
              code: 'OPERATION_RESOLUTION_FAILURE',
            },
          }),
        ],
      };
    }
    return {
      errors: [
        new GraphQLError('Must provide an operation.', {
          extensions: {
            code: 'OPERATION_RESOLUTION_FAILURE',
          },
        }),
      ],
    };
  }

  return { operation };
}

function getFieldDefForPlan(
  schema: GraphQLSchema,
  parentType: GraphQLObjectType,
  fieldNode: FieldNode,
): GraphQLField<unknown, unknown> | undefined {
  const fieldName = fieldNode.name.value;
  if (fieldName === SchemaMetaFieldDef.name && schema.getQueryType() === parentType) {
    return SchemaMetaFieldDef;
  }
  if (fieldName === TypeMetaFieldDef.name && schema.getQueryType() === parentType) {
    return TypeMetaFieldDef;
  }
  if (fieldName === TypeNameMetaFieldDef.name) {
    return TypeNameMetaFieldDef;
  }
  return parentType.getFields()[fieldName];
}
