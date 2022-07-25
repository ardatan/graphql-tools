import { inspect } from '../jsutils/inspect';
import { Maybe } from '../jsutils/Maybe';
import {
  OperationTypeNode,
  SchemaDefinitionNode,
  OperationTypeDefinitionNode,
  SchemaExtensionNode,
  Kind,
  StringValueNode,
  DirectiveDefinitionNode,
  TypeNode,
  DirectiveNode,
  TypeDefinitionNode,
  TypeExtensionNode,
  EnumValueDefinitionNode,
  InputValueDefinitionNode,
  ObjectTypeDefinitionNode,
  NamedTypeNode,
  InterfaceTypeDefinitionNode,
  UnionTypeDefinitionNode,
  InputObjectTypeDefinitionNode,
  EnumTypeDefinitionNode,
  ScalarTypeDefinitionNode,
  FieldDefinitionNode,
  ArgumentNode,
  ValueNode,
  ObjectFieldNode,
} from '../language';
import {
  GraphQLArgument,
  GraphQLDeprecatedDirective,
  GraphQLDirective,
  GraphQLEnumType,
  GraphQLEnumTypeConfig,
  GraphQLEnumValue,
  GraphQLEnumValueConfig,
  GraphQLField,
  GraphQLFieldConfig,
  GraphQLInputField,
  GraphQLInputFieldConfig,
  GraphQLInputObjectType,
  GraphQLInputObjectTypeConfig,
  GraphQLInterfaceType,
  GraphQLInterfaceTypeConfig,
  GraphQLNamedType,
  GraphQLObjectType,
  GraphQLObjectTypeConfig,
  GraphQLScalarType,
  GraphQLScalarTypeConfig,
  GraphQLSchema,
  GraphQLSchemaConfig,
  GraphQLType,
  GraphQLUnionType,
  GraphQLUnionTypeConfig,
  isListType,
  isNonNullType,
} from '../type';
import { astFromValue } from './astFromValue';
import { getRootTypeMap } from './getRootTypeMap';

function isSome<T>(input: T): input is Exclude<T, null | undefined> {
  return input != null;
}

export function astFromType(type: GraphQLType): TypeNode {
  if (isNonNullType(type)) {
    const innerType = astFromType(type.ofType);
    if (innerType.kind === Kind.NON_NULL_TYPE) {
      throw new Error(`Invalid type node ${inspect(type)}. Inner type of non-null type cannot be a non-null type.`);
    }
    return {
      kind: Kind.NON_NULL_TYPE,
      type: innerType,
    };
  } else if (isListType(type)) {
    return {
      kind: Kind.LIST_TYPE,
      type: astFromType(type.ofType),
    };
  }

  return {
    kind: Kind.NAMED_TYPE,
    name: {
      kind: Kind.NAME,
      value: type.name,
    },
  };
}

