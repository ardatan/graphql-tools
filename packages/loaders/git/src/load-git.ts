import { execFile, execFileSync } from 'child_process';
import unixify from 'unixify';

type PartialInput = { ref: string };
type Input = PartialInput & { path: string };

/**
 * Reject ref/path operands that look like CLI flags so git cannot treat them as options.
 * @internal
 */
export function assertSafeGitOperand(value: string, kind: 'ref' | 'path'): void {
  if (value.startsWith('-')) {
    throw new Error(
      `Invalid git ${kind} "${value}": ref and path segments must not start with "-"`,
    );
  }
}

const createLoadError = (error: any) => new Error('Unable to load file from git: ' + error);
// Use cat-file -p (not show): `git show -- rev:path` treats the operand as a
// pathspec after `--` and returns empty, while cat-file -p still prints the blob.
const createShowCommand = ({ ref, path }: Input): string[] => {
  assertSafeGitOperand(ref, 'ref');
  assertSafeGitOperand(path, 'path');
  return ['cat-file', '-p', '--', `${ref}:${path}`];
};

const createTreeError = (error: Error) =>
  new Error('Unable to load the file tree from git: ' + error);
const createTreeCommand = ({ ref }: PartialInput): string[] => {
  assertSafeGitOperand(ref, 'ref');
  return ['ls-tree', '-r', '--name-only', '--', ref];
};

/**
 * @internal
 */
export function parseGitTreeOutput(stdout: string): string[] {
  // Git always emits LF; do not use os.EOL (CRLF on Windows) or the tree
  // collapses to a single unusable entry and micromatch matches nothing.
  // Do not trim entries — git pathnames can legally have leading/trailing spaces.
  return stdout
    .split(/\r?\n/)
    .filter(line => line.length > 0)
    .map(line => unixify(line));
}

/**
 * @internal
 */
export async function readTreeAtRef(ref: string): Promise<string[] | never> {
  try {
    return await new Promise((resolve, reject) => {
      execFile(
        'git',
        createTreeCommand({ ref }),
        { encoding: 'utf-8', maxBuffer: 1024 * 1024 * 1024 },
        (error, stdout) => {
          if (error) {
            reject(error);
          } else {
            resolve(parseGitTreeOutput(stdout));
          }
        },
      );
    });
  } catch (error: any) {
    throw createTreeError(error);
  }
}

/**
 * @internal
 */
export function readTreeAtRefSync(ref: string): string[] | never {
  try {
    return parseGitTreeOutput(
      execFileSync('git', createTreeCommand({ ref }), { encoding: 'utf-8' }),
    );
  } catch (error: any) {
    throw createTreeError(error);
  }
}

/**
 * @internal
 */
export async function loadFromGit(input: Input): Promise<string | never> {
  try {
    return await new Promise((resolve, reject) => {
      execFile(
        'git',
        createShowCommand(input),
        { encoding: 'utf-8', maxBuffer: 1024 * 1024 * 1024 },
        (error, stdout) => {
          if (error) {
            reject(error);
          } else {
            resolve(stdout);
          }
        },
      );
    });
  } catch (error: any) {
    throw createLoadError(error);
  }
}

/**
 * @internal
 */
export function loadFromGitSync(input: Input): string | never {
  try {
    return execFileSync('git', createShowCommand(input), { encoding: 'utf-8' });
  } catch (error: any) {
    throw createLoadError(error);
  }
}
