import {
  defaultFieldResolver,
  FieldNode,
  getArgumentValues,
  GraphQLAbstractType,
  GraphQLError,
  GraphQLField,
  GraphQLObjectType,
  GraphQLOutputType,
  GraphQLSchema,
  isAbstractType,
  isLeafType,
  isListType,
  isNonNullType,
  isObjectType,
  Kind,
  SchemaMetaFieldDef,
  TypeMetaFieldDef,
  TypeNameMetaFieldDef,
  valueFromAST,
  type ArgumentNode,
  type GraphQLArgument,
  type ValueNode,
} from 'graphql';
import { collectSubFields, VariableValues } from '@graphql-tools/utils';
import {
  compileConditionalSelectionSet,
  groupConditionalEntriesByResponseName,
  type ConditionalFieldEntry,
} from './conditionalCollect.js';
import { EMPTY_ARGS, EMPTY_VARIABLE_VALUES, isGraphQL17 } from './planShared.js';
import type {
  ArgumentReader,
  CompletionKind,
  ExecutionPlan,
  FieldPlan,
  PlannedFieldExecution,
  PlannedLeafList,
  PlannedObjectList,
  ResolveKind,
} from './planTypes.js';
import {
  ALWAYS_INCLUDE,
  compileSkipIncludePredicate,
  type IncludePredicate,
} from './skipIncludePredicates.js';

export function compilePatchFieldMaps(
  plan: ExecutionPlan,
  parentType: GraphQLObjectType,
  patches: ReadonlyArray<{
    fields: Map<string, Array<FieldNode>>;
    patches?: ReadonlyArray<any>;
  }>,
): void {
  for (const patch of patches) {
    compileFieldMap(plan, parentType, patch.fields);
    if (patch.patches?.length) {
      compilePatchFieldMaps(plan, parentType, patch.patches);
    }
  }
}

function resolveFieldPlanForParent(
  plan: ExecutionPlan,
  parentType: GraphQLObjectType,
  fieldNodes: ReadonlyArray<FieldNode>,
): FieldPlan | undefined {
  // Exact array hit still requires parentType match (unions / interfaces).
  const byNodes = plan.fieldPlanByNodes.get(fieldNodes);
  if (byNodes != null && byNodes.parentType === parentType) {
    return byNodes;
  }
  const byNode = plan.fieldPlanByFieldNode.get(fieldNodes[0]!);
  if (byNode != null && byNode.parentType === parentType) {
    return byNode;
  }
  return undefined;
}

export function buildFieldExecutions(
  plan: ExecutionPlan,
  parentType: GraphQLObjectType,
  fields: Map<string, Array<FieldNode>>,
  includeByResponseName?: Map<string, IncludePredicate>,
): PlannedFieldExecution[] {
  const executions: PlannedFieldExecution[] = [];
  for (const [responseName, fieldNodes] of fields) {
    const fieldPlan = resolveFieldPlanForParent(plan, parentType, fieldNodes);
    if (fieldPlan) {
      const execution: PlannedFieldExecution = {
        responseName,
        fieldNodes,
        fieldPlan,
      };
      const include = includeByResponseName?.get(responseName);
      if (include != null) {
        execution.include = include;
      }
      executions.push(execution);
    }
  }
  return executions;
}

/**
 * Build planned executions with path-aware `@skip`/`@include` predicates by
 * walking the selection set (fields + enclosing fragments).
 * Returns `undefined` if the walk hits `@defer`/`@stream` (should not happen
 * for plan-eligible docs) so runtime can fall back to classic collect.
 */
export function buildExecutionsFromSelectionSet(
  plan: ExecutionPlan,
  runtimeType: GraphQLObjectType,
  selectionSet: import('graphql').SelectionSetNode,
  preferredFieldMap?: Map<string, Array<FieldNode>>,
): PlannedFieldExecution[] | undefined {
  const entries: ConditionalFieldEntry[] = [];
  if (
    !compileConditionalSelectionSet(
      plan.schema,
      plan.fragments,
      runtimeType,
      selectionSet,
      entries,
      new Set(),
      ALWAYS_INCLUDE,
    )
  ) {
    return undefined;
  }
  return buildExecutionsFromConditionalEntries(plan, runtimeType, entries, preferredFieldMap);
}