export function astFromSchema(
  schema: GraphQLSchema,
  pathToDirectivesInExtensions?: Array<string>
): SchemaDefinitionNode | SchemaExtensionNode | null {
  const operationTypeMap = new Map<OperationTypeNode, OperationTypeDefinitionNode | undefined>([
    ['query', undefined],
    ['mutation', undefined],
    ['subscription', undefined],
  ] as [OperationTypeNode, OperationTypeDefinitionNode | undefined][]);

  const nodes: Array<SchemaDefinitionNode | SchemaExtensionNode> = [];
  if (schema.astNode != null) {
    nodes.push(schema.astNode);
  }
  if (schema.extensionASTNodes != null) {
    for (const extensionASTNode of schema.extensionASTNodes) {
      nodes.push(extensionASTNode);
    }
  }

  for (const node of nodes) {
    if (node.operationTypes) {
      for (const operationTypeDefinitionNode of node.operationTypes) {
        operationTypeMap.set(operationTypeDefinitionNode.operation, operationTypeDefinitionNode);
      }
    }
  }

  const rootTypeMap = getRootTypeMap(schema);

  for (const [operationTypeNode, operationTypeDefinitionNode] of operationTypeMap) {
    const rootType = rootTypeMap.get(operationTypeNode as OperationTypeNode);
    if (rootType != null) {
      const rootTypeAST = astFromType(rootType);
      if (operationTypeDefinitionNode != null) {
        (operationTypeDefinitionNode as any).type = rootTypeAST;
      } else {
        operationTypeMap.set(operationTypeNode, {
          kind: Kind.OPERATION_TYPE_DEFINITION,
          operation: operationTypeNode,
          type: rootTypeAST,
        } as OperationTypeDefinitionNode);
      }
    }
  }

  const operationTypes = [...operationTypeMap.values()].filter(isSome);

  const directives = getDirectiveNodes(schema, schema, pathToDirectivesInExtensions);

  if (!operationTypes.length && !directives.length) {
    return null;
  }

  const schemaNode: SchemaDefinitionNode | SchemaExtensionNode = {
    kind: operationTypes != null ? Kind.SCHEMA_DEFINITION : Kind.SCHEMA_EXTENSION,
    operationTypes,
    // ConstXNode has been introduced in v16 but it is not compatible with XNode so we do `as any` for backwards compatibility
    directives: directives as any,
  };

  // This code is so weird because it needs to support GraphQL.js 14
  // In GraphQL.js 14 there is no `description` value on schemaNode
  (schemaNode as unknown as { description?: StringValueNode }).description =
    (schema.astNode as unknown as { description: string })?.description ??
    (schema as unknown as { description: string }).description != null
      ? {
          kind: Kind.STRING,
          value: (schema as unknown as { description: string }).description,
          block: true,
        }
      : undefined;

  return schemaNode;
}

export function astFromDirective(
  directive: GraphQLDirective,
  schema?: GraphQLSchema,
  pathToDirectivesInExtensions?: Array<string>
): DirectiveDefinitionNode {
  return {
    kind: Kind.DIRECTIVE_DEFINITION,
    description:
      directive.astNode?.description ??
      (directive.description
        ? {
            kind: Kind.STRING,
            value: directive.description,
          }
        : undefined),
    name: {
      kind: Kind.NAME,
      value: directive.name,
    },
    arguments: directive.args?.map(arg => astFromArg(arg, schema, pathToDirectivesInExtensions)),
    repeatable: directive.isRepeatable,
    locations:
      directive.locations?.map(location => ({
        kind: Kind.NAME,
        value: location,
      })) || [],
  };
}

export function getDirectiveNodes(
  entity: GraphQLSchema | GraphQLNamedType | GraphQLEnumValue,
  schema: GraphQLSchema,
  pathToDirectivesInExtensions?: Array<string>
): Array<DirectiveNode> {
  const directivesInExtensions = getDirectivesInExtensions(entity, pathToDirectivesInExtensions);

  let nodes: Array<
    SchemaDefinitionNode | SchemaExtensionNode | TypeDefinitionNode | TypeExtensionNode | EnumValueDefinitionNode
  > = [];
  if (entity.astNode != null) {
    nodes.push(entity.astNode);
  }
  if ('extensionASTNodes' in entity && entity.extensionASTNodes != null) {
    nodes = nodes.concat(entity.extensionASTNodes);
  }

  let directives: Array<DirectiveNode>;
  if (directivesInExtensions != null) {
    directives = makeDirectiveNodes(schema, directivesInExtensions);
  } else {
    directives = [];
    for (const node of nodes) {
      if (node.directives) {
        directives.push(...node.directives);
      }
    }
  }

  return directives;
}

