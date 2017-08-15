import {
  GraphQLSchema,
  GraphQLObjectType,
  isCompositeType,
  GraphQLNonNull,
  GraphQLList,
  GraphQLCompositeType,
  GraphQLType,
} from 'graphql';
import { SchemaLink } from './types';

export default class TypeRegistry {
  public query?: GraphQLObjectType;
  public mutation?: GraphQLObjectType;
  private schemas: { [key: string]: GraphQLSchema };
  private types: { [key: string]: GraphQLCompositeType };
  private linksByType: { [key: string]: Array<SchemaLink> };
  constructor() {
    this.schemas = {};
    this.types = {};
    this.query = null;
    this.mutation = null;
    this.linksByType = {};
  }

  public getSchema(name: string): GraphQLSchema {
    if (!this.schemas[name]) {
      throw new Error(`No such type: ${name}`);
    }
    return this.schemas[name];
  }

  public getType(name: string): GraphQLCompositeType {
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
    } else if (isCompositeType(type)) {
      return this.getType(type.name) as T;
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

  public setSchema(name: string, schema: GraphQLSchema) {
    if (this.schemas[name]) {
      throw new Error(`Schema name conflict: ${name}`);
    }
    this.schemas[name] = schema;
  }

  public setType(name: string, type: GraphQLCompositeType): void {
    if (this.types[name]) {
      throw new Error(`Type name conflict: ${name}`);
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
