import { existsSync, promises as fsPromises, readFileSync } from 'fs';
import { basename, join, resolve } from 'path';
import globby from 'globby';
import { Kind, parse, print, visit, type DocumentNode } from 'graphql';
import memoizee from 'memoizee';
import unixify from 'unixify';
import {
  gqlPluckFromCodeStringSync,
  type GraphQLTagPluckOptions,
} from '@graphql-tools/graphql-tag-pluck';

const { readFile } = fsPromises;

interface FragmentInfo {
  name: string;
  typeCondition: string;
}

interface ParsedSource {
  rawSDL: string;
  document: DocumentNode;
}

interface ExtractedFileInfo {
  sources: ParsedSource[];
  definitions: FragmentInfo[];
  spreads: Set<string>;
  spreadsPerFragment: Map<string, Set<string>>;
}

interface PackageMapBuilder {
  fragments: Map<string, { filePath: string; typeCondition: string }>;
  spreadsPerFile: Map<string, Set<string>>;
  defsPerFile: Map<string, FragmentInfo[]>;
  sourcesPerFile: Map<string, ParsedSource[]>;
  spreadsPerFragment: Map<string, Set<string>>;
}

interface PackageMapData {
  sourcesPerFile: Map<string, ParsedSource[]>;
  spreadsPerFragment: Map<string, Set<string>>;
}

const packageMapData = new WeakMap<PackageFragmentMap, PackageMapData>();

export interface PackageFragmentMap {
  fragments: Map<string, { filePath: string; typeCondition: string }>;
  spreadsPerFile: Map<string, Set<string>>;
  defsPerFile: Map<string, FragmentInfo[]>;
}

export interface ResolvedExternalFile {
  filePath: string;
  definitions: FragmentInfo[];
  packageName: string;
}

interface ResolvedExternalFileWithSources extends ResolvedExternalFile {
  sources: ParsedSource[];
}

export interface ExternalFragmentResolverOptions {
  packageDir: string;
  externalPackagesDirs: string[];
  externalPackageNameFilter?: (packageName: string) => boolean;
  includeDevDependencies?: boolean;
  scanInternalDirs?: string[];
  extensions?: string[];
  excludePatterns?: string[];
  pluckConfig?: GraphQLTagPluckOptions;
  fileContentFilter?: (content: string, filePath: string) => boolean;
  /**
   * Time-to-live for cache entries in milliseconds. Cache configuration is
   * shared by all resolver calls in this module. External package maps include
   * parsed sources; root package maps are not retained unless they were
   * already cached as external dependencies. Supplying a different value
   * recreates all memoized caches and discards their existing entries.
   * @default Infinity (cache forever)
   */
  cacheTTL?: number;
  invalidateRootPackageCache?: boolean;
}

// --- Core logic ---

const DEFAULT_EXTENSIONS = ['ts', 'tsx', 'js', 'jsx', 'graphql', 'gql'];
const DEFAULT_SCAN_INTERNAL_DIRS = ['src'];
const DEFAULT_EXCLUDE_PATTERNS = ['**/__generated__/**', '**/node_modules/**'];
const GQL_EXTENSIONS = ['graphql', 'gql'];

function getSourceGlob(extensions: string[]): string {
  return extensions.length === 1 ? `**/*.${extensions[0]}` : `**/*.{${extensions.join(',')}}`;
}

function isGraphQLFile(filePath: string): boolean {
  return GQL_EXTENSIONS.some(ext => filePath.endsWith(`.${ext}`));
}

