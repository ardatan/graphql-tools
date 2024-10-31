import axios from 'axios';
import { gql } from 'graphql-tag';
import { TestEnvironment } from './TestEnvironment';

describe('Yoga gateway tests', () => {
  let ctx: TestEnvironment;

  beforeAll(async () => {
    ctx = new TestEnvironment();
    await ctx.start();
  });

  afterAll(async () => {
    await ctx.stop();
  });

  it('should return valid mock - proof that the test gateway works correctly with a simple query', async () => {
    const query = gql`
      query {
        testNestedField {
          subgraph1 {
            id
            email
            sub1
          }
        }
      }
    `.loc?.source.body;

    const expectedResult = {
      data: {
        testNestedField: {
          subgraph1: {
            id: 'user1',
            email: 'user1@example.com',
            sub1: true,
          },
        },
      },
    };

    const res = await axios.post(`http://localhost:${ctx.getTestPort()}/graphql`, { query });

    expect(res.status).toBe(200);
    expect(res.data.errors).toBeUndefined();
    expect(res.data).toMatchObject(expectedResult);
  });

  it('failing test before my fix - should return valid mock of testNestedField.subgraph1 and testNestedField.subgraph2 branch', async () => {
    const query = gql`
      query {
        testNestedField {
          subgraph2 {
            id
            email
            sub2
          }
          subgraph1 {
            id
            email
            sub1
          }
        }
      }
    `.loc?.source.body;

    const expectedResult = {
      data: {
        testNestedField: {
          subgraph1: {
            id: 'user1',
            email: 'user1@example.com',
            sub1: true,
          },
          subgraph2: {
            id: 'user2',
            email: 'user2@example.com',
            sub2: true,
          },
        },
      },
    };

    const res = await axios.post(`http://localhost:${ctx.getTestPort()}/graphql`, { query });

    expect(res.status).toBe(200);
    // this error came before my fix
    // expect(res.data.errors).toMatchObject([
    //   {
    //     message: 'Cannot return null for non-nullable field TestUser2.id.',
    //     path: ['testNestedField', 'subgraph2', 'id'],
    //   },
    // ]);
    // expect(res.data.data).toMatchObject({ testNestedField: null });
    expect(res.data.errors).toBeUndefined();
    expect(res.data).toMatchObject(expectedResult);
  });
});
