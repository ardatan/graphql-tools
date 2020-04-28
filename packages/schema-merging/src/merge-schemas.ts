import { GraphQLSchema, DocumentNode, buildASTSchema, BuildSchemaOptions, buildSchema } from 'graphql';
import { addResolversToSchema, addErrorLoggingToSchema } from '@graphql-tools/schema-generator';
import { mergeTypeDefs, Config } from './typedefs-mergers/merge-typedefs';
import { mergeResolvers } from './merge-resolvers';
import {
  IResolvers,
  SchemaDirectiveVisitor,
  IResolverValidationOptions,
  ILogger,
  ResolversComposerMapping,
  composeResolvers,
  asArray,
  getResolversFromSchema,
} from '@graphql-tools/utils';
import { mergeExtensions, extractExtensionsFromSchema, applyExtensions, SchemaExtensions } from './extensions';

export interface MergeSchemasConfig<Resolvers extends IResolvers = IResolvers> extends Config, BuildSchemaOptions {
  schemas: GraphQLSchema[];
  typeDefs?: (DocumentNode | string)[] | DocumentNode | string;
  resolvers?: Resolvers | Resolvers[];
  resolversComposition?: ResolversComposerMapping<Resolvers>;
  schemaDirectives?: { [directiveName: string]: typeof SchemaDirectiveVisitor };
  resolverValidationOptions?: IResolverValidationOptions;
  logger?: ILogger;
}

const defaultResolverValidationOptions: Partial<IResolverValidationOptions> = {
  requireResolversForArgs: false,
  requireResolversForNonScalar: false,
  requireResolversForAllFields: false,
  requireResolversForResolveType: false,
  allowResolversNotInSchema: true,
};

export function mergeSchemas(config: MergeSchemasConfig) {
  const typeDefs = mergeTypes(config);
  const extractedResolvers: IResolvers<any, any>[] = [];
  const extractedExtensions: SchemaExtensions[] = [];
  for (const schema of config.schemas) {
    extractedResolvers.push(getResolversFromSchema(schema));
    extractedExtensions.push(extractExtensionsFromSchema(schema));
  }
  extractedResolvers.push(...ensureResolvers(config));

  const resolvers = composeResolvers(mergeResolvers(extractedResolvers, config), config.resolversComposition || {});
  const extensions = mergeExtensions(extractedExtensions);

  return makeSchema({ resolvers, typeDefs, extensions }, config);
}

export async function mergeSchemasAsync(config: MergeSchemasConfig) {
  const [typeDefs, resolvers, extensions] = await Promise.all([
    mergeTypes(config),
    Promise.all(config.schemas.map(async schema => getResolversFromSchema(schema))).then(extractedResolvers =>
      composeResolvers(
        mergeResolvers([...extractedResolvers, ...ensureResolvers(config)], config),
        config.resolversComposition || {}
      )
    ),
    Promise.all(config.schemas.map(async schema => extractExtensionsFromSchema(schema))).then(extractedExtensions =>
      mergeExtensions(extractedExtensions)
    ),
  ]);

  return makeSchema({ resolvers, typeDefs, extensions }, config);
}

function mergeTypes({ schemas, typeDefs, ...config }: MergeSchemasConfig) {
  return mergeTypeDefs([...schemas, ...(typeDefs ? asArray(typeDefs) : [])], config);
}

function ensureResolvers(config: MergeSchemasConfig) {
  return config.resolvers ? asArray<IResolvers>(config.resolvers) : [];
}

function makeSchema(
  {
    resolvers,
    typeDefs,
    extensions,
  }: { resolvers: IResolvers; typeDefs: string | DocumentNode; extensions: SchemaExtensions },
  config: MergeSchemasConfig
) {
  const schema = typeof typeDefs === 'string' ? buildSchema(typeDefs, config) : buildASTSchema(typeDefs, config);

  // add resolvers
  if (resolvers) {
    addResolversToSchema({
      schema,
      resolvers,
      resolverValidationOptions: {
        ...defaultResolverValidationOptions,
        ...(config.resolverValidationOptions || {}),
      },
    });
  }

  // use logger
  if (config.logger) {
    addErrorLoggingToSchema(schema, config.logger);
  }

  // use schema directives
  if (config.schemaDirectives) {
    SchemaDirectiveVisitor.visitSchemaDirectives(schema, config.schemaDirectives);
  }

  // extensions
  applyExtensions(schema, extensions);

  return schema;
}