export function getDeprecatableDirectiveNodes(
  entity: GraphQLArgument | GraphQLField<any, any> | GraphQLInputField | GraphQLEnumValue,
  schema?: GraphQLSchema,
  pathToDirectivesInExtensions?: Array<string>
): Array<DirectiveNode> {
  let directiveNodesBesidesDeprecated: Array<DirectiveNode> = [];
  let deprecatedDirectiveNode: Maybe<DirectiveNode> = null;

  const directivesInExtensions = getDirectivesInExtensions(entity, pathToDirectivesInExtensions);

  let directives: Maybe<ReadonlyArray<DirectiveNode>>;
  if (directivesInExtensions != null) {
    directives = makeDirectiveNodes(schema, directivesInExtensions);
  } else {
    directives = entity.astNode?.directives;
  }

  if (directives != null) {
    directiveNodesBesidesDeprecated = directives.filter(directive => directive.name.value !== 'deprecated');
    if ((entity as unknown as { deprecationReason: string }).deprecationReason != null) {
      deprecatedDirectiveNode = directives.filter(directive => directive.name.value === 'deprecated')?.[0];
    }
  }

  if (
    (entity as unknown as { deprecationReason: string }).deprecationReason != null &&
    deprecatedDirectiveNode == null
  ) {
    deprecatedDirectiveNode = makeDeprecatedDirective(
      (entity as unknown as { deprecationReason: string }).deprecationReason
    );
  }

  return deprecatedDirectiveNode == null
    ? directiveNodesBesidesDeprecated
    : [deprecatedDirectiveNode].concat(directiveNodesBesidesDeprecated);
}

export function astFromArg(
  arg: GraphQLArgument,
  schema?: GraphQLSchema,
  pathToDirectivesInExtensions?: Array<string>
): InputValueDefinitionNode {
  return {
    kind: Kind.INPUT_VALUE_DEFINITION,
    description:
      arg.astNode?.description ??
      (arg.description
        ? {
            kind: Kind.STRING,
            value: arg.description,
            block: true,
          }
        : undefined),
    name: {
      kind: Kind.NAME,
      value: arg.name,
    },
    type: astFromType(arg.type),
    // ConstXNode has been introduced in v16 but it is not compatible with XNode so we do `as any` for backwards compatibility
    defaultValue:
      arg.defaultValue !== undefined ? astFromValue(arg.defaultValue, arg.type) ?? undefined : (undefined as any),
    directives: getDeprecatableDirectiveNodes(arg, schema, pathToDirectivesInExtensions) as any,
  };
}

export function astFromObjectType(
  type: GraphQLObjectType,
  schema: GraphQLSchema,
  pathToDirectivesInExtensions?: Array<string>
): ObjectTypeDefinitionNode {
  return {
    kind: Kind.OBJECT_TYPE_DEFINITION,
    description:
      type.astNode?.description ??
      (type.description
        ? {
            kind: Kind.STRING,
            value: type.description,
            block: true,
          }
        : undefined),
    name: {
      kind: Kind.NAME,
      value: type.name,
    },
    fields: Object.values(type.getFields()).map(field => astFromField(field, schema, pathToDirectivesInExtensions)),
    interfaces: Object.values(type.getInterfaces()).map(iFace => astFromType(iFace) as NamedTypeNode),
    directives: getDirectiveNodes(type, schema, pathToDirectivesInExtensions) as any,
  };
}

export function astFromInterfaceType(
  type: GraphQLInterfaceType,
  schema: GraphQLSchema,
  pathToDirectivesInExtensions?: Array<string>
): InterfaceTypeDefinitionNode {
  const node: InterfaceTypeDefinitionNode = {
    kind: Kind.INTERFACE_TYPE_DEFINITION,
    description:
      type.astNode?.description ??
      (type.description
        ? {
            kind: Kind.STRING,
            value: type.description,
            block: true,
          }
        : undefined),
    name: {
      kind: Kind.NAME,
      value: type.name,
    },
    fields: Object.values(type.getFields()).map(field => astFromField(field, schema, pathToDirectivesInExtensions)),
    directives: getDirectiveNodes(type, schema, pathToDirectivesInExtensions) as any,
  };

  if ('getInterfaces' in type) {
    (node as unknown as { interfaces: Array<NamedTypeNode> }).interfaces = Object.values(
      (type as unknown as GraphQLObjectType).getInterfaces()
    ).map(iFace => astFromType(iFace) as NamedTypeNode);
  }

  return node;
}

