import {
  GraphQLSchema,
  GraphQLNonNull,
  GraphQLList,
  GraphQLNamedType,
  GraphQLType,
  isNamedType,
  getNamedType,
  InlineFragmentNode,
  Kind,
  parse,
} from 'graphql';

export default class TypeRegistry {
  public fragmentReplacements: {
    [typeName: string]: { [fieldName: string]: InlineFragmentNode };
  };
  private types: { [key: string]: GraphQLNamedType };
  private schemaByField: {
    query: { [key: string]: GraphQLSchema };
    mutation: { [key: string]: GraphQLSchema };
  };

  constructor() {
    this.types = {};
    this.schemaByField = {
      query: {},
      mutation: {},
    };
    this.fragmentReplacements = {};
  }

  public getSchemaByField(
    operation: 'query' | 'mutation',
    fieldName: string,
  ): GraphQLSchema {
    return this.schemaByField[operation][fieldName];
  }

  public getType(name: string): GraphQLNamedType {
    if (!this.types[name]) {
      throw new Error(`No such type: ${name}`);
    }
    return this.types[name];
  }

  public resolveType<T extends GraphQLType>(type: T): T {
    if (type instanceof GraphQLList) {
      return new GraphQLList(this.resolveType(type.ofType)) as T;
    } else if (type instanceof GraphQLNonNull) {
      return new GraphQLNonNull(this.resolveType(type.ofType)) as T;
    } else if (isNamedType(type)) {
      return this.getType(getNamedType(type).name) as T;
    } else {
      return type;
    }
  }

  public addSchema(schema: GraphQLSchema) {
    const query = schema.getQueryType();
    if (query) {
      const fieldNames = Object.keys(query.getFields());
      fieldNames.forEach(field => {
        this.schemaByField.query[field] = schema;
      });
    }

    const mutation = schema.getMutationType();
    if (mutation) {
      const fieldNames = Object.keys(mutation.getFields());
      fieldNames.forEach(field => {
        this.schemaByField.mutation[field] = schema;
      });
    }
  }

  public addType(
    name: string,
    type: GraphQLNamedType,
    onTypeConflict?: (
      leftType: GraphQLNamedType,
      rightType: GraphQLNamedType,
    ) => GraphQLNamedType,
  ): void {
    if (this.types[name]) {
      if (onTypeConflict) {
        type = onTypeConflict(this.types[name], type);
      } else {
        throw new Error(`Type name conflict: ${name}`);
      }
    }
    this.types[name] = type;
  }

  public addFragment(typeName: string, fieldName: string, fragment: string) {
    if (!this.fragmentReplacements[typeName]) {
      this.fragmentReplacements[typeName] = {};
    }
    this.fragmentReplacements[typeName][
      fieldName
    ] = parseFragmentToInlineFragment(fragment);
  }
}

function parseFragmentToInlineFragment(
  definitions: string,
): InlineFragmentNode {
  const document = parse(definitions);
  for (const definition of document.definitions) {
    if (definition.kind === Kind.FRAGMENT_DEFINITION) {
      return {
        kind: Kind.INLINE_FRAGMENT,
        typeCondition: definition.typeCondition,
        selectionSet: definition.selectionSet,
      };
    }
  }
  throw new Error('Could not parse fragment');
}
