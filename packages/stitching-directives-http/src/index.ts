import { SubschemaConfig } from '@graphql-tools/delegate';
import { buildHTTPExecutor, HTTPExecutorOptions } from '@graphql-tools/executor-http';
import { stitchSchemas } from '@graphql-tools/stitch';
import { stitchingDirectives, StitchingDirectivesOptions } from '@graphql-tools/stitching-directives';
import { ExecutionResult, isAsyncIterable } from '@graphql-tools/utils';
import { buildASTSchema, buildSchema, DocumentNode, GraphQLSchema, parse } from 'graphql';

export type StitchingDirectivesHTTPService = (
  | {
      sdl: string;
      url: string;
    }
  | {
      schema: GraphQLSchema;
      url: string;
    }
  | {
      ast: DocumentNode;
      url: string;
    }
  | {
      sdlQuery: string | DocumentNode;
      getSdlFromResult: (result: ExecutionResult) => string;
      url: string;
    }
) &
  Omit<HTTPExecutorOptions, 'endpoint'> &
  Omit<SubschemaConfig, 'schema' | 'executor'>;

async function getSubschemaConfig(service: StitchingDirectivesHTTPService): Promise<SubschemaConfig> {
  const executor = buildHTTPExecutor({
    endpoint: service.url,
    ...service,
  });
  let schema: GraphQLSchema;
  if ('sdl' in service) {
    schema = buildSchema(service.sdl, {
      assumeValidSDL: true,
      assumeValid: true,
    });
  } else if ('schema' in service) {
    schema = service.schema;
  } else if ('ast' in service) {
    schema = buildASTSchema(service.ast, {
      assumeValidSDL: true,
      assumeValid: true,
    });
  } else {
    const sdlQueryResult = await executor({
      document: typeof service.sdlQuery === 'string' ? parse(service.sdlQuery) : service.sdlQuery,
    });
    if (isAsyncIterable(sdlQueryResult)) {
      throw new Error('sdlQuery must return a single result');
    }
    const sdl = service.getSdlFromResult(sdlQueryResult);
    schema = buildSchema(sdl, {
      assumeValidSDL: true,
      assumeValid: true,
    });
  }
  return {
    schema,
    executor,
  };
}

export async function createStitchingDirectivesHTTPGateway(
  services: StitchingDirectivesHTTPService[],
  opts?: StitchingDirectivesOptions & {
    sdlQuery?: string | DocumentNode;
  }
): Promise<GraphQLSchema> {
  const { stitchingDirectivesTransformer } = stitchingDirectives(opts);
  const subschemas = await Promise.all(
    services.map(service =>
      getSubschemaConfig({
        sdlQuery: opts?.sdlQuery,
        ...service,
      })
    )
  );
  return stitchSchemas({
    subschemas,
    subschemaConfigTransforms: [stitchingDirectivesTransformer],
  });
}
