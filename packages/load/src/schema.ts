import {
  BuildSchemaOptions,
  GraphQLSchema,
  Source as GraphQLSource,
  lexicographicSortSchema,
  print,
} from 'graphql';
import {
  extractExtensionsFromSchema,
  IExecutableSchemaDefinition,
  mergeSchemas,
} from '@graphql-tools/schema';
import {
  getResolversFromSchema,
  IResolvers,
  SchemaExtensions,
  Source,
  TypeSource,
} from '@graphql-tools/utils';
import { OPERATION_KINDS } from './documents.js';
import {
  loadTypedefs,
  LoadTypedefsOptions,
  loadTypedefsSync,
  UnnormalizedTypeDefPointer,
} from './load-typedefs.js';

export type SchemaSortMode = 'lexicographic' | 'typesOnly';

export type LoadSchemaOptions = BuildSchemaOptions &
  LoadTypedefsOptions &
  Partial<IExecutableSchemaDefinition> & {
    /**
     * Adds a list of Sources in to `extensions.sources`
     *
     * Disabled by default.
     */
    includeSources?: boolean;
    /**
     * How to sort the schema when `sort` is true.
     *
     * `lexicographic` (default) uses GraphQL's `lexicographicSortSchema`.
     * Types, fields, arguments, and enum values are all reordered.
     *
     * `typesOnly` sorts only the type list. Field and enum value order stay as loaded.
     *
     * @example
     * Given:
     * ```graphql
     * enum DayOfWeek { SUNDAY MONDAY TUESDAY WEDNESDAY THURSDAY FRIDAY SATURDAY }
     * type Query { d: String z: String a: String day: DayOfWeek }
     * ```
     *
     * `sort: true`:
     * ```graphql
     * enum DayOfWeek { FRIDAY MONDAY SATURDAY SUNDAY THURSDAY TUESDAY WEDNESDAY }
     * type Query { a: String d: String day: DayOfWeek z: String }
     * ```
     *
     * `sort: true, sortMode: 'typesOnly'`:
     * ```graphql
     * enum DayOfWeek { SUNDAY MONDAY TUESDAY WEDNESDAY THURSDAY FRIDAY SATURDAY }
     * type Query { d: String z: String a: String day: DayOfWeek }
     * ```
     *
     * `sort: false` ignores `sortMode`.
     */
    sortMode?: SchemaSortMode;
  };

/**
 * Asynchronously loads a schema from the provided pointers.
 * @param schemaPointers Pointers to the sources to load the schema from
 * @param options Additional options
 */
export async function loadSchema(
  schemaPointers: UnnormalizedTypeDefPointer | UnnormalizedTypeDefPointer[],
  options: LoadSchemaOptions,
): Promise<GraphQLSchema> {
  const sources = await loadTypedefs(schemaPointers, {
    ...options,
    filterKinds: OPERATION_KINDS,
  });
  return getSchemaFromSources(sources, options);
}

/**
 * Synchronously loads a schema from the provided pointers.
 * @param schemaPointers Pointers to the sources to load the schema from
 * @param options Additional options
 */
export function loadSchemaSync(
  schemaPointers: UnnormalizedTypeDefPointer | UnnormalizedTypeDefPointer[],
  options: LoadSchemaOptions,
): GraphQLSchema {
  const sources = loadTypedefsSync(schemaPointers, {
    filterKinds: OPERATION_KINDS,
    ...options,
  });
  return getSchemaFromSources(sources, options);
}

function includeSources(schema: GraphQLSchema, sources: Source[]) {
  const finalSources: Array<GraphQLSource> = [];
  for (const source of sources) {
    if (source.rawSDL) {
      finalSources.push(new GraphQLSource(source.rawSDL, source.location));
    } else if (source.document) {
      finalSources.push(new GraphQLSource(print(source.document), source.location));
    }
  }
  schema.extensions = {
    ...schema.extensions,
    sources: finalSources,
    extendedSources: sources,
  };
}

function getSchemaFromSources(sources: Source[], options: LoadSchemaOptions) {
  if (
    sources.length === 1 &&
    sources[0].schema != null &&
    options.typeDefs == null &&
    options.resolvers == null
  ) {
    return applySchemaSort(sources[0].schema, options);
  }
  const { typeDefs, resolvers, schemaExtensions } = collectSchemaParts(sources);

  const schema = mergeSchemas({
    ...options,
    typeDefs,
    resolvers,
    schemaExtensions,
    // mergeTypeDefs also honors `sort` and would reorder fields and enum values.
    ...(options.sortMode === 'typesOnly' ? { sort: false } : {}),
  });

  if (options?.includeSources) {
    includeSources(schema, sources);
  }

  return applySchemaSort(schema, options);
}

function applySchemaSort(schema: GraphQLSchema, options: LoadSchemaOptions): GraphQLSchema {
  if (!options.sort) {
    return schema;
  }
  if (options.sortMode === 'typesOnly') {
    return sortSchemaTypesOnly(schema);
  }
  return lexicographicSortSchema(schema);
}

function sortSchemaTypesOnly(schema: GraphQLSchema): GraphQLSchema {
  const schemaConfig = schema.toConfig();
  return new GraphQLSchema({
    ...schemaConfig,
    types: [...schemaConfig.types].sort((typeA, typeB) => typeA.name.localeCompare(typeB.name)),
  });
}

function collectSchemaParts(sources: Source[]) {
  const typeDefs: TypeSource[] = [];
  const resolvers: IResolvers[] = [];
  const schemaExtensions: SchemaExtensions[] = [];

  for (const source of sources) {
    if (source.schema) {
      typeDefs.push(source.schema);
      resolvers.push(getResolversFromSchema(source.schema));
      schemaExtensions.push(extractExtensionsFromSchema(source.schema));
    } else {
      const typeDef = source.document || source.rawSDL;
      if (typeDef) {
        typeDefs.push(typeDef);
      }
    }
  }

  return {
    typeDefs,
    resolvers,
    schemaExtensions,
  };
}
