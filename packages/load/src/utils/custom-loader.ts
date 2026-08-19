import { createRequire } from 'module';
import { isAbsolute, join as joinPaths } from 'path';
import { pathToFileURL } from 'url';

function extractLoaderFromModule(loaderModule: any) {
  if (loaderModule == null) {
    return undefined;
  }
  if (typeof loaderModule.default === 'function') {
    return loaderModule.default;
  }
  if (typeof loaderModule === 'function') {
    return loaderModule;
  }
}

function createLoaderRequire(cwd: string) {
  return createRequire(joinPaths(cwd, 'noop.js'));
}

function resolveLoaderModuleUrl(path: string, cwd: string, requireFn: NodeRequire): string {
  try {
    return pathToFileURL(requireFn.resolve(path)).href;
  } catch {
    const absolutePath = isAbsolute(path) ? path : joinPaths(cwd, path);
    return pathToFileURL(absolutePath).href;
  }
}

export async function getCustomLoaderByPath(path: string, cwd: string) {
  const requireFn = createLoaderRequire(cwd);
  try {
    const loader = extractLoaderFromModule(requireFn(path));
    if (typeof loader === 'function') {
      return loader;
    }
  } catch {
    // createRequire cannot load ESM; fall through to import().
  }

  try {
    const importedModule = await import(resolveLoaderModuleUrl(path, cwd, requireFn));
    return extractLoaderFromModule(importedModule);
  } catch {
    return null;
  }
}

function getCustomLoaderByPathSync(path: string, cwd: string) {
  try {
    return extractLoaderFromModule(createLoaderRequire(cwd)(path)) ?? null;
  } catch {
    return null;
  }
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
