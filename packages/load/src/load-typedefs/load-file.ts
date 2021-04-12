import { Source, debugLog, Cacheable } from '@graphql-tools/utils';
import { LoadTypedefsOptions } from '../load-typedefs';

function makeCacheable<TPointer, TOptions extends Cacheable>(
  fn: (pointer: TPointer, options?: TOptions) => Promise<Source | never>,
  pointer: TPointer,
  options: TOptions
): Promise<Source | never> {
  if (options?.cacheable) {
    return options.cacheable(fn, pointer, options);
  }
  return fn(pointer, options);
}

function makeCacheableSync<TPointer, TOptions extends Cacheable>(
  fn: (pointer: TPointer, options?: TOptions) => Source | never,
  pointer: TPointer,
  options: TOptions
): Source | never {
  if (options?.cacheableSync) {
    return options.cacheableSync(fn, pointer, options);
  }
  return fn(pointer, options);
}

export async function loadFile(pointer: string, options: LoadTypedefsOptions): Promise<Source> {
  const cached = useCache({ pointer, options });

  if (cached) {
    return cached;
  }

  for await (const loader of options.loaders) {
    try {
      const canLoad = await loader.canLoad(pointer, options);

      if (canLoad) {
        const loadedValue = await makeCacheable(loader.load.bind(loader), pointer, options);
        return loadedValue;
      }
    } catch (error) {
      debugLog(`Failed to find any GraphQL type definitions in: ${pointer} - ${error.message}`);
      throw error;
    }
  }

  return undefined;
}

export function loadFileSync(pointer: string, options: LoadTypedefsOptions): Source {
  const cached = useCache({ pointer, options });

  if (cached) {
    return cached;
  }

  for (const loader of options.loaders) {
    try {
      const canLoad = loader.canLoadSync && loader.loadSync && loader.canLoadSync(pointer, options);

      if (canLoad) {
        return makeCacheableSync(loader.loadSync.bind(loader), pointer, options);
      }
    } catch (error) {
      debugLog(`Failed to find any GraphQL type definitions in: ${pointer} - ${error.message}`);
      throw error;
    }
  }

  return undefined;
}

function useCache<T extends any>({ pointer, options }: { pointer: string; options: T }) {
  if (options['cache']) {
    return options['cache'][pointer];
  }
}
