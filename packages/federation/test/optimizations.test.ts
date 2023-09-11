import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'graphql';
import { createDefaultExecutor } from '@graphql-tools/delegate';
import { normalizedExecutor } from '@graphql-tools/executor';
import { buildSubgraphSchema } from '../src/subgraph';
import { getStitchedSchemaFromSupergraphSdl } from '../src/supergraph';
import * as Accounts from './fixtures/gateway/accounts';
import * as Inventory from './fixtures/gateway/inventory';
import * as Products from './fixtures/gateway/products';
import * as Reviews from './fixtures/gateway/reviews';

describe('Optimizations', () => {
  it('should not do extra calls with "@provides"', async () => {
    const services = [Accounts, Products, Reviews, Inventory];
    let accountsCalled = false;
    const supergraphSchema = getStitchedSchemaFromSupergraphSdl({
      supergraphSdl: readFileSync(
        join(__dirname, 'fixtures', 'gateway', 'supergraph.graphql'),
        'utf8',
      ),
      onExecutor({ subgraphName }) {
        const subgraphIndex = parseInt(subgraphName.split('SERVICE')[1]);
        const schema = buildSubgraphSchema(services[subgraphIndex]);
        const executor = createDefaultExecutor(schema);
        if (subgraphIndex === 0) {
          return async args => {
            accountsCalled = true;
            return executor(args);
          };
        }
        return executor;
      },
    });
    const query = /* GraphQL */ `
      query {
        topProducts {
          name
          reviews {
            body
            author {
              username
            }
          }
        }
      }
    `;
    await normalizedExecutor({
      schema: supergraphSchema,
      document: parse(query),
    });
    expect(accountsCalled).toBeFalsy();
  });
});
