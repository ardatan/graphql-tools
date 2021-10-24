export function joinPaths(...paths: string[]) {
  const seperator = paths.some(path => path.includes('\\')) ? '\\' : '/';
  return paths.join(seperator);
}

export function isAbsolutePath(path: string) {
  if (path.includes('\\')) {
    return path[1] === ':';
  }
  return path.startsWith('/');
}
