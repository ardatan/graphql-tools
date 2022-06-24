import { PrismaDefinitionClass } from './PrismaDefinition.js';
import * as fs from 'fs';
import * as path from 'path';
import { getTmpDir } from './test/getTmpDir.js';
import { makeEnv } from './Environment.test.js';
import { Args } from './types/common.js';

const defaultGlobalRC = `prisma-1.0:
  clusters:
    local:
      host: 'http://localhost:4466'
    remote:
      host: 'https://remote.graph.cool'
      clusterSecret: 'here-is-a-token'
`;

function makeDefinition(
  yml: string,
  datamodel: string,
  _: Args = {},
  __: string = defaultGlobalRC,
  envVars: any = process.env
) {
  const definitionDir = getTmpDir();
  const definitionPath = path.join(definitionDir, 'prisma.yml');
  const modelPath = path.join(definitionDir, 'datamodel.prisma');
  const env = makeEnv(defaultGlobalRC);

  const definition = new PrismaDefinitionClass(env, definitionPath, envVars);

  fs.writeFileSync(modelPath, datamodel);
  fs.writeFileSync(definitionPath, yml);

  return { env, definition };
}

async function loadDefinition(
  yml: string,
  datamodel: string,
  args: Args = {},
  envPath?: string,
  globalRC: string = defaultGlobalRC
) {
  const { env, definition } = makeDefinition(yml, datamodel, args, globalRC);
  await env.load();
  await definition.load(args, envPath);
  return { env, definition };
}

describe('prisma definition', () => {
  test('load basic yml, provide cluster', async () => {
    const yml = `\
service: jj
stage: dev
cluster: local

datamodel:
- datamodel.prisma

secret: some-secret

schema: schemas/database.graphql
    `;
    const datamodel = `
type User @model {
  id: ID! @isUnique
  name: String!
  lol: Int
  what: String
}
`;
    try {
      await loadDefinition(yml, datamodel);
    } catch (e: any) {
      expect(e).toMatchSnapshot();
    }
  });
  test('load yml with secret and env var', async () => {
    const secret = 'this-is-a-long-secret';
    process.env['MY_TEST_SECRET'] = secret;
    const yml = `\
service: jj
stage: dev
cluster: local

datamodel:
- datamodel.prisma

secret: \${env:MY_TEST_SECRET}

schema: schemas/database.graphql
    `;
    const datamodel = `
type User @model {
  id: ID! @isUnique
  name: String!
  lol: Int
  what: String
}
`;

    try {
      await loadDefinition(yml, datamodel);
    } catch (e: any) {
      expect(e).toMatchSnapshot();
    }
  });
  test('load yml with secret and env var in .env', async () => {
    const yml = `\
service: jj
stage: dev
cluster: local

datamodel:
- datamodel.prisma

secret: \${env:MY_DOT_ENV_SECRET}

schema: schemas/database.graphql
    `;
    const datamodel = `
type User @model {
  id: ID! @isUnique
  name: String!
  lol: Int
  what: String
}
`;
    const { definition, env } = makeDefinition(yml, datamodel, {});
    const envPath = path.join(definition.definitionDir!, '.env');

    fs.mkdirSync(path.dirname(envPath), { recursive: true });
    fs.writeFileSync(envPath, `MY_DOT_ENV_SECRET=this-is-very-secret,and-comma,seperated`);

    await env.load();

    try {
      await loadDefinition(yml, datamodel);
    } catch (e: any) {
      expect(e).toMatchSnapshot();
    }
  });
  test('load yml with injected env var', async () => {
    const yml = `\
service: jj
stage: dev
cluster: local

datamodel:
- datamodel.prisma

secret: \${env:MY_INJECTED_ENV_SECRET}

schema: schemas/database.graphql
    `;
    const datamodel = `
type User @model {
  id: ID! @isUnique
  name: String!
  lol: Int
  what: String
}
`;
    const envVars = {
      MY_INJECTED_ENV_SECRET: 'some-secret',
    };

    const { env } = makeDefinition(yml, datamodel, {}, defaultGlobalRC, envVars);

    await env.load();
    try {
      await loadDefinition(yml, datamodel);
    } catch (e: any) {
      expect(e).toMatchSnapshot();
    }
  });
  /**
   * This test ensures, that GRAPHCOOL_SECRET can't be injected anymore
   */
  test(`don't load yml with secret and env var in args`, async () => {
    const yml = `\
service: jj
stage: dev
cluster: local

datamodel:
- datamodel.prisma

schema: schemas/database.graphql
    `;
    const datamodel = `
type User @model {
  id: ID! @isUnique
  name: String!
  lol: Int
  what: String
}
`;

    const definitionDir = getTmpDir();
    const definitionPath = path.join(definitionDir, 'prisma.yml');
    const modelPath = path.join(definitionDir, 'datamodel.prisma');
    const env = makeEnv(defaultGlobalRC);

    const definition = new PrismaDefinitionClass(env, definitionPath, {
      GRAPHCOOL_SECRET: 'this-is-secret',
    });

    fs.writeFileSync(modelPath, datamodel);
    fs.writeFileSync(definitionPath, yml);

    let error;
    try {
      await env.load();
      await definition.load({});
    } catch (e: any) {
      error = e;
    }

    expect(error).toMatchSnapshot();
  });
  test('load yml with disableAuth: true', async () => {
    const yml = `\
service: jj
stage: dev
cluster: local

datamodel:
- datamodel.prisma

disableAuth: true

schema: schemas/database.graphql
    `;
    const datamodel = `
type User @model {
  id: ID! @isUnique
  name: String!
  lol: Int
  what: String
}
`;
    const { definition, env } = makeDefinition(yml, datamodel);
    const envPath = path.join(definition.definitionDir!, '.env');

    fs.mkdirSync(path.dirname(envPath), { recursive: true });
    fs.writeFileSync(envPath, `MY_DOT_ENV_SECRET=this-is-very-secret,and-comma,seperated`);

    await env.load();
    try {
      await loadDefinition(yml, datamodel);
    } catch (e: any) {
      expect(e).toMatchSnapshot();
    }
  });
  test('throw when no secret or disable auth provided', async () => {
    const yml = `\
service: jj
stage: dev
cluster: local

datamodel:
- datamodel.prisma

schema: schemas/database.graphql
    `;
    const datamodel = `
type User @model {
  id: ID! @isUnique
  name: String!
  lol: Int
  what: String
}
`;

    let error;
    try {
      await loadDefinition(yml, datamodel);
    } catch (e: any) {
      error = e;
    }

    expect(error).toMatchSnapshot();
  });
  test('throws when stages key apparent', async () => {
    const yml = `\
service: jj
stage: dev
cluster: local

datamodel:
- datamodel.prisma

schema: schemas/database.graphql

stages:
  dev: local
    `;
    const datamodel = `
type User @model {
  id: ID! @isUnique
  name: String!
  lol: Int
  what: String
}
`;

    let error;
    try {
      await loadDefinition(yml, datamodel);
    } catch (e: any) {
      error = e;
    }

    expect(error).toMatchSnapshot();
  });
});
