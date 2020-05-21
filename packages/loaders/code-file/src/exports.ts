import { DocumentNode, GraphQLSchema, parse, IntrospectionQuery, buildClientSchema, isSchema } from 'graphql';
import { isSchemaAst, isSchemaJson, isSchemaText, isWrappedSchemaJson, pick } from './helpers';

const identifiersToLookFor = ['default', 'schema', 'typeDefs', 'data'];

// Pick exports

export function pickExportFromModule({ module, filepath }: { module: any; filepath: string }) {
  ensureModule({ module, filepath });

  return resolveModule(ensureExports({ module, filepath }));
}

export function pickExportFromModuleSync({ module, filepath }: { module: any; filepath: string }) {
  ensureModule({ module, filepath });

  return resolveModuleSync(ensureExports({ module, filepath }));
}

// module

async function resolveModule(identifiers: any) {
  const exportValue = await pick<any>(await identifiers, identifiersToLookFor);

  return resolveExport(exportValue);
}

function resolveModuleSync(identifiers: any) {
  const exportValue = pick<any>(identifiers, identifiersToLookFor);

  return resolveExport(exportValue);
}

// validate

function ensureModule({ module, filepath }: { module: string; filepath: string }) {
  if (!module) {
    throw new Error(`Invalid export from export file ${filepath}: empty export!`);
  }
}

function ensureExports({ module, filepath }: { module: any; filepath: string }) {
  const identifiers = pick<any>(module, identifiersToLookFor);

  if (!identifiers) {
    throw new Error(`Invalid export from export file ${filepath}: missing default export or 'schema' export!`);
  }

  return identifiers;
}

// Decide what to do with an exported value

function resolveExport(
  fileExport: GraphQLSchema | DocumentNode | string | { data: IntrospectionQuery } | IntrospectionQuery
): GraphQLSchema | DocumentNode | null {
  try {
    if (isSchema(fileExport)) {
      return fileExport;
    }

    if (isSchemaText(fileExport)) {
      return parse(fileExport);
    }

    if (isWrappedSchemaJson(fileExport)) {
      return buildClientSchema(fileExport.data);
    }

    if (isSchemaJson(fileExport)) {
      return buildClientSchema(fileExport);
    }

    if (isSchemaAst(fileExport)) {
      return fileExport;
    }

    return null;
  } catch (e) {
    throw new Error('Exported schema must be of type GraphQLSchema, text, AST, or introspection JSON.');
  }
}
