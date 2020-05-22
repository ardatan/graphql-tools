import { Source, isDocumentString, parseGraphQLSDL, asArray, printSchemaWithDirectives } from '@graphql-tools/utils';
import { isSchema, Kind, parse } from 'graphql';
import isGlob from 'is-glob';
import { LoadTypedefsOptions } from '../load-typedefs';
import { loadFile, loadFileSync } from './load-file';
import { stringToHash, useStack, StackNext, StackFn } from '../utils/helpers';
import { useCustomLoader, useCustomLoaderSync } from '../utils/custom-loader';
import { useQueue, useSyncQueue } from '../utils/queue';
import unixify from 'unixify';
import globby, { sync as globbySync } from 'globby';

type AddSource = (data: { pointer: string; source: Source; noCache?: boolean }) => void;
type AddGlob = (data: { pointer: string; pointerOptions: any }) => void;
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
  const sources: Source[] = [];
  const globs: string[] = [];
  const globOptions: any = {};
  const queue = useQueue<void>({ concurrency: CONCURRENCY_LIMIT });

  const { addSource, addGlob, collect } = createHelpers({
    sources,
    globs,
    options,
    globOptions,
    stack: [collectDocumentString, collectGlob, collectCustomLoader, collectFallback],
  });

  for (const pointer in pointerOptionMap) {
    const pointerOptions = {
      ...(pointerOptionMap[pointer] ?? {}),
      unixify,
    };

    collect({
      pointer,
      pointerOptions,
      pointerOptionMap,
      options,
      addSource,
      addGlob,
      queue: queue.add,
    });
  }

  if (globs.length) {
    includeIgnored({
      options,
      globs,
    });

    const paths = await globby(globs, createGlobbyOptions(options));

    collectSourcesFromGlobals({
      filepaths: paths,
      options,
      globOptions,
      pointerOptionMap,
      addSource,
      queue: queue.add,
    });
  }

  await queue.runAll();

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
  const globs: string[] = [];
  const globOptions: any = {};
  const queue = useSyncQueue<void>();

  const { addSource, addGlob, collect } = createHelpers({
    sources,
    globs,
    options,
    globOptions,
    stack: [collectDocumentString, collectGlob, collectCustomLoaderSync, collectFallbackSync],
  });

  for (const pointer in pointerOptionMap) {
    const pointerOptions = {
      ...(pointerOptionMap[pointer] ?? {}),
      unixify,
    };

    collect({
      pointer,
      pointerOptions,
      pointerOptionMap,
      options,
      addSource,
      addGlob,
      queue: queue.add,
    });
  }

  if (globs.length) {
    includeIgnored({
      options,
      globs,
    });

    const paths = globbySync(globs, createGlobbyOptions(options));

    collectSourcesFromGlobalsSync({
      filepaths: paths,
      options,
      globOptions,
      pointerOptionMap,
      addSource,
      queue: queue.add,
    });
  }

  queue.runAll();

  return sources;
}

//

function createHelpers<T>({
  sources,
  globs,
  options,
  globOptions,
  stack,
}: {
  sources: Source[];
  globs: string[];
  options: LoadTypedefsOptions<Partial<T>>;
  globOptions: any;
  stack: StackFn<CollectOptions<T>>[];
}) {
  const addSource: AddSource = ({
    pointer,
    source,
    noCache,
  }: {
    pointer: string;
    source: Source;
    noCache?: boolean;
  }) => {
    sources.push(source);

    if (!noCache) {
      options.cache[pointer] = source;
    }
  };

  const collect = useStack(...stack);

  const addGlob: AddGlob = ({ pointerOptions, pointer }) => {
    globs.push(pointer);
    Object.assign(globOptions, pointerOptions);
  };

  return {
    addSource,
    collect,
    addGlob,
  };
}

function includeIgnored<
  T extends {
    ignore?: string | string[];
  }
>({ options, globs }: { options: T; globs: string[] }) {
  if (options.ignore) {
    const ignoreList = asArray(options.ignore)
      .map(g => `!(${g})`)
      .map<string>(unixify);

    if (ignoreList.length > 0) {
      globs.push(...ignoreList);
    }
  }
}

