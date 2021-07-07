import { check } from 'k6';
import { graphql, checkNoErrors } from '../utils.js';

export const options = {
  vus: 1,
  duration: '10s',
  thresholds: {
    no_errors: ['rate=1.0'],
    expected_result: ['rate=1.0'],
  },
};

export default function () {
  const res = graphql({
    endpoint: `http://0.0.0.0:3000/${__ENV.ENDPOINT}`,
    query: /* GraphQL */ `
      fragment User on User {
        id
        username
        name
      }

      fragment Review on Review {
        id
        body
      }

      fragment Product on Product {
        inStock
        name
        price
        shippingEstimate
        upc
        weight
      }

      query TestQuery {
        users {
          ...User
          reviews {
            ...Review
            product {
              ...Product
            }
          }
        }
        topProducts {
          ...Product
          reviews {
            ...Review
            author {
              ...User
            }
          }
        }
      }
    `,
    variables: {},
  });

  check(res, {
    no_errors: checkNoErrors,
    expected_result: resp => 'reviews' in resp.json().data.users[0] && 'reviews' in resp.json().data.topProducts[0],
  });
}
