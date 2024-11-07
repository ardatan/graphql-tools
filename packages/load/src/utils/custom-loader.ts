import { createRequire } from 'module';
import { join as joinPaths } from 'path';

function extractLoaderFromModule(loaderModule: any) {
  if (loaderModule) {
    if (loaderModule.default && typeof loaderModule.default === 'function') {
      return loaderModule.default;
    }
    if (typeof loaderModule === 'function') {
      return loaderModule;
    }
  }
}

export async function getCustomLoaderByPath(path: string, cwd: string) {
  try {
    const importedModule = await import(joinPaths(cwd, path));
    return extractLoaderFromModule(importedModule);
  } catch (e: any) {}

  return null;
}

function getCustomLoaderByPathSync(path: string, cwd: string) {
  try {
    const requireFn = createRequire(joinPaths(cwd, 'noop.js'));
    const requiredModule = requireFn(path);
    return extractLoaderFromModule(requiredModule);
  } catch (e: any) {}

  return null;
}

export async function useCustomLoader(loaderPointer: any, cwd: string) {
  let loader;

  if (typeof loaderPointer === 'string') {
    loader = await getCustomLoaderByPath(loaderPointer, cwd);
  } else if (typeof loaderPointer === 'function') {
    loader = loaderPointer;
  }

  if (typeof loader !== 'function') {
    throw new Error(`Failed to load custom loader: ${loaderPointer}`);
  }

  return loader;
}

export function useCustomLoaderSync(loaderPointer: any, cwd: string) {
  let loader;

  if (typeof loaderPointer === 'string') {
    loader = getCustomLoaderByPathSync(loaderPointer, cwd);
  } else if (typeof loaderPointer === 'function') {
    loader = loaderPointer;
  }

  if (typeof loader !== 'function') {
    throw new Error(`Failed to load custom loader: ${loaderPointer}`);
  }

  return loader;
}