function extractFragmentsAndSpreads(
  filePath: string,
  fileContent: string,
  pluckConfig?: GraphQLTagPluckOptions,
): ExtractedFileInfo {
  const rawSDLs = isGraphQLFile(filePath)
    ? [fileContent]
    : gqlPluckFromCodeStringSync(filePath, fileContent, pluckConfig).map(source => source.body);
  const sources = rawSDLs.map(rawSDL => ({
    rawSDL,
    document: parse(rawSDL, { noLocation: true }),
  }));

  const definitions: FragmentInfo[] = [];
  const spreads = new Set<string>();
  const spreadsPerFragment = new Map<string, Set<string>>();

  for (const source of sources) {
    visit(source.document, {
      [Kind.FRAGMENT_DEFINITION](node) {
        definitions.push({
          name: node.name.value,
          typeCondition: node.typeCondition.name.value,
        });

        const fragmentSpreads = spreadsPerFragment.get(node.name.value) ?? new Set<string>();
        visit(node, {
          [Kind.FRAGMENT_SPREAD](spread) {
            fragmentSpreads.add(spread.name.value);
          },
        });
        spreadsPerFragment.set(node.name.value, fragmentSpreads);
      },
      [Kind.FRAGMENT_SPREAD](node) {
        spreads.add(node.name.value);
      },
    });
  }

  return { sources, definitions, spreads, spreadsPerFragment };
}

function createPackageMapBuilder(): PackageMapBuilder {
  return {
    fragments: new Map(),
    spreadsPerFile: new Map(),
    defsPerFile: new Map(),
    sourcesPerFile: new Map(),
    spreadsPerFragment: new Map(),
  };
}

function registerFile(
  builder: PackageMapBuilder,
  packageDir: string,
  filePath: string,
  info: ExtractedFileInfo,
): void {
  builder.sourcesPerFile.set(filePath, info.sources);
  if (info.definitions.length === 0 && info.spreads.size === 0) return;

  builder.defsPerFile.set(filePath, info.definitions);
  builder.spreadsPerFile.set(filePath, info.spreads);

  for (const [fragmentName, fragmentSpreads] of info.spreadsPerFragment) {
    const spreads = builder.spreadsPerFragment.get(fragmentName) ?? new Set<string>();
    for (const spread of fragmentSpreads) {
      spreads.add(spread);
    }
    builder.spreadsPerFragment.set(fragmentName, spreads);
  }

  for (const def of info.definitions) {
    const existing = builder.fragments.get(def.name);
    if (existing && existing.filePath !== filePath) {
      throw new Error(
        `Duplicate fragment "${def.name}" within package at "${packageDir}": ` +
          `defined in "${existing.filePath}" and "${filePath}".`,
      );
    }
    builder.fragments.set(def.name, { filePath, typeCondition: def.typeCondition });
  }
}

function parseFile(
  filePath: string,
  content: string,
  pluckConfig?: GraphQLTagPluckOptions,
  fileContentFilter?: (content: string, filePath: string) => boolean,
): ExtractedFileInfo | undefined {
  if (fileContentFilter && !fileContentFilter(content, filePath)) return;

  try {
    return extractFragmentsAndSpreads(filePath, content, pluckConfig);
  } catch {
    return undefined;
  }
}

// --- Memoized functions ---

function createPackageFragmentMap(builder: PackageMapBuilder): PackageFragmentMap {
  const map = {
    fragments: builder.fragments,
    spreadsPerFile: builder.spreadsPerFile,
    defsPerFile: builder.defsPerFile,
  };
  packageMapData.set(map, {
    sourcesPerFile: builder.sourcesPerFile,
    spreadsPerFragment: builder.spreadsPerFragment,
  });
  return map;
}

function getPackageMapData(map: PackageFragmentMap): PackageMapData {
  const data = packageMapData.get(map);
  if (!data) {
    throw new Error('External fragment package map metadata is missing.');
  }
  return data;
}

