import {
  getNamedType,
  GraphQLDirective,
  GraphQLEnumType,
  GraphQLFieldConfigArgumentMap,
  GraphQLFieldConfigMap,
  GraphQLInputFieldConfigMap,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLList,
  GraphQLNamedType,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLType,
  GraphQLUnionType,
  isEnumType,
  isInputObjectType,
  isInterfaceType,
  isListType,
  isNamedType,
  isNonNullType,
  isObjectType,
  isScalarType,
  isSpecifiedDirective,
  isSpecifiedScalarType,
  isUnionType,
} from 'graphql';
import { getBuiltInForStub, isNamedStub } from './stub.js';

export function rewireTypes(
  originalTypeMap: Record<string, GraphQLNamedType | null>,
  directives: ReadonlyArray<GraphQLDirective>,
): {
  typeMap: Record<string, GraphQLNamedType>;
  directives: Array<GraphQLDirective>;
} {
  const referenceTypeMap = Object.create(null);
  for (const typeName in originalTypeMap) {
    referenceTypeMap[typeName] = originalTypeMap[typeName];
  }
  const newTypeMap: Record<string, GraphQLNamedType> = Object.create(null);

  for (const typeName in referenceTypeMap) {
    const namedType = referenceTypeMap[typeName];

    if (namedType == null || typeName.startsWith('__')) {
      continue;
    }

    const newName = namedType.name;
    if (newName.startsWith('__')) {
      continue;
    }

    if (newTypeMap[newName] != null) {
      console.warn(
        `Duplicate schema type name ${newName} found; keeping the existing one found in the schema`,
      );
      continue;
    }

    newTypeMap[newName] = namedType;
  }

  const typesToRewire = typesThatNeedRewire(newTypeMap, referenceTypeMap);

  for (const typeName of typesToRewire) {
    newTypeMap[typeName] = rewireNamedType(newTypeMap[typeName]);
  }

  const newDirectives = directives.map(directive =>
    directiveNeedsRewire(directive, newTypeMap, referenceTypeMap, typesToRewire)
      ? rewireDirective(directive)
      : directive,
  );

  return {
    typeMap: newTypeMap,
    directives: newDirectives,
  };

  function rewireDirective(directive: GraphQLDirective): GraphQLDirective {
    if (isSpecifiedDirective(directive)) {
      return directive;
    }
    const directiveConfig = directive.toConfig();
    directiveConfig.args = rewireArgs(directiveConfig.args);
    return new GraphQLDirective(directiveConfig);
  }

  function rewireArgs(args: GraphQLFieldConfigArgumentMap) {
    const rewiredArgs = {};
    for (const argName in args) {
      const arg = args[argName];
      const rewiredArgType = rewireType(arg.type);
      if (rewiredArgType != null) {
        arg.type = rewiredArgType;
        rewiredArgs[argName] = arg;
      }
    }
    return rewiredArgs;
  }

  function rewireNamedType<T extends GraphQLNamedType>(type: T) {
    if (isObjectType(type)) {
      const config = (type as GraphQLObjectType).toConfig();
      const newConfig = {
        ...config,
        fields: () => rewireFields(config.fields),
        interfaces: () => rewireNamedTypes(config.interfaces),
      };
      return new GraphQLObjectType(newConfig);
    } else if (isInterfaceType(type)) {
      const config = (type as GraphQLInterfaceType).toConfig();
      const newConfig: any = {
        ...config,
        fields: () => rewireFields(config.fields),
      };
      if ('interfaces' in newConfig) {
        newConfig.interfaces = () =>
          rewireNamedTypes(
            (config as unknown as { interfaces: Array<GraphQLInterfaceType> }).interfaces,
          );
      }
      return new GraphQLInterfaceType(newConfig);
    } else if (isUnionType(type)) {
      const config = (type as GraphQLUnionType).toConfig();
      const newConfig = {
        ...config,
        types: () => rewireNamedTypes(config.types),
      };
      return new GraphQLUnionType(newConfig);
    } else if (isInputObjectType(type)) {
      const config = (type as GraphQLInputObjectType).toConfig();
      const newConfig = {
        ...config,
        fields: () => rewireInputFields(config.fields),
      };
      return new GraphQLInputObjectType(newConfig);
    } else if (isEnumType(type)) {
      const enumConfig = (type as GraphQLEnumType).toConfig();
      return new GraphQLEnumType(enumConfig);
    } else if (isScalarType(type)) {
      if (isSpecifiedScalarType(type)) {
        return type;
      }
      const scalarConfig = (type as GraphQLScalarType).toConfig();
      return new GraphQLScalarType(scalarConfig);
    }

    throw new Error(`Unexpected schema type: ${type as unknown as string}`);
  }

  function rewireFields(fields: GraphQLFieldConfigMap<any, any>): GraphQLFieldConfigMap<any, any> {
    const rewiredFields = {};
    for (const fieldName in fields) {
      const field = fields[fieldName];
      const rewiredFieldType = rewireType(field.type);
      if (rewiredFieldType != null && field.args) {
        field.type = rewiredFieldType;
        field.args = rewireArgs(field.args);
        rewiredFields[fieldName] = field;
      }
    }
    return rewiredFields;
  }

  function rewireInputFields(fields: GraphQLInputFieldConfigMap): GraphQLInputFieldConfigMap {
    const rewiredFields = {};
    for (const fieldName in fields) {
      const field = fields[fieldName];
      const rewiredFieldType = rewireType(field.type);
      if (rewiredFieldType != null) {
        field.type = rewiredFieldType;
        rewiredFields[fieldName] = field;
      }
    }
    return rewiredFields;
  }

  function rewireNamedTypes<T extends GraphQLNamedType>(namedTypes: Iterable<T>): Array<T> {
    const rewiredTypes: Array<T> = [];
    for (const namedType of namedTypes) {
      const rewiredType = rewireType(namedType);
      if (rewiredType != null) {
        rewiredTypes.push(rewiredType);
      }
    }
    return rewiredTypes;
  }

  function rewireType<T extends GraphQLType>(type: T): T | null {
    if (isListType(type)) {
      const rewiredType = rewireType(type.ofType);
      return rewiredType != null ? (new GraphQLList(rewiredType) as T) : null;
    } else if (isNonNullType(type)) {
      const rewiredType = rewireType(type.ofType);
      return rewiredType != null ? (new GraphQLNonNull(rewiredType) as T) : null;
    } else if (isNamedType(type)) {
      let rewiredType = referenceTypeMap[type.name];
      if (rewiredType === undefined) {
        rewiredType = isNamedStub(type) ? getBuiltInForStub(type) : rewireNamedType(type);
        newTypeMap[rewiredType.name] = referenceTypeMap[type.name] = rewiredType;
      }
      return rewiredType != null ? (newTypeMap[rewiredType.name] as T) : null;
    }

    return null;
  }
}

