import { Source, isDocumentString, parseGraphQLSDL, getDocumentNodeFromSchema, asArray } from '@graphql-tools/utils';
import { isSchema, Kind } from 'graphql';
import { LoadTypedefsOptions } from '../load-typedefs.js';
import { loadFile, loadFileSync } from './load-file.js';
import { stringToHash, useStack, StackNext, StackFn } from '../utils/helpers.js';
import { useCustomLoader, useCustomLoaderSync } from '../utils/custom-loader.js';
import { useQueue, useSyncQueue } from '../utils/queue.js';
import { createRequire } from 'module';
import { cwd, env } from 'process';

type AddSource = (data: { pointer: string; source: Source; noCache?: boolean }) => void;
type AddToQueue<T> = (fn: () => Promise<T> | T) => void;

const CONCURRENCY_LIMIT = 50;

export async function collectSources<TOptions>({
  pointerOptionMap,
  options,
}: {
  pointerOptionMap: {
    [key: string]: any;
  };
  options: LoadTypedefsOptions<Partial<TOptions>>;
}): Promise<Source[]> {
  if (env['DEBUG'] != null) {
    console.time('@graphql-tools/load: collectSources');
  }
  const sources: Source[] = [];
  const queue = useQueue<void>({ concurrency: CONCURRENCY_LIMIT });

  const { addSource, collect } = createHelpers({
    sources,
    stack: [collectDocumentString, collectCustomLoader, collectFallback],
  });

  for (const pointer in pointerOptionMap) {
    const pointerOptions = pointerOptionMap[pointer];

    if (env['DEBUG'] != null) {
      console.time(`@graphql-tools/load: collectSources ${pointer}`);
    }
    collect({
      pointer,
      pointerOptions,
      pointerOptionMap,
      options,
      addSource,
      queue: queue.add as AddToQueue<void>,
    });
    if (env['DEBUG'] != null) {
      console.timeEnd(`@graphql-tools/load: collectSources ${pointer}`);
    }
  }

  if (env['DEBUG'] != null) {
    console.time('@graphql-tools/load: collectSources queue');
  }
  await queue.runAll();
  if (env['DEBUG'] != null) {
    console.timeEnd('@graphql-tools/load: collectSources queue');
  }
  return sources;
}

export function collectSourcesSync<TOptions>({
  pointerOptionMap,
  options,
}: {
  pointerOptionMap: {
    [key: string]: any;
  };
  options: LoadTypedefsOptions<Partial<TOptions>>;
}): Source[] {
  const sources: Source[] = [];
  const queue = useSyncQueue<void>();

  const { addSource, collect } = createHelpers({
    sources,
    stack: [collectDocumentString, collectCustomLoaderSync, collectFallbackSync],
  });

  if (env['DEBUG'] != null) {
    console.time('@graphql-tools/load: collectSourcesSync');
  }

  for (const pointer in pointerOptionMap) {
    const pointerOptions = pointerOptionMap[pointer];

    if (env['DEBUG'] != null) {
      console.time(`@graphql-tools/load: collectSourcesSync ${pointer}`);
    }
    collect({
      pointer,
      pointerOptions,
      pointerOptionMap,
      options,
      addSource,
      queue: queue.add,
    });
    if (env['DEBUG'] != null) {
      console.timeEnd(`@graphql-tools/load: collectSourcesSync ${pointer}`);
    }
  }

  if (env['DEBUG'] != null) {
    console.time('@graphql-tools/load: collectSourcesSync queue');
  }
  queue.runAll();

  if (env['DEBUG'] != null) {
    console.timeEnd('@graphql-tools/load: collectSourcesSync queue');
  }
  return sources;
}

function createHelpers<T>({ sources, stack }: { sources: Source[]; stack: StackFn<CollectOptions<T>>[] }) {
  const addSource: AddSource = ({ source }: { pointer: string; source: Source }) => {
    sources.push(source);
  };

  const collect = useStack(...stack);

  return {
    addSource,
    collect,
  };
}

type CollectOptions<T> = {
  pointer: string;
  pointerOptions: any;
  options: LoadTypedefsOptions<Partial<T>>;
  pointerOptionMap: Record<string, any>;
  addSource: AddSource;
  queue: AddToQueue<void>;
};