function readPackageJsonDepsRaw(
  packageJsonPath: string,
  includeDevDependencies: boolean,
): string[] {
  try {
    const content = readFileSync(packageJsonPath, 'utf8');
    const { dependencies = {}, devDependencies = {} } = JSON.parse(content);
    const allDeps = includeDevDependencies ? { ...dependencies, ...devDependencies } : dependencies;
    return Object.keys(allDeps);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

function buildPackageFragmentMapRaw(
  packageDir: string,
  scanInternalDirs: string[],
  extensions: string[],
  excludePatterns: string[],
  pluckConfig?: GraphQLTagPluckOptions,
  fileContentFilter?: (content: string, filePath: string) => boolean,
): PackageFragmentMap {
  const builder = createPackageMapBuilder();

  const dirs = scanInternalDirs
    .map(folder => resolve(packageDir, folder))
    .filter(dir => existsSync(dir));

  if (dirs.length === 0) {
    return createPackageFragmentMap(builder);
  }

  const sourceGlob = getSourceGlob(extensions);
  const ignorePatterns = excludePatterns.map(p => `!${p}`);

  const allFiles = dirs.flatMap(dir =>
    globby.sync([unixify(sourceGlob), ...ignorePatterns.map(unixify)], {
      cwd: dir,
      absolute: true,
    }),
  );

  for (const filePath of allFiles) {
    const content = readFileSync(filePath, 'utf8');
    const info = parseFile(filePath, content, pluckConfig, fileContentFilter);
    if (info) registerFile(builder, packageDir, filePath, info);
  }

  return createPackageFragmentMap(builder);
}

async function buildPackageFragmentMapAsyncRaw(
  packageDir: string,
  scanInternalDirs: string[],
  extensions: string[],
  excludePatterns: string[],
  pluckConfig?: GraphQLTagPluckOptions,
  fileContentFilter?: (content: string, filePath: string) => boolean,
): Promise<PackageFragmentMap> {
  const builder = createPackageMapBuilder();

  const dirs = scanInternalDirs
    .map(folder => resolve(packageDir, folder))
    .filter(dir => existsSync(dir));

  if (dirs.length === 0) {
    return createPackageFragmentMap(builder);
  }

  const sourceGlob = getSourceGlob(extensions);
  const ignorePatterns = excludePatterns.map(p => `!${p}`);

  const allFiles = (
    await Promise.all(
      dirs.map(dir =>
        globby([unixify(sourceGlob), ...ignorePatterns.map(unixify)], {
          cwd: dir,
          absolute: true,
        }),
      ),
    )
  ).flat();

  await Promise.all(
    allFiles.map(async filePath => {
      const content = await readFile(filePath, 'utf8');
      const info = parseFile(filePath, content, pluckConfig, fileContentFilter);
      if (info) registerFile(builder, packageDir, filePath, info);
    }),
  );

  return createPackageFragmentMap(builder);
}

type PackageMapArgs = [
  packageDir: string,
  scanInternalDirs: string[],
  extensions: string[],
  excludePatterns: string[],
  pluckConfig?: GraphQLTagPluckOptions,
  fileContentFilter?: (content: string, filePath: string) => boolean,
];

type MemoizedPackageMap<Result> = ((...args: PackageMapArgs) => Result) & {
  _get(...args: PackageMapArgs): Result | undefined;
  _has(...args: PackageMapArgs): boolean;
  delete(...args: PackageMapArgs): void;
  clear(): void;
};

let readPackageJsonDeps = memoizee(readPackageJsonDepsRaw, { primitive: true });
// Fragment-map options contain arrays, objects, and callbacks. Use memoizee's
// identity-based normalization so distinct option values cannot collide.
let buildPackageFragmentMap = memoizee(
  buildPackageFragmentMapRaw,
) as MemoizedPackageMap<PackageFragmentMap>;
let buildPackageFragmentMapAsync = memoizee(buildPackageFragmentMapAsyncRaw, {
  promise: true,
}) as MemoizedPackageMap<Promise<PackageFragmentMap>>;

let appliedCacheTTL: number | undefined;

function createMemoized(cacheTTL?: number): void {
  const ttlOpt = cacheTTL != null && cacheTTL !== Infinity ? { maxAge: cacheTTL } : undefined;

  readPackageJsonDeps = memoizee(readPackageJsonDepsRaw, {
    primitive: true,
    ...ttlOpt,
  });
  buildPackageFragmentMap = memoizee(buildPackageFragmentMapRaw, {
    ...ttlOpt,
  }) as MemoizedPackageMap<PackageFragmentMap>;
  buildPackageFragmentMapAsync = memoizee(buildPackageFragmentMapAsyncRaw, {
    promise: true,
    ...ttlOpt,
  }) as MemoizedPackageMap<Promise<PackageFragmentMap>>;

  appliedCacheTTL = cacheTTL;
}

function initCache(cacheTTL?: number): void {
  if (cacheTTL !== appliedCacheTTL) {
    createMemoized(cacheTTL);
  }
}

/**
 * Clears all internal caches.
 */
export function clearCache(): void {
  readPackageJsonDeps.clear();
  buildPackageFragmentMap.clear();
  buildPackageFragmentMapAsync.clear();
  appliedCacheTTL = undefined;
}

function getCachedPackageFragmentMap(args: PackageMapArgs): PackageFragmentMap | undefined {
  if (!buildPackageFragmentMap._has(...args)) {
    return undefined;
  }
  return buildPackageFragmentMap._get(...args);
}

function getCachedPackageFragmentMapAsync(
  args: PackageMapArgs,
): Promise<PackageFragmentMap> | undefined {
  if (!buildPackageFragmentMapAsync._has(...args)) {
    return undefined;
  }
  return buildPackageFragmentMapAsync._get(...args);
}

function getPackageFragmentMap(args: PackageMapArgs, cacheResult: boolean): PackageFragmentMap {
  if (cacheResult) {
    return buildPackageFragmentMap(...args);
  }

  return getCachedPackageFragmentMap(args) ?? buildPackageFragmentMapRaw(...args);
}

function getPackageFragmentMapAsync(
  args: PackageMapArgs,
  cacheResult: boolean,
): Promise<PackageFragmentMap> {
  if (cacheResult) {
    return buildPackageFragmentMapAsync(...args);
  }

  return getCachedPackageFragmentMapAsync(args) ?? buildPackageFragmentMapAsyncRaw(...args);
}

// --- Shared helpers ---

function findPackageDir(packageName: string, externalPackagesDirs: string[]): string | null {
  for (const searchPath of externalPackagesDirs) {
    const candidate = join(searchPath, packageName);
    if (existsSync(join(candidate, 'package.json'))) {
      return candidate;
    }
  }
  return null;
}

function collectTransitiveDeps(
  packageName: string,
  externalPackagesDirs: string[],
  filter: (name: string) => boolean,
  includeDevDependencies: boolean,
  visited: Set<string> = new Set(),
  result: Set<string> = new Set(),
): Set<string> {
  if (visited.has(packageName)) return result;
  visited.add(packageName);

  const pkgDir = findPackageDir(packageName, externalPackagesDirs);
  if (!pkgDir) return result;

  result.add(packageName);

  const packageJsonPath = join(pkgDir, 'package.json');
  const deps = readPackageJsonDeps(packageJsonPath, includeDevDependencies);

  for (const dep of deps.filter(filter)) {
    collectTransitiveDeps(
      dep,
      externalPackagesDirs,
      filter,
      includeDevDependencies,
      visited,
      result,
    );
  }

  return result;
}

function findMissingFragments(rootMap: PackageFragmentMap): Set<string> {
  const missing = new Set<string>();
  for (const spreads of rootMap.spreadsPerFile.values()) {
    for (const spread of spreads) {
      if (!rootMap.fragments.has(spread)) {
        missing.add(spread);
      }
    }
  }
  return missing;
}

function findExternalFragments(
  missingFragments: Set<string>,
  depMaps: Map<string, PackageFragmentMap>,
  rootMap: PackageFragmentMap,
  rootPackageName: string,
  filterToRequiredFragments: boolean,
): ResolvedExternalFileWithSources[] {
  const globalIndex = new Map<
    string,
    { packageName: string; filePath: string; typeCondition: string }[]
  >();
  for (const [depName, map] of depMaps) {
    for (const [fragName, info] of map.fragments) {
      const entry = {
        packageName: depName,
        filePath: info.filePath,
        typeCondition: info.typeCondition,
      };
      const existing = globalIndex.get(fragName);
      if (existing) {
        existing.push(entry);
      } else {
        globalIndex.set(fragName, [entry]);
      }
    }
  }

  const resolvedFiles = new Map<string, ResolvedExternalFile>();
  const requiredFragmentNamesPerFile = new Map<string, Set<string>>();
  const resolvedFragmentNames = new Set<string>();
  const localFragmentNames = new Set(rootMap.fragments.keys());

  const unresolved = new Set(missingFragments);

  while (unresolved.size > 0) {
    const nextUnresolved = new Set<string>();
    const errors: string[] = [];

    for (const fragName of unresolved) {
      if (resolvedFragmentNames.has(fragName) || localFragmentNames.has(fragName)) continue;

      const entries = globalIndex.get(fragName);
      if (!entries) {
        errors.push(
          `Fragment "${fragName}" is spread in "${rootPackageName}" but not defined in any of its transitive dependencies.`,
        );
      } else if (entries.length > 1) {
        const providers = entries.map(e => `"${e.packageName}" (${e.filePath})`).join(' and ');
        errors.push(`Duplicate fragment "${fragName}" found in ${providers}.`);
      } else {
        const entry = entries[0];
        resolvedFragmentNames.add(fragName);

        const requiredFragmentNames =
          requiredFragmentNamesPerFile.get(entry.filePath) ?? new Set<string>();
        requiredFragmentNames.add(fragName);
        requiredFragmentNamesPerFile.set(entry.filePath, requiredFragmentNames);

        const depMap = depMaps.get(entry.packageName)!;
        if (!resolvedFiles.has(entry.filePath)) {
          const defs = depMap.defsPerFile.get(entry.filePath) || [];
          resolvedFiles.set(entry.filePath, {
            filePath: entry.filePath,
            definitions: defs,
            packageName: entry.packageName,
          });
        }

        const spreads = filterToRequiredFragments
          ? getPackageMapData(depMap).spreadsPerFragment.get(fragName)
          : depMap.spreadsPerFile.get(entry.filePath);
        for (const spread of spreads ?? []) {
          if (!resolvedFragmentNames.has(spread) && !localFragmentNames.has(spread)) {
            nextUnresolved.add(spread);
          }
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(errors.join('\n'));
    }

    if (nextUnresolved.size === 0) break;
    unresolved.clear();
    for (const s of nextUnresolved) unresolved.add(s);
  }

  return [...resolvedFiles.values()].map(file => {
    const depMap = depMaps.get(file.packageName)!;
    const sources = getPackageMapData(depMap).sourcesPerFile.get(file.filePath) ?? [];
    const requiredFragmentNames = requiredFragmentNamesPerFile.get(file.filePath) ?? new Set();

    return {
      ...file,
      sources: filterToRequiredFragments ? filterParsedSources(sources, requiredFragmentNames) : [],
    };
  });
}

function filterParsedSources(
  sources: ParsedSource[],
  requiredFragmentNames: Set<string>,
): ParsedSource[] {
  const filteredSources: ParsedSource[] = [];

  for (const source of sources) {
    const definitions = source.document.definitions.filter(
      definition =>
        definition.kind === Kind.FRAGMENT_DEFINITION &&
        requiredFragmentNames.has(definition.name.value),
    );

    if (definitions.length === 0) {
      continue;
    }

    const document: DocumentNode =
      definitions.length === source.document.definitions.length
        ? source.document
        : { kind: Kind.DOCUMENT, definitions };

    filteredSources.push({
      rawSDL:
        definitions.length === source.document.definitions.length ? source.rawSDL : print(document),
      document,
    });
  }

  return filteredSources;
}

function detectDuplicateFragments(
  rootMap: PackageFragmentMap,
  resolvedFiles: ResolvedExternalFile[],
  rootPackageName: string,
): void {
  const registry = new Map<string, { packageName: string; filePath: string }>();

  for (const [fragName, info] of rootMap.fragments) {
    registry.set(fragName, { packageName: rootPackageName, filePath: info.filePath });
  }

  const errors: string[] = [];
  for (const resolved of resolvedFiles) {
    for (const def of resolved.definitions) {
      const existing = registry.get(def.name);
      if (existing) {
        errors.push(
          `Duplicate fragment "${def.name}" found in "${resolved.packageName}" (${resolved.filePath}) ` +
            `and "${existing.packageName}" (${existing.filePath}).`,
        );
      }
      registry.set(def.name, { packageName: resolved.packageName, filePath: resolved.filePath });
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }
}

function getPackageNameFromDir(packageDir: string): string {
  try {
    const pkg = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'));
    return pkg.name || basename(packageDir) || 'unknown';
  } catch {
    return basename(packageDir) || 'unknown';
  }
}

interface NormalizedOptions {
  externalPackagesDirs: string[];
  filter: (packageName: string) => boolean;
  includeDevDependencies: boolean;
  scanInternalDirs: string[];
  extensions: string[];
  excludePatterns: string[];
  invalidateRootPackageCache: boolean;
}

function normalizeOptions(options: ExternalFragmentResolverOptions): NormalizedOptions {
  const externalPackagesDirs = options.externalPackagesDirs;
  const filter = options.externalPackageNameFilter ?? (() => true);
  const includeDevDependencies = options.includeDevDependencies ?? true;
  const scanInternalDirs = options.scanInternalDirs ?? DEFAULT_SCAN_INTERNAL_DIRS;
  const extensions = options.extensions ?? DEFAULT_EXTENSIONS;
  const excludePatterns = options.excludePatterns ?? DEFAULT_EXCLUDE_PATTERNS;
  const invalidateRootPackageCache = options.invalidateRootPackageCache ?? false;
  return {
    externalPackagesDirs,
    filter,
    includeDevDependencies,
    scanInternalDirs,
    extensions,
    excludePatterns,
    invalidateRootPackageCache,
  };
}

function getTransitiveDeps(
  packageDir: string,
  { externalPackagesDirs, filter, includeDevDependencies }: NormalizedOptions,
): Set<string> {
  const packageJsonPath = join(packageDir, 'package.json');
  const rootDeps = readPackageJsonDeps(packageJsonPath, includeDevDependencies);
  const filteredRootDeps = rootDeps.filter(filter);

  const transitiveDeps = new Set<string>();
  for (const dep of filteredRootDeps) {
    collectTransitiveDeps(
      dep,
      externalPackagesDirs,
      filter,
      includeDevDependencies,
      new Set(),
      transitiveDeps,
    );
  }
  return transitiveDeps;
}

function resolveFromMaps(
  rootMap: PackageFragmentMap,
  depMaps: Map<string, PackageFragmentMap>,
  rootPackageName: string,
  missingFragments: Set<string>,
  filterToRequiredFragments: boolean,
): ResolvedExternalFileWithSources[] {
  const resolvedFiles = findExternalFragments(
    missingFragments,
    depMaps,
    rootMap,
    rootPackageName,
    filterToRequiredFragments,
  );
  detectDuplicateFragments(rootMap, resolvedFiles, rootPackageName);

  return resolvedFiles;
}

function toPublicResolvedFiles(
  resolvedFiles: ResolvedExternalFileWithSources[],
): ResolvedExternalFile[] {
  return resolvedFiles.map(({ filePath, definitions, packageName }) => ({
    filePath,
    definitions,
    packageName,
  }));
}

function getPackageMapArgs(
  packageDir: string,
  options: ExternalFragmentResolverOptions,
  { scanInternalDirs, extensions, excludePatterns }: NormalizedOptions,
): PackageMapArgs {
  return [
    packageDir,
    scanInternalDirs,
    extensions,
    excludePatterns,
    options.pluckConfig,
    options.fileContentFilter,
  ];
}

function invalidateRootPackageCacheIfRequested(
  options: ExternalFragmentResolverOptions,
  { includeDevDependencies, invalidateRootPackageCache }: NormalizedOptions,
  rootPackageMapArgs: PackageMapArgs,
  deleteMap: (...args: PackageMapArgs) => void,
): void {
  if (!invalidateRootPackageCache) return;

  deleteMap(...rootPackageMapArgs);
  readPackageJsonDeps.delete(join(options.packageDir, 'package.json'), includeDevDependencies);
}

interface ResolutionContext {
  rootMap: PackageFragmentMap;
  rootPackageName: string;
  missingFragments: Set<string>;
  transitiveDeps: Set<string>;
}

function createResolutionContext(
  packageDir: string,
  normalized: NormalizedOptions,
  rootMap: PackageFragmentMap,
): ResolutionContext | undefined {
  const missingFragments = findMissingFragments(rootMap);
  if (missingFragments.size === 0) return;

  const rootPackageName = getPackageNameFromDir(packageDir);
  const transitiveDeps = getTransitiveDeps(packageDir, normalized);
  if (transitiveDeps.size === 0) {
    const errors = [...missingFragments].map(
      frag =>
        `Fragment "${frag}" is spread in "${rootPackageName}" but no transitive dependencies were found to search.`,
    );
    throw new Error(errors.join('\n'));
  }

  return { rootMap, rootPackageName, missingFragments, transitiveDeps };
}

function getDependencyPackages(
  options: ExternalFragmentResolverOptions,
  normalized: NormalizedOptions,
  packageNames: Set<string>,
): { name: string; args: PackageMapArgs }[] {
  const dependencies: { name: string; args: PackageMapArgs }[] = [];

  for (const name of packageNames) {
    const packageDir = findPackageDir(name, normalized.externalPackagesDirs);
    if (packageDir) {
      dependencies.push({ name, args: getPackageMapArgs(packageDir, options, normalized) });
    }
  }

  return dependencies;
}

// --- Public API ---

/**
 * Resolves cross-package GraphQL fragment dependencies across external packages.
 * Async version — reads files in parallel for better performance on large codebases.
 */
export async function resolveExternalFragmentsWithSources(
  options: ExternalFragmentResolverOptions,
  filterToRequiredFragments = true,
): Promise<ResolvedExternalFileWithSources[]> {
  const normalized = normalizeOptions(options);

  initCache(options.cacheTTL);

  const rootPackageMapArgs = getPackageMapArgs(options.packageDir, options, normalized);
  invalidateRootPackageCacheIfRequested(
    options,
    normalized,
    rootPackageMapArgs,
    buildPackageFragmentMapAsync.delete,
  );

  // Consumer packages are intentionally not inserted into the cache. If this
  // package was already encountered as a provider, reuse that cached map.
  const rootMap = await getPackageFragmentMapAsync(rootPackageMapArgs, false);
  const context = createResolutionContext(options.packageDir, normalized, rootMap);
  if (!context) return [];

  const depMaps = new Map<string, PackageFragmentMap>();
  await Promise.all(
    getDependencyPackages(options, normalized, context.transitiveDeps).map(async dependency => {
      const map = await getPackageFragmentMapAsync(dependency.args, true);
      depMaps.set(dependency.name, map);
    }),
  );

  return resolveFromMaps(
    context.rootMap,
    depMaps,
    context.rootPackageName,
    context.missingFragments,
    filterToRequiredFragments,
  );
}

export async function resolveExternalFragments(
  options: ExternalFragmentResolverOptions,
): Promise<ResolvedExternalFile[]> {
  const resolvedFiles = await resolveExternalFragmentsWithSources(options, false);
  return toPublicResolvedFiles(resolvedFiles);
}

/**
 * Resolves cross-package GraphQL fragment dependencies across external packages.
 * Sync version.
 */
export function resolveExternalFragmentsSyncWithSources(
  options: ExternalFragmentResolverOptions,
  filterToRequiredFragments = true,
): ResolvedExternalFileWithSources[] {
  const normalized = normalizeOptions(options);

  initCache(options.cacheTTL);

  const rootPackageMapArgs = getPackageMapArgs(options.packageDir, options, normalized);
  invalidateRootPackageCacheIfRequested(
    options,
    normalized,
    rootPackageMapArgs,
    buildPackageFragmentMap.delete,
  );

  // Consumer packages are intentionally not inserted into the cache. If this
  // package was already encountered as a provider, reuse that cached map.
  const rootMap = getPackageFragmentMap(rootPackageMapArgs, false);
  const context = createResolutionContext(options.packageDir, normalized, rootMap);
  if (!context) return [];

  const depMaps = new Map<string, PackageFragmentMap>();
  for (const dependency of getDependencyPackages(options, normalized, context.transitiveDeps)) {
    depMaps.set(dependency.name, getPackageFragmentMap(dependency.args, true));
  }

  return resolveFromMaps(
    context.rootMap,
    depMaps,
    context.rootPackageName,
    context.missingFragments,
    filterToRequiredFragments,
  );
}

export function resolveExternalFragmentsSync(
  options: ExternalFragmentResolverOptions,
): ResolvedExternalFile[] {
  const resolvedFiles = resolveExternalFragmentsSyncWithSources(options, false);
  return toPublicResolvedFiles(resolvedFiles);
}
