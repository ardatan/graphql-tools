import { loadTypedefs, LoadTypedefsOptions, UnnormalizedTypeDefPointer, loadTypedefsSync } from './load-typedefs';
import { GraphQLSchema, BuildSchemaOptions, DocumentNode, Source as GraphQLSource, print } from 'graphql';
import { OPERATION_KINDS } from './documents';
import { mergeSchemasAsync, mergeSchemas, MergeSchemasConfig } from '@graphql-tools/merge';
import { Source } from '@graphql-tools/utils';

export type LoadSchemaOptions = BuildSchemaOptions &
  LoadTypedefsOptions &
  Partial<MergeSchemasConfig> & {
    /**
     * Adds a list of Sources in to `extensions.sources`
     *
     * Disabled by default.
     */
    includeSources?: boolean;
  };

export async function loadSchema(
  schemaPointers: UnnormalizedTypeDefPointer | UnnormalizedTypeDefPointer[],
  options: LoadSchemaOptions
): Promise<GraphQLSchema> {
  const sources = await loadTypedefs(schemaPointers, {
    filterKinds: OPERATION_KINDS,
    ...options,
  });

  const { schemas, typeDefs } = collectSchemasAndTypeDefs(sources);
  const mergeSchemasOptions: MergeSchemasConfig = {
    schemas,
    typeDefs,
    ...options,
  };

  const schema = await mergeSchemasAsync(mergeSchemasOptions);

  if (options.includeSources) {
    includeSources(schema, sources);
  }

  return schema;
}

export function loadSchemaSync(
  schemaPointers: UnnormalizedTypeDefPointer | UnnormalizedTypeDefPointer[],
  options: LoadSchemaOptions
): GraphQLSchema {
  const sources = loadTypedefsSync(schemaPointers, {
    filterKinds: OPERATION_KINDS,
    ...options,
  });

  const { schemas, typeDefs } = collectSchemasAndTypeDefs(sources);
  const mergeSchemasOptions: MergeSchemasConfig = {
    schemas,
    typeDefs,
    ...options,
  };

  const schema = mergeSchemas(mergeSchemasOptions);

  if (options.includeSources) {
    includeSources(schema, sources);
  }

  return schema;
}

function includeSources(schema: GraphQLSchema, sources: Source[]) {
  schema.extensions = {
    ...schema.extensions,
    sources: sources
      .filter(source => source.rawSDL || source.document)
      .map(source => new GraphQLSource(source.rawSDL || print(source.document), source.location)),
  };
}

function collectSchemasAndTypeDefs(sources: Source[]) {
  const schemas: GraphQLSchema[] = [];
  const typeDefs: DocumentNode[] = [];

  sources.forEach(source => {
    if (source.schema) {
      schemas.push(source.schema);
    } else {
      typeDefs.push(source.document);
    }
  });

  return {
    schemas,
    typeDefs,
  };
}
