import { loadTypedefs, LoadTypedefsOptions, UnnormalizedTypeDefPointer, loadTypedefsSync } from './load-typedefs.js';
import { GraphQLSchema, BuildSchemaOptions, Source as GraphQLSource, print, lexicographicSortSchema } from 'graphql';
import { OPERATION_KINDS } from './documents.js';
import { IExecutableSchemaDefinition, mergeSchemas, extractExtensionsFromSchema } from '@graphql-tools/schema';
import { getResolversFromSchema, IResolvers, SchemaExtensions, Source, TypeSource } from '@graphql-tools/utils';

export type LoadSchemaOptions = BuildSchemaOptions &
  LoadTypedefsOptions &
  Partial<IExecutableSchemaDefinition> & {
    /**
     * Adds a list of Sources in to `extensions.sources`
     *
     * Disabled by default.
     */
    includeSources?: boolean;
  };

/**
 * Asynchronously loads a schema from the provided pointers.
 * @param schemaPointers Pointers to the sources to load the schema from
 * @param options Additional options
 */
export async function loadSchema(
  schemaPointers: UnnormalizedTypeDefPointer | UnnormalizedTypeDefPointer[],
  options: LoadSchemaOptions
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
  options: LoadSchemaOptions
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
  if (sources.length === 1 && sources[0].schema != null && options.typeDefs == null && options.resolvers == null) {
    return options.sort ? lexicographicSortSchema(sources[0].schema) : sources[0].schema;
  }
  const { typeDefs, resolvers, schemaExtensions } = collectSchemaParts(sources);

  const schema = mergeSchemas({
    ...options,
    typeDefs,
    resolvers,
    schemaExtensions,
  });

  if (options?.includeSources) {
    includeSources(schema, sources);
  }

  return options.sort ? lexicographicSortSchema(schema) : schema;
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