function buildExecutionsFromParentFieldNodes(
  plan: ExecutionPlan,
  returnType: GraphQLObjectType,
  parentFieldNodes: ReadonlyArray<FieldNode>,
  preferredFieldMap?: Map<string, Array<FieldNode>>,
): PlannedFieldExecution[] | undefined {
  const entries: ConditionalFieldEntry[] = [];
  const visitedFragmentNames = new Set<string>();
  const conditionalVisits = new Set<string>();
  for (const fieldNode of parentFieldNodes) {
    if (fieldNode.selectionSet == null) {
      continue;
    }
    // Inherit this contributing parent's own `@skip`/`@include` so subfields
    // from a conditional merge peer stay gated (classic collect semantics).
    const parentInclude = compileSkipIncludePredicate(fieldNode);
    if (
      !compileConditionalSelectionSet(
        plan.schema,
        plan.fragments,
        returnType,
        fieldNode.selectionSet,
        entries,
        visitedFragmentNames,
        parentInclude,
        conditionalVisits,
      )
    ) {
      return undefined;
    }
  }
  return buildExecutionsFromConditionalEntries(plan, returnType, entries, preferredFieldMap);
}

function buildExecutionsFromConditionalEntries(
  plan: ExecutionPlan,
  parentType: GraphQLObjectType,
  entries: ReadonlyArray<ConditionalFieldEntry>,
  /**
   * When provided (root or planned subfield map), reuse that array identity so
   * `fieldPlanByNodes` WeakMap hits stay exact on the warm path.
   */
  preferredFieldMap?: Map<string, Array<FieldNode>>,
): PlannedFieldExecution[] | undefined {
  const grouped = groupConditionalEntriesByResponseName(entries);
  const executions: PlannedFieldExecution[] = [];
  for (const [responseName, group] of grouped) {
    const preferred = preferredFieldMap?.get(responseName);
    const fieldNodes =
      preferred != null &&
      preferred.length === group.fieldNodes.length &&
      preferred.every((node, i) => node === group.fieldNodes[i])
        ? preferred
        : group.fieldNodes;
    const fieldPlan = resolveFieldPlanForParent(plan, parentType, fieldNodes);
    let resolvedPlan = fieldPlan;
    if (resolvedPlan == null) {
      // Dual @skip/@include (and similar) fields are absent from bool-extreme
      // rootMaps — compile a FieldPlan from the selection nodes instead of
      // abandoning the whole skipIncludePredicates path (dense-skip tax).
      const compiled = compileFieldPlan(
        plan,
        parentType,
        responseName,
        fieldNodes as Array<FieldNode>,
      );
      if (compiled == null) {
        return undefined;
      }
      plan.fieldPlanByNodes.set(fieldNodes as Array<FieldNode>, compiled);
      for (const fieldNode of fieldNodes) {
        plan.fieldPlanByFieldNode.set(fieldNode, compiled);
      }
      compileReturnTypeSubfields(plan, compiled);
      resolvedPlan = compiled;
    }
    executions.push({
      responseName,
      fieldNodes,
      fieldPlan: resolvedPlan,
      include: group.include,
    });
  }
  return executions;
}

