import fs from 'fs';
import os from 'os';
import path from 'path';
import { process as transformGraphql } from '../src/index.js';

function jestConfig(graphql: Record<string, unknown> = {}) {
  return { config: { globals: { graphql } } } as any;
}

test('esModule #import emits named exports using the Jest source path', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gql-jest-'));
  try {
    fs.writeFileSync(
      path.join(dir, 'menuFields.graphql'),
      'fragment MenuFields on Menu {\n  id\n  name\n}\n',
    );
    const filePath = path.join(dir, 'foo.graphql');
    const input = `#import "./menuFields.graphql"
query Foo {
  foo {
    ...MenuFields
  }
}
`;
    fs.writeFileSync(filePath, input);

    const { code } = transformGraphql(input, filePath, jestConfig({ esModule: true }));

    expect(code).toContain('export { $gql_exp_0 as Foo }');
    expect(code).toContain('export { $gql_exp_1 as MenuFields }');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