export function astFromUnionType(
  type: GraphQLUnionType,
  schema: GraphQLSchema,
  pathToDirectivesInExtensions?: Array<string>
): UnionTypeDefinitionNode {
  return {
    kind: Kind.UNION_TYPE_DEFINITION,
    description:
      type.astNode?.description ??
      (type.description
        ? {
            kind: Kind.STRING,
            value: type.description,
            block: true,
          }
        : undefined),
    name: {
      kind: Kind.NAME,
      value: type.name,
    },
    // ConstXNode has been introduced in v16 but it is not compatible with XNode so we do `as any` for backwards compatibility
    directives: getDirectiveNodes(type, schema, pathToDirectivesInExtensions) as any,
    types: type.getTypes().map(type => astFromType(type) as NamedTypeNode),
  };
}

export function astFromInputObjectType(
  type: GraphQLInputObjectType,
  schema: GraphQLSchema,
  pathToDirectivesInExtensions?: Array<string>
): InputObjectTypeDefinitionNode {
  return {
    kind: Kind.INPUT_OBJECT_TYPE_DEFINITION,
    description:
      type.astNode?.description ??
      (type.description
        ? {
            kind: Kind.STRING,
            value: type.description,
            block: true,
          }
        : undefined),
    name: {
      kind: Kind.NAME,
      value: type.name,
    },
    fields: Object.values(type.getFields()).map(field =>
      astFromInputField(field, schema, pathToDirectivesInExtensions)
    ),
    // ConstXNode has been introduced in v16 but it is not compatible with XNode so we do `as any` for backwards compatibility
    directives: getDirectiveNodes(type, schema, pathToDirectivesInExtensions) as any,
  };
}

export function astFromEnumType(
  type: GraphQLEnumType,
  schema: GraphQLSchema,
  pathToDirectivesInExtensions?: Array<string>
): EnumTypeDefinitionNode {
  return {
    kind: Kind.ENUM_TYPE_DEFINITION,
    description:
      type.astNode?.description ??
      (type.description
        ? {
            kind: Kind.STRING,
            value: type.description,
            block: true,
          }
        : undefined),
    name: {
      kind: Kind.NAME,
      value: type.name,
    },
    values: Object.values(type.getValues()).map(value => astFromEnumValue(value, schema, pathToDirectivesInExtensions)),
    // ConstXNode has been introduced in v16 but it is not compatible with XNode so we do `as any` for backwards compatibility
    directives: getDirectiveNodes(type, schema, pathToDirectivesInExtensions) as any,
  };
}

type DirectableGraphQLObject =
  | GraphQLSchema
  | GraphQLSchemaConfig
  | GraphQLNamedType
  | GraphQLObjectTypeConfig<any, any>
  | GraphQLInterfaceTypeConfig<any, any>
  | GraphQLUnionTypeConfig<any, any>
  | GraphQLScalarTypeConfig<any, any>
  | GraphQLEnumTypeConfig
  | GraphQLEnumValue
  | GraphQLEnumValueConfig
  | GraphQLInputObjectTypeConfig
  | GraphQLField<any, any>
  | GraphQLInputField
  | GraphQLFieldConfig<any, any>
  | GraphQLInputFieldConfig;

interface DirectiveAnnotation {
  name: string;
  args?: Record<string, any>;
}

function getDirectivesInExtensions(
  node: DirectableGraphQLObject,
  pathToDirectivesInExtensions = ['directives']
): Array<DirectiveAnnotation> {
  return pathToDirectivesInExtensions.reduce(
    (acc, pathSegment) => (acc == null ? acc : acc[pathSegment]),
    node?.extensions as unknown as Array<DirectiveAnnotation>
  );
}

