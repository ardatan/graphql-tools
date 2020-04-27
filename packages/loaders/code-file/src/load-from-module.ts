import { DocumentNode, GraphQLSchema } from 'graphql';
import { pickExportFromModule, pickExportFromModuleSync } from './exports';

export async function tryToLoadFromExport(rawFilePath: string): Promise<GraphQLSchema | DocumentNode> {
  try {
    const filepath = ensureFilepath(rawFilePath);

    const mod = await import(filepath);

    return await pickExportFromModule({ module: mod, filepath });
  } catch (e) {
    throw new Error(`Unable to load from file "${rawFilePath}": ${e.message}`);
  }
}

export function tryToLoadFromExportSync(rawFilePath: string): GraphQLSchema | DocumentNode {
  try {
    const filepath = ensureFilepath(rawFilePath);

    const mod = require(filepath);

    return pickExportFromModuleSync({ module: mod, filepath });
  } catch (e) {
    throw new Error(`Unable to load from file "${rawFilePath}": ${e.message}`);
  }
}

function ensureFilepath(filepath: string) {
  if (typeof require !== 'undefined' && require.cache) {
    filepath = require.resolve(filepath);

    if (require.cache[filepath]) {
      delete require.cache[filepath];
    }
  }

  return filepath;
}
