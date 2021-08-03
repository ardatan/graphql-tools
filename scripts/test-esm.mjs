import globby from 'globby';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const ignore = ['../packages/node-require/dist/index.mjs', '../packages/links/dist/index.mjs'];

async function main() {
  const mjsFiles = await globby(['../packages/*/dist/*.mjs', '../packages/loaders/*/dist/*.mjs'], {
    cwd: dirname(fileURLToPath(import.meta.url)),
  });

  const ok = [];
  const fail = [];

  let i = 0;
  await Promise.all(
    mjsFiles.map(mjsFile => {
      if (ignore.includes(mjsFile)) return;

      const mjsPath = `./${mjsFile}`;
      return import(mjsPath)
        .then(() => {
          ok.push(mjsPath);
        })
        .catch(err => {
          const color = i++ % 2 === 0 ? chalk.magenta : chalk.red;
          console.error(color('\n\n-----\n' + i + '\n'));
          console.error(mjsPath, err);
          console.error(color('\n-----\n\n'));
          fail.push(mjsPath);
        });
    })
  );
  ignore.length && console.warn(chalk.yellow(`${ignore.length} Ignoring: ${ignore.join(' | ')}`));
  ok.length && console.log(chalk.blue(`${ok.length} OK: ${ok.join(' | ')}`));
  fail.length && console.error(chalk.red(`${fail.length} Fail: ${fail.join(' | ')}`));

  if (fail.length) {
    console.error('\nFAILED');
    process.exit(1);
  } else if (ok.length) {
    console.error('\nOK');
    process.exit(0);
  } else {
    console.error('No files analyzed!');
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