export function astFromScalarType(
  type: GraphQLScalarType,
  schema: GraphQLSchema,
  pathToDirectivesInExtensions?: Array<string>
): ScalarTypeDefinitionNode {
  const directivesInExtensions = getDirectivesInExtensions(type, pathToDirectivesInExtensions);

  const directives: DirectiveNode[] = directivesInExtensions
    ? makeDirectiveNodes(schema, directivesInExtensions)
    : (type.astNode?.directives as DirectiveNode[]) || [];

  const specifiedByValue = ((type as any).specifiedByUrl || (type as any).specifiedByURL) as string;
  if (specifiedByValue && !directives.some(directiveNode => directiveNode.name.value === 'specifiedBy')) {
    const specifiedByArgs = {
      url: specifiedByValue,
    };
    directives.push(makeDirectiveNode('specifiedBy', specifiedByArgs));
  }

  return {
    kind: Kind.SCALAR_TYPE_DEFINITION,
    description:
      type.astNode?.description ??
      (type.description
        ? {
            kind: Kind.STRING,
            value: type.description,
            block: true,
          }
        : undefined),
    name: {
      kind: Kind.NAME,
      value: type.name,
    },
    // ConstXNode has been introduced in v16 but it is not compatible with XNode so we do `as any` for backwards compatibility
    directives: directives as any,
  };
}

export function astFromField(
  field: GraphQLField<any, any>,
  schema: GraphQLSchema,
  pathToDirectivesInExtensions?: Array<string>
): FieldDefinitionNode {
  return {
    kind: Kind.FIELD_DEFINITION,
    description:
      field.astNode?.description ??
      (field.description
        ? {
            kind: Kind.STRING,
            value: field.description,
            block: true,
          }
        : undefined),
    name: {
      kind: Kind.NAME,
      value: field.name,
    },
    arguments: field.args.map(arg => astFromArg(arg, schema, pathToDirectivesInExtensions)),
    type: astFromType(field.type),
    // ConstXNode has been introduced in v16 but it is not compatible with XNode so we do `as any` for backwards compatibility
    directives: getDeprecatableDirectiveNodes(field, schema, pathToDirectivesInExtensions) as any,
  };
}

export function astFromInputField(
  field: GraphQLInputField,
  schema: GraphQLSchema,
  pathToDirectivesInExtensions?: Array<string>
): InputValueDefinitionNode {
  return {
    kind: Kind.INPUT_VALUE_DEFINITION,
    description:
      field.astNode?.description ??
      (field.description
        ? {
            kind: Kind.STRING,
            value: field.description,
            block: true,
          }
        : undefined),
    name: {
      kind: Kind.NAME,
      value: field.name,
    },
    type: astFromType(field.type),
    // ConstXNode has been introduced in v16 but it is not compatible with XNode so we do `as any` for backwards compatibility
    directives: getDeprecatableDirectiveNodes(field, schema, pathToDirectivesInExtensions) as any,
    defaultValue: astFromValue(field.defaultValue, field.type) ?? (undefined as any),
  };
}

export function astFromEnumValue(
  value: GraphQLEnumValue,
  schema: GraphQLSchema,
  pathToDirectivesInExtensions?: Array<string>
): EnumValueDefinitionNode {
  return {
    kind: Kind.ENUM_VALUE_DEFINITION,
    description:
      value.astNode?.description ??
      (value.description
        ? {
            kind: Kind.STRING,
            value: value.description,
            block: true,
          }
        : undefined),
    name: {
      kind: Kind.NAME,
      value: value.name,
    },
    // ConstXNode has been introduced in v16 but it is not compatible with XNode so we do `as any` for backwards compatibility
    directives: getDeprecatableDirectiveNodes(value, schema, pathToDirectivesInExtensions) as any,
  };
}

/**
 * Produces a GraphQL Value AST given a JavaScript object.
 * Function will match JavaScript/JSON values to GraphQL AST schema format
 * by using the following mapping.
 *
 * | JSON Value    | GraphQL Value        |
 * | ------------- | -------------------- |
 * | Object        | Input Object         |
 * | Array         | List                 |
 * | Boolean       | Boolean              |
 * | String        | String               |
 * | Number        | Int / Float          |
 * | null          | NullValue            |
 *
 */