function addResultOfCustomLoader({
  pointer,
  result,
  addSource,
}: {
  pointer: string;
  result: any;
  addSource: AddSource;
}) {
  if (env['DEBUG'] != null) {
    console.time(`@graphql-tools/load: addResultOfCustomLoader ${pointer}`);
  }
  if (isSchema(result)) {
    addSource({
      source: {
        location: pointer,
        schema: result,
        document: getDocumentNodeFromSchema(result),
      },
      pointer,
      noCache: true,
    });
  } else if (result.kind && result.kind === Kind.DOCUMENT) {
    addSource({
      source: {
        document: result,
        location: pointer,
      },
      pointer,
    });
  } else if (result.document) {
    addSource({
      source: {
        location: pointer,
        ...result,
      },
      pointer,
    });
  }
  if (env['DEBUG'] != null) {
    console.timeEnd(`@graphql-tools/load: addResultOfCustomLoader ${pointer}`);
  }
}

function collectDocumentString<T>(
  { pointer, pointerOptions, options, addSource, queue }: CollectOptions<T>,
  next: StackNext
) {
  if (env['DEBUG'] != null) {
    console.time(`@graphql-tools/load: collectDocumentString ${pointer}`);
  }
  if (isDocumentString(pointer)) {
    return queue(() => {
      const source = parseGraphQLSDL(`${stringToHash(pointer)}.graphql`, pointer, {
        ...options,
        ...pointerOptions,
      });

      addSource({
        source,
        pointer,
      });
    });
  }
  if (env['DEBUG'] != null) {
    console.timeEnd(`@graphql-tools/load: collectDocumentString ${pointer}`);
  }

  next();
}

function collectCustomLoader<T>(
  { pointer, pointerOptions, queue, addSource, options, pointerOptionMap }: CollectOptions<T>,
  next: StackNext
) {
  if (pointerOptions.loader) {
    return queue(async () => {
      if (env['DEBUG'] != null) {
        console.time(`@graphql-tools/load: collectCustomLoader ${pointer}`);
      }
      await Promise.all(asArray(pointerOptions.require).map(m => import(m)));
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore TODO options.cwd is possibly undefined, but it seems like no test covers this path
      const loader = await useCustomLoader(pointerOptions.loader, options.cwd);
      const result = await loader(pointer, { ...options, ...pointerOptions }, pointerOptionMap);

      if (env['DEBUG'] != null) {
        console.timeEnd(`@graphql-tools/load: collectCustomLoader ${pointer}`);
      }
      if (!result) {
        return;
      }

      addResultOfCustomLoader({ pointer, result, addSource });
    });
  }

  next();
}

function collectCustomLoaderSync<T>(
  { pointer, pointerOptions, queue, addSource, options, pointerOptionMap }: CollectOptions<T>,
  next: StackNext
) {
  if (pointerOptions.loader) {
    return queue(() => {
      if (env['DEBUG'] != null) {
        console.time(`@graphql-tools/load: collectCustomLoaderSync ${pointer}`);
      }
      const cwdRequire = createRequire(options.cwd || cwd());
      for (const m of asArray(pointerOptions.require)) {
        cwdRequire(m);
      }
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore TODO options.cwd is possibly undefined, but it seems like no test covers this path
      const loader = useCustomLoaderSync(pointerOptions.loader, options.cwd);
      const result = loader(pointer, { ...options, ...pointerOptions }, pointerOptionMap);

      if (env['DEBUG'] != null) {
        console.timeEnd(`@graphql-tools/load: collectCustomLoaderSync ${pointer}`);
      }
      if (result) {
        addResultOfCustomLoader({ pointer, result, addSource });
      }
    });
  }

  next();
}

function collectFallback<T>({ queue, pointer, options, pointerOptions, addSource }: CollectOptions<T>) {
  return queue(async () => {
    if (env['DEBUG'] != null) {
      console.time(`@graphql-tools/load: collectFallback ${pointer}`);
    }
    const sources = await loadFile(pointer, {
      ...options,
      ...pointerOptions,
    });

    if (sources) {
      for (const source of sources) {
        addSource({ source, pointer });
      }
    }
    if (env['DEBUG'] != null) {
      console.timeEnd(`@graphql-tools/load: collectFallback ${pointer}`);
    }
  });
}

function collectFallbackSync<T>({ queue, pointer, options, pointerOptions, addSource }: CollectOptions<T>) {
  return queue(() => {
    if (env['DEBUG'] != null) {
      console.time(`@graphql-tools/load: collectFallbackSync ${pointer}`);
    }
    const sources = loadFileSync(pointer, {
      ...options,
      ...pointerOptions,
    });

    if (sources) {
      for (const source of sources) {
        addSource({ source, pointer });
      }
    }
    if (env['DEBUG'] != null) {
      console.timeEnd(`@graphql-tools/load: collectFallbackSync ${pointer}`);
    }
  });
}
