import simplegit from 'simple-git/promise';
import simplegitSync from 'simple-git';

type Input = { ref: string; path: string };

const createLoadError = (error: any) => new Error('Unable to load schema from git: ' + error);
const createCommand = ({ ref, path }: Input) => {
  return [`${ref}:${path}`];
};

export async function loadFromGit(input: Input): Promise<string | never> {
  try {
    const git = simplegit();
    return await git.show(createCommand(input));
  } catch (error) {
    throw createLoadError(error);
  }
}

export function loadFromGitSync(input: Input): string | never {
  try {
    const git = simplegitSync();
    return git.show(createCommand(input));
  } catch (error) {
    throw createLoadError(error);
  }
}