function typesThatNeedRewire(
  typeMap: Record<string, GraphQLNamedType>,
  referenceTypeMap: Record<string, GraphQLNamedType | null>,
): Set<string> {
  const needsRewire = new Set<string>();
  let added = true;

  while (added) {
    added = false;
    for (const typeName in typeMap) {
      if (needsRewire.has(typeName)) {
        continue;
      }
      if (typeNeedsRewire(typeMap[typeName], typeMap, referenceTypeMap, needsRewire)) {
        needsRewire.add(typeName);
        added = true;
      }
    }
  }

  return needsRewire;
}

function typeNeedsRewire(
  type: GraphQLNamedType,
  typeMap: Record<string, GraphQLNamedType>,
  referenceTypeMap: Record<string, GraphQLNamedType | null>,
  needsRewire: Set<string>,
  visiting: Set<GraphQLNamedType> = new Set(),
): boolean {
  if (visiting.has(type)) {
    return false;
  }
  visiting.add(type);

  for (const ref of namedTypeReferences(type)) {
    if (isNamedStub(ref) && !(ref.name in referenceTypeMap)) {
      return true;
    }
    if (needsRewire.has(ref.name)) {
      return true;
    }
    if (replacementFor(ref, referenceTypeMap, typeMap) !== ref) {
      return true;
    }
    if (
      !(ref.name in referenceTypeMap) &&
      typeNeedsRewire(ref, typeMap, referenceTypeMap, needsRewire, visiting)
    ) {
      return true;
    }
  }
  return false;
}

function directiveNeedsRewire(
  directive: GraphQLDirective,
  typeMap: Record<string, GraphQLNamedType>,
  referenceTypeMap: Record<string, GraphQLNamedType | null>,
  needsRewire: Set<string>,
): boolean {
  if (isSpecifiedDirective(directive)) {
    return false;
  }
  for (const arg of directive.args) {
    const ref = getNamedType(arg.type);
    if (
      (isNamedStub(ref) && !(ref.name in referenceTypeMap)) ||
      needsRewire.has(ref.name) ||
      replacementFor(ref, referenceTypeMap, typeMap) !== ref ||
      (!(ref.name in referenceTypeMap) &&
        typeNeedsRewire(ref, typeMap, referenceTypeMap, needsRewire))
    ) {
      return true;
    }
  }
  return false;
}

function replacementFor(
  ref: GraphQLNamedType,
  referenceTypeMap: Record<string, GraphQLNamedType | null>,
  typeMap: Record<string, GraphQLNamedType>,
): GraphQLNamedType | null {
  if (!(ref.name in referenceTypeMap)) {
    return ref;
  }
  const replacement = referenceTypeMap[ref.name];
  if (replacement == null) {
    return null;
  }
  return typeMap[replacement.name] ?? replacement;
}

function namedTypeReferences(type: GraphQLNamedType): GraphQLNamedType[] {
  const refs: GraphQLNamedType[] = [];

  if (isObjectType(type) || isInterfaceType(type)) {
    for (const iface of type.getInterfaces()) {
      refs.push(iface);
    }
    for (const field of Object.values(type.getFields())) {
      refs.push(getNamedType(field.type));
      for (const arg of field.args) {
        refs.push(getNamedType(arg.type));
      }
    }
  } else if (isUnionType(type)) {
    refs.push(...type.getTypes());
  } else if (isInputObjectType(type)) {
    for (const field of Object.values(type.getFields())) {
      refs.push(getNamedType(field.type));
    }
  }

  return refs;
}
