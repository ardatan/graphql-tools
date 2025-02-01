import unixify from 'unixify';

export function unixifyWithDriveLetter(path: string): string {
  if (path.match(/^[A-Z]:\\/)) {
    const driveLetter = path[0];
    return `${driveLetter}:${unixify(path)}`;
  }
  return unixify(path);
}
