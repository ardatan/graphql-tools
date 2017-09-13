import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLList,
  GraphQLType,
  isNamedType,
  getNamedType,
  GraphQLNamedType,
} from 'graphql';
import { SchemaLink } from './types';

export default class TypeRegistry {
  public query?: GraphQLObjectType;
  public mutation?: GraphQLObjectType;
  private schemas: Array<GraphQLSchema>;
  private schemaByField: { [key: string]: GraphQLSchema };
  private types: { [key: string]: GraphQLNamedType };
  private linksByType: { [key: string]: Array<SchemaLink> };
  constructor() {
    this.schemas = [];
    this.schemaByField = {};
    this.types = {};
    this.query = null;
    this.mutation = null;
    this.linksByType = {};
  }

  public getSchemaByRootField(fieldName: string): GraphQLSchema {
    return this.schemaByField[fieldName];
  }

  public getType(name: string): GraphQLNamedType {
    if (!this.types[name]) {
      throw new Error(`No such type: ${name}`);
    }
    return this.types[name];
  }

  public getLinksByType(name: string): Array<SchemaLink> {
    return this.linksByType[name] || [];
  }

  public getLinkByAddress(typeName: string, link: string): SchemaLink {
    if (typeName && link) {
      const links = this.getLinksByType(typeName);
      return links.find(({ name }) => name === link);
    }

    return null;
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

  public addLinks(links: Array<SchemaLink>) {
    links.forEach(link => {
      if (!this.linksByType[link.from]) {
        this.linksByType[link.from] = [];
      }
      this.linksByType[link.from].push(link);
    });
  }

  public addSchema(schema: GraphQLSchema) {
    const query = schema.getQueryType();
    if (query) {
      const fieldNames = Object.keys(query.getFields());
      fieldNames.forEach(field => {
        this.schemaByField[field] = schema;
      });
    }

    const mutation = schema.getMutationType();
    if (mutation) {
      const fieldNames = Object.keys(mutation.getFields());
      fieldNames.forEach(field => {
        this.schemaByField[field] = schema;
      });
    }
    this.schemas.push(schema);
  }

  public setType(
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

  public setQuery(query: GraphQLObjectType): void {
    this.query = query;
  }

  public setMutation(mutation: GraphQLObjectType): void {
    this.mutation = mutation;
  }
}