export function compileFieldMap(
  plan: ExecutionPlan,
  parentType: GraphQLObjectType,
  fields: Map<string, Array<FieldNode>>,
): void {
  for (const [responseName, fieldNodes] of fields) {
    const fieldPlan = compileFieldPlan(plan, parentType, responseName, fieldNodes);
    if (fieldPlan) {
      plan.fieldPlanByNodes.set(fieldNodes, fieldPlan);
      for (const fieldNode of fieldNodes) {
        plan.fieldPlanByFieldNode.set(fieldNode, fieldPlan);
      }
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
  const listItemObject = listItemLeaf == null ? compileListItemObject(type) : undefined;
  const completionKind = classifyCompletionKind(type, listItemLeaf);
  const objectType = completionKind === 'object' && isObjectType(type) ? type : undefined;
  const skipIsTypeOf = objectType != null && objectType.isTypeOf == null;
  const fieldResolve = fieldDef.resolve;
  const resolveKind: ResolveKind =
    fieldResolve != null && fieldResolve !== defaultFieldResolver
      ? 'schemaResolve'
      : 'defaultProperty';
  const hasArgs = fieldDef.args.length > 0;
  const { staticArgs, argumentReader, readArguments } = compileArgumentReader(
    fieldDef,
    fieldNodes[0]!,
    hasArgs,
    parentType,
  );

  const returnType = fieldDef.type;
  const fieldPlan: FieldPlan = {
    fieldDef,
    fieldNodes,
    responseName,
    parentType,
    returnType,
    nonNull,
    leafType,
    listItemLeaf,
    listItemObject,
    completionKind,
    objectType,
    skipIsTypeOf,
    resolveKind,
    hasArgs,
    staticArgs,
    argumentReader,
    readArguments,
    resolveInfoStatic: {
      fieldName: fieldDef.name,
      fieldNodes,
      returnType,
      parentType,
    },
  };
  // Only incremental plans carry stream facts , keep non-incremental FieldPlan
  // shapes identical to Stage A for warm-path IC / GC.
  if (plan.hasIncremental) {
    fieldPlan.stream = compileStreamPlan(fieldNodes[0]!);
  }
  return fieldPlan;
}

function compileStreamPlan(fieldNode: FieldNode): NonNullable<FieldPlan['stream']> {
  const directives = fieldNode.directives;
  if (directives == null || directives.length === 0) {
    return { kind: 'none' };
  }
  let streamDir: (typeof directives)[number] | undefined;
  for (const directive of directives) {
    if (directive.name.value === 'stream') {
      streamDir = directive;
      break;
    }
  }
  if (streamDir == null) {
    return { kind: 'none' };
  }
  let initialCount: number | undefined;
  let sawInitialCount = false;
  let label: string | undefined;
  let ifValue: boolean | undefined;
  for (const arg of streamDir.arguments ?? []) {
    if (arg.value.kind === Kind.VARIABLE) {
      return { kind: 'dynamic' };
    }
    switch (arg.name.value) {
      case 'initialCount':
        if (arg.value.kind === Kind.INT) {
          initialCount = Number(arg.value.value);
          sawInitialCount = true;
        } else {
          return { kind: 'dynamic' };
        }
        break;
      case 'label':
        if (arg.value.kind === Kind.STRING) {
          label = arg.value.value;
        } else if (arg.value.kind === Kind.NULL) {
          label = undefined;
        } else {
          return { kind: 'dynamic' };
        }
        break;
      case 'if':
        if (arg.value.kind === Kind.BOOLEAN) {
          ifValue = arg.value.value;
        } else {
          return { kind: 'dynamic' };
        }
        break;
      default:
        break;
    }
  }
  if (ifValue === false) {
    return { kind: 'none' };
  }
  // Without an explicit initialCount, graphql applies the directive default ,
  // keep that path in getDirectiveValues.
  if (!sawInitialCount) {
    return { kind: 'dynamic' };
  }
  return { kind: 'static', initialCount, label };
}

function classifyCompletionKind(
  typeAfterNonNull: GraphQLOutputType,
  listItemLeaf: PlannedLeafList | undefined,
): CompletionKind {
  if (isLeafType(typeAfterNonNull)) {
    return 'leaf';
  }
  if (isListType(typeAfterNonNull)) {
    return listItemLeaf ? 'leafList' : 'list';
  }
  if (isObjectType(typeAfterNonNull)) {
    return 'object';
  }
  if (isAbstractType(typeAfterNonNull)) {
    return 'abstract';
  }
  return 'list';
}

/**
 * If `type` is List or NonNull(List) of (NonNull) leaf, return leaf completion facts.
 */
function compileListItemLeaf(type: GraphQLOutputType): PlannedLeafList | undefined {
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

/**
 * If `type` is List or NonNull(List) of (NonNull) concrete object without
 * `isTypeOf`, return object-list completion facts for the nested warm path.
 */
function compileListItemObject(type: GraphQLOutputType): PlannedObjectList | undefined {
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
  if (!isObjectType(item) || item.isTypeOf != null) {
    return undefined;
  }
  return { objectType: item, itemNonNull };
}

function compileArgumentReader(
  fieldDef: GraphQLField<unknown, unknown>,
  fieldNode: FieldNode,
  hasArgs: boolean,
  parentType: GraphQLObjectType,
): {
  staticArgs: { [argument: string]: unknown } | undefined;
  argumentReader: ArgumentReader | undefined;
  readArguments: (variableValues: VariableValues) => { [argument: string]: unknown };
} {
  if (!hasArgs) {
    const argumentReader: ArgumentReader = { kind: 'empty' };
    return {
      staticArgs: EMPTY_ARGS,
      argumentReader,
      readArguments: () => EMPTY_ARGS,
    };
  }

  if (!fieldArgumentsContainVariable(fieldNode)) {
    // Pre-coerce only when literals are valid with empty variables. Missing
    // required args / bad literals (#5): plan-held GraphQLError replay.
    try {
      // Template only — each read returns a fresh object so resolvers that
      // mutate args (or nested inputs) cannot leak across requests.
      const staticArgs = Object.assign(
        Object.create(null),
        getArgumentValuesForPlan(fieldDef, fieldNode, EMPTY_VARIABLE_VALUES),
      );
      const argumentReader: ArgumentReader = { kind: 'static', args: staticArgs };
      return {
        staticArgs,
        argumentReader,
        readArguments: () => getArgumentValuesForPlan(fieldDef, fieldNode, EMPTY_VARIABLE_VALUES),
      };
    } catch (err) {
      const held = holdArgumentError(err);
      const read = () => {
        throw held();
      };
      return {
        staticArgs: undefined,
        argumentReader: { kind: 'coercer', read },
        readArguments: read,
      };
    }
  }

  const bareBindings = tryBareVariableBindings(fieldDef, fieldNode, parentType);
  if (bareBindings) {
    const missingAstMessageByArg = compileMissingAstArgMessages(fieldDef, fieldNode, parentType);
    const read = (variableValues: VariableValues) => {
      const fast = tryReadBareVariableArguments(
        fieldDef,
        fieldNode,
        bareBindings,
        variableValues,
        missingAstMessageByArg,
      );
      if (fast !== undefined) {
        return fast;
      }
      return getArgumentValuesForPlan(fieldDef, fieldNode, variableValues);
    };
    return {
      staticArgs: undefined,
      argumentReader: { kind: 'coercer', read },
      readArguments: read,
    };
  }

  // Embedded variables inside literals (#4): plan-bound getArgumentValues
  // (custom scalars / JSON nested sources need full graphql-js substitution).
  const missingAst = compileMissingAstArgMessages(fieldDef, fieldNode, parentType);
  const read = (variableValues: VariableValues) => {
    // Required args absent from AST: plan-held throw before getArgumentValues.
    if (missingAst.size > 0) {
      for (const argDef of fieldDef.args) {
        const message = missingAst.get(argDef.name);
        if (message != null && getFieldArgDefaultValue(argDef) === undefined) {
          // Only throw when the arg is truly absent (map built from AST).
          throw new GraphQLError(message, { nodes: fieldNode });
        }
      }
    }
    return getArgumentValuesForPlan(fieldDef, fieldNode, variableValues);
  };
  return {
    staticArgs: undefined,
    argumentReader: { kind: 'coercer', read },
    readArguments: read,
  };
}

/**
 * Replay a compile-time getArgumentValues failure as a fresh GraphQLError (#5).
 */
function holdArgumentError(err: unknown): () => GraphQLError {
  if (err instanceof GraphQLError) {
    const message = err.message;
    const nodes = err.nodes;
    const positions = err.positions;
    const source = err.source;
    const path = err.path;
    return () =>
      new GraphQLError(message, {
        nodes: nodes ?? undefined,
        source: source ?? undefined,
        positions: positions ?? undefined,
        path: path ?? undefined,
        originalError: err,
      });
  }
  const message = err instanceof Error ? err.message : String(err);
  return () => new GraphQLError(message);
}

function compileMissingAstArgMessages(
  fieldDef: GraphQLField<unknown, unknown>,
  fieldNode: FieldNode,
  parentType: GraphQLObjectType,
): Map<string, string> {
  const present = new Set(fieldNode.arguments?.map(a => a.name.value) ?? []);
  const messages = new Map<string, string>();
  for (const argDef of fieldDef.args) {
    if (present.has(argDef.name)) {
      continue;
    }
    if (!isNonNullType(argDef.type) || getFieldArgDefaultValue(argDef) !== undefined) {
      continue;
    }
    const coord = `${parentType.name}.${fieldDef.name}(${argDef.name}:)`;
    messages.set(
      argDef.name,
      isGraphQL17
        ? `Argument "${coord}" of required type "${String(argDef.type)}" was not provided.`
        : `Argument "${argDef.name}" of required type "${String(argDef.type)}" was not provided.`,
    );
  }
  return messages;
}

type BareVariableArgBinding = {
  argName: string;
  variableName: string;
  nodes: ArgumentNode['value'];
  nonNull: boolean;
  missingMessage: string;
  nullMessage: string;
};

/**
 * When every argument AST value is a bare variable (`arg: $v`), return bindings
 * with plan-held missing/null GraphQLError messages (#12).
 */
function tryBareVariableBindings(
  fieldDef: GraphQLField<unknown, unknown>,
  fieldNode: FieldNode,
  parentType: GraphQLObjectType,
): ReadonlyArray<BareVariableArgBinding> | undefined {
  const args = fieldNode.arguments;
  if (args == null || args.length === 0) {
    return undefined;
  }
  const argDefByName = new Map(fieldDef.args.map(a => [a.name, a]));
  const bindings: BareVariableArgBinding[] = [];
  for (const arg of args) {
    if (arg.value.kind !== Kind.VARIABLE) {
      return undefined;
    }
    const argDef = argDefByName.get(arg.name.value);
    if (argDef == null) {
      return undefined;
    }
    const variableName = arg.value.name.value;
    const typeName = String(argDef.type);
    const nonNull = isNonNullType(argDef.type);
    const coord = `${parentType.name}.${fieldDef.name}(${arg.name.value}:)`;
    const missingMessage = isGraphQL17
      ? `Argument "${coord}" has invalid value: Expected variable "$${variableName}" provided to type "${typeName}" to provide a runtime value.`
      : `Argument "${arg.name.value}" of required type "${typeName}" was provided the variable "$${variableName}" which was not provided a runtime value.`;
    const nullMessage = isGraphQL17
      ? `Argument "${coord}" has invalid value: Expected variable "$${variableName}" provided to non-null type "${typeName}" not to be null.`
      : `Argument "${arg.name.value}" of non-null type "${typeName}" must not be null.`;
    bindings.push({
      argName: arg.name.value,
      variableName,
      // graphql-js locates these errors on the Variable node, not the Argument.
      nodes: arg.value,
      nonNull,
      missingMessage,
      nullMessage,
    });
  }
  return bindings;
}

/**
 * Resolve a field-argument schema default across GraphQL 16 (`defaultValue`)
 * and GraphQL 17 (`default.literal` + valueFromAST).
 */
function getFieldArgDefaultValue(argDef: GraphQLArgument): unknown | undefined {
  if (argDef.defaultValue !== undefined) {
    return argDef.defaultValue;
  }
  const gql17Default = (
    argDef as GraphQLArgument & { default?: { literal?: ValueNode; value?: unknown } }
  ).default;
  if (gql17Default == null) {
    return undefined;
  }
  // GraphQL 17 value-form defaults (`default: { value }`).
  if (Object.prototype.hasOwnProperty.call(gql17Default, 'value')) {
    return gql17Default.value;
  }
  if (gql17Default.literal != null) {
    const compiled = valueFromAST(gql17Default.literal, argDef.type);
    if (compiled !== undefined) {
      return compiled;
    }
  }
  return undefined;
}

/**
 * Fast path for bare-variable args. Throws plan-held GraphQLError for
 * null-for-non-null (#12). Missing variables apply schema defaults when present;
 * otherwise omit (nullable) or throw missing (non-null).
 */
function tryReadBareVariableArguments(
  fieldDef: GraphQLField<unknown, unknown>,
  fieldNode: FieldNode,
  bindings: ReadonlyArray<BareVariableArgBinding>,
  variableValues: VariableValues,
  missingAstMessageByArg?: Map<string, string>,
): { [argument: string]: unknown } | undefined {
  const coerced = variableValues.coerced as Record<string, unknown>;
  const byArg = new Map<string, BareVariableArgBinding>();
  for (const binding of bindings) {
    byArg.set(binding.argName, binding);
  }
  const args = Object.create(null) as { [argument: string]: unknown };
  for (const argDef of fieldDef.args) {
    const binding = byArg.get(argDef.name);
    if (binding !== undefined) {
      if (!Object.prototype.hasOwnProperty.call(coerced, binding.variableName)) {
        const defaultValue = getFieldArgDefaultValue(argDef);
        if (defaultValue !== undefined) {
          args[argDef.name] = defaultValue;
          continue;
        }
        if (binding.nonNull) {
          throw new GraphQLError(binding.missingMessage, { nodes: binding.nodes });
        }
        // Nullable + no default: omit (classic getArgumentValues).
        continue;
      }
      const value = coerced[binding.variableName];
      if (value == null && binding.nonNull) {
        throw new GraphQLError(binding.nullMessage, { nodes: binding.nodes });
      }
      args[argDef.name] = value;
      continue;
    }
    const defaultValue = getFieldArgDefaultValue(argDef);
    if (defaultValue !== undefined) {
      args[argDef.name] = defaultValue;
    } else if (isNonNullType(argDef.type)) {
      const message = missingAstMessageByArg?.get(argDef.name);
      if (message != null) {
        throw new GraphQLError(message, { nodes: fieldNode });
      }
      return undefined;
    }
  }
  return args;
}

function compileReturnTypeSubfields(plan: ExecutionPlan, fieldPlan: FieldPlan): void {
  const namedType = unwrapToNamedOutputType(fieldPlan.fieldDef.type);

  if (isObjectType(namedType)) {
    const subfields = collectAndStoreSubfields(plan, fieldPlan.fieldNodes, namedType);
    if (subfields) {
      compileFieldMap(plan, namedType, subfields);
      storeSubfieldExecutions(plan, fieldPlan.fieldNodes, namedType, subfields);
    }
    return;
  }

  if (isAbstractType(namedType)) {
    const possibleTypes = plan.schema.getPossibleTypes(namedType as GraphQLAbstractType);
    for (const concrete of possibleTypes) {
      const subfields = collectAndStoreSubfields(plan, fieldPlan.fieldNodes, concrete);
      if (subfields) {
        compileFieldMap(plan, concrete, subfields);
        storeSubfieldExecutions(plan, fieldPlan.fieldNodes, concrete, subfields);
      }
    }
  }
}

function storeSubfieldExecutions(
  plan: ExecutionPlan,
  parentFieldNodes: Array<FieldNode>,
  returnType: GraphQLObjectType,
  subfields: Map<string, Array<FieldNode>>,
): void {
  // Incremental docs keep classic collect / deferred groups at runtime.
  if (plan.hasIncremental) {
    return;
  }
  let executions: PlannedFieldExecution[] | undefined;
  if (!plan.collectionDependsOnVariables) {
    executions = buildFieldExecutions(plan, returnType, subfields);
  } else if (plan.skipIncludePredicates) {
    executions = buildExecutionsFromParentFieldNodes(plan, returnType, parentFieldNodes, subfields);
    if (executions == null) {
      // Defer/stream inside a sub-selection , leave unset so runtime collects.
      return;
    }
  } else {
    return;
  }
  let byType = plan.subfieldExecutionsByNodes.get(parentFieldNodes);
  if (!byType) {
    byType = new WeakMap();
    plan.subfieldExecutionsByNodes.set(parentFieldNodes, byType);
  }
  byType.set(returnType, executions);
}

/**
 * Filter planned executions by compiled `@skip`/`@include` predicates.
 */
export function filterPlannedExecutions(
  executions: ReadonlyArray<PlannedFieldExecution>,
  variableValues: VariableValues,
): PlannedFieldExecution[] {
  const out: PlannedFieldExecution[] = [];
  for (const execution of executions) {
    if (execution.include == null || execution.include(variableValues)) {
      out.push(execution);
    }
  }
  return out;
}

function collectAndStoreSubfields(
  plan: ExecutionPlan,
  fieldNodes: Array<FieldNode>,
  returnType: GraphQLObjectType,
): Map<string, Array<FieldNode>> | undefined {
  let fields: Map<string, Array<FieldNode>>;
  let patches: ReadonlyArray<{
    fields: Map<string, Array<FieldNode>>;
    patches?: ReadonlyArray<any>;
  }> = [];
  if (plan.collectionDependsOnVariables) {
    const a = collectSubFields(
      plan.schema,
      plan.fragments,
      plan.collectVariablesFalse,
      returnType,
      fieldNodes,
    );
    const b = collectSubFields(
      plan.schema,
      plan.fragments,
      plan.collectVariablesTrue,
      returnType,
      fieldNodes,
    );
    fields = unionFieldMaps(a.fields, b.fields);
    patches = [...a.patches, ...b.patches];
  } else {
    const collected = collectSubFields(
      plan.schema,
      plan.fragments,
      EMPTY_VARIABLE_VALUES,
      returnType,
      fieldNodes,
    );
    fields = collected.fields;
    patches = collected.patches;
  }

  let byType = plan.subfieldsByNodes.get(fieldNodes);
  if (!byType) {
    byType = new WeakMap();
    plan.subfieldsByNodes.set(fieldNodes, byType);
  }
  byType.set(returnType, fields);

  const primary = fieldNodes[0];
  if (primary) {
    let byTypeForNode = plan.subfieldsByFieldNode.get(primary);
    if (!byTypeForNode) {
      byTypeForNode = new WeakMap();
      plan.subfieldsByFieldNode.set(primary, byTypeForNode);
    }
    byTypeForNode.set(returnType, fields);
  }

  // Deferred selections under this object: compile field plans for patch fields
  // (runtime still uses the incremental path for scheduling).
  if (patches.length > 0) {
    compilePatchFieldMaps(plan, returnType, patches);
  }
  return fields;
}

/**
 * Planned subfield execution list for a stable parent field + concrete type.
 */
export function getPlannedSubfieldExecutions(
  plan: ExecutionPlan,
  fieldNodes: ReadonlyArray<FieldNode>,
  returnType: GraphQLObjectType,
): ReadonlyArray<PlannedFieldExecution> | undefined {
  return plan.subfieldExecutionsByNodes.get(fieldNodes)?.get(returnType);
}

export function unionFieldMaps(
  a: Map<string, Array<FieldNode>>,
  b: Map<string, Array<FieldNode>>,
): Map<string, Array<FieldNode>> {
  const out = new Map<string, Array<FieldNode>>();
  for (const [name, nodes] of a) {
    out.set(name, nodes.slice());
  }
  for (const [name, nodes] of b) {
    const existing = out.get(name);
    if (!existing) {
      out.set(name, nodes.slice());
      continue;
    }
    const seen = new Set(existing);
    for (const node of nodes) {
      if (!seen.has(node)) {
        existing.push(node);
        seen.add(node);
      }
    }
  }
  return out;
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