function createGlobbyOptions(options: any): any {
  return { absolute: true, ...options, ignore: [] };
}

function collectSourcesFromGlobals<T, P>({
  filepaths,
  options,
  globOptions,
  pointerOptionMap,
  addSource,
  queue,
}: {
  filepaths: string[];
  options: LoadTypedefsOptions<Partial<T>>;
  globOptions: any;
  pointerOptionMap: P;
  addSource: AddSource;
  queue: AddToQueue<void>;
}) {
  const collectFromGlobs = useStack(collectCustomLoader, collectFallback);

  for (let i = 0; i < filepaths.length; i++) {
    const pointer = filepaths[i];

    collectFromGlobs({
      pointer,
      pointerOptions: globOptions,
      pointerOptionMap,
      options,
      addSource,
      addGlob: () => {
        throw new Error(`I don't accept any new globs!`);
      },
      queue,
    });
  }
}

function collectSourcesFromGlobalsSync<T, P>({
  filepaths,
  options,
  globOptions,
  pointerOptionMap,
  addSource,
  queue,
}: {
  filepaths: string[];
  options: LoadTypedefsOptions<Partial<T>>;
  globOptions: any;
  pointerOptionMap: P;
  addSource: AddSource;
  queue: AddToQueue<void>;
}) {
  const collectFromGlobs = useStack(collectCustomLoaderSync, collectFallbackSync);

  for (let i = 0; i < filepaths.length; i++) {
    const pointer = filepaths[i];

    collectFromGlobs({
      pointer,
      pointerOptions: globOptions,
      pointerOptionMap,
      options,
      addSource,
      addGlob: () => {
        throw new Error(`I don't accept any new globs!`);
      },
      queue,
    });
  }
}

type CollectOptions<T> = {
  pointer: string;
  pointerOptions: any;
  options: LoadTypedefsOptions<Partial<T>>;
  pointerOptionMap: Record<string, any>;
  addSource: AddSource;
  addGlob: AddGlob;
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
  if (isSchema(result)) {
    addSource({
      source: {
        location: pointer,
        schema: result,
        document: parse(printSchemaWithDirectives(result)),
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
}

function collectDocumentString<T>(
  { pointer, pointerOptions, options, addSource, queue }: CollectOptions<T>,
  next: StackNext
) {
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

  next();
}

function collectGlob<T>({ pointer, pointerOptions, addGlob }: CollectOptions<T>, next: StackNext) {
  if (isGlob(pointerOptions.unixify(pointer))) {
    return addGlob({
      pointer: pointerOptions.unixify(pointer),
      pointerOptions,
    });
  }

  next();
}

function collectCustomLoader<T>(
  { pointer, pointerOptions, queue, addSource, options, pointerOptionMap }: CollectOptions<T>,
  next: StackNext
) {
  if (pointerOptions.loader) {
    return queue(async () => {
      const loader = await useCustomLoader(pointerOptions.loader, options.cwd);
      const result = await loader(pointer, { ...options, ...pointerOptions }, pointerOptionMap);

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
      const loader = useCustomLoaderSync(pointerOptions.loader, options.cwd);
      const result = loader(pointer, { ...options, ...pointerOptions }, pointerOptionMap);

      if (result) {
        addResultOfCustomLoader({ pointer, result, addSource });
      }
    });
  }

  next();
}

function collectFallback<T>({ queue, pointer, options, pointerOptions, addSource }: CollectOptions<T>) {
  return queue(async () => {
    const source = await loadFile(pointer, {
      ...options,
      ...pointerOptions,
    });

    if (source) {
      addSource({ source, pointer });
    }
  });
}

function collectFallbackSync<T>({ queue, pointer, options, pointerOptions, addSource }: CollectOptions<T>) {
  return queue(() => {
    const source = loadFileSync(pointer, {
      ...options,
      ...pointerOptions,
    });

    if (source) {
      addSource({ source, pointer });
    }
  });
}