export function astFromValueUntyped(value: any): ValueNode | null {
  // only explicit null, not undefined, NaN
  if (value === null) {
    return { kind: Kind.NULL };
  }

  // undefined
  if (value === undefined) {
    return null;
  }

  // Convert JavaScript array to GraphQL list. If the GraphQLType is a list, but
  // the value is not an array, convert the value using the list's item type.
  if (Array.isArray(value)) {
    const valuesNodes: Array<ValueNode> = [];
    for (const item of value) {
      const itemNode = astFromValueUntyped(item);
      if (itemNode != null) {
        valuesNodes.push(itemNode);
      }
    }
    return { kind: Kind.LIST, values: valuesNodes };
  }

  if (typeof value === 'object') {
    const fieldNodes: Array<ObjectFieldNode> = [];
    for (const fieldName in value) {
      const fieldValue = value[fieldName];
      const ast = astFromValueUntyped(fieldValue);
      if (ast) {
        fieldNodes.push({
          kind: Kind.OBJECT_FIELD,
          name: { kind: Kind.NAME, value: fieldName },
          value: ast,
        });
      }
    }
    return { kind: Kind.OBJECT, fields: fieldNodes };
  }

  // Others serialize based on their corresponding JavaScript scalar types.
  if (typeof value === 'boolean') {
    return { kind: Kind.BOOLEAN, value };
  }

  // JavaScript numbers can be Int or Float values.
  if (typeof value === 'number' && isFinite(value)) {
    const stringNum = String(value);
    return integerStringRegExp.test(stringNum)
      ? { kind: Kind.INT, value: stringNum }
      : { kind: Kind.FLOAT, value: stringNum };
  }

  if (typeof value === 'string') {
    return { kind: Kind.STRING, value };
  }

  throw new TypeError(`Cannot convert value to AST: ${value}.`);
}

/**
 * IntValue:
 *   - NegativeSign? 0
 *   - NegativeSign? NonZeroDigit ( Digit+ )?
 */
const integerStringRegExp = /^-?(?:0|[1-9][0-9]*)$/;

function makeDeprecatedDirective(deprecationReason: string): DirectiveNode {
  return makeDirectiveNode('deprecated', { reason: deprecationReason }, GraphQLDeprecatedDirective);
}

function makeDirectiveNode(
  name: string,
  args: Record<string, any>,
  directive?: Maybe<GraphQLDirective>
): DirectiveNode {
  const directiveArguments: Array<ArgumentNode> = [];

  if (directive != null) {
    for (const arg of directive.args) {
      const argName = arg.name;
      const argValue = args[argName];
      if (argValue !== undefined) {
        const value = astFromValue(argValue, arg.type);
        if (value) {
          directiveArguments.push({
            kind: Kind.ARGUMENT,
            name: {
              kind: Kind.NAME,
              value: argName,
            },
            value,
          });
        }
      }
    }
  } else {
    for (const argName in args) {
      const argValue = args[argName];
      const value = astFromValueUntyped(argValue);
      if (value) {
        directiveArguments.push({
          kind: Kind.ARGUMENT,
          name: {
            kind: Kind.NAME,
            value: argName,
          },
          value,
        });
      }
    }
  }

  return {
    kind: Kind.DIRECTIVE,
    name: {
      kind: Kind.NAME,
      value: name,
    },
    arguments: directiveArguments,
  };
}

export function makeDirectiveNodes(
  schema: Maybe<GraphQLSchema>,
  directiveValues: Record<string, any>
): Array<DirectiveNode> {
  const directiveNodes: Array<DirectiveNode> = [];
  for (const directiveName in directiveValues) {
    const arrayOrSingleValue = directiveValues[directiveName];
    const directive = schema?.getDirective(directiveName);
    if (Array.isArray(arrayOrSingleValue)) {
      for (const value of arrayOrSingleValue) {
        directiveNodes.push(makeDirectiveNode(directiveName, value, directive));
      }
    } else {
      directiveNodes.push(makeDirectiveNode(directiveName, arrayOrSingleValue, directive));
    }
  }
  return directiveNodes;
}
