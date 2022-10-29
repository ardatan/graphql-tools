import { check } from 'k6';
import { graphql, checkNoErrors } from '../utils.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import { githubComment } from 'https://raw.githubusercontent.com/dotansimha/k6-github-pr-comment/master/lib.js';

const isPrinted = __ENV.GITHUB_TOKEN && __ENV.PRODUCTS_SIZE == 1000;

export const options = {
  vus: 1,
  duration: '10s',
  thresholds: {
    no_errors: ['rate>0.98'],
    expected_result: ['rate>0.98'],
  },
};

export function handleSummary(data) {
  if (isPrinted) {
    githubComment(data, {
      token: __ENV.GITHUB_TOKEN,
      commit: __ENV.GITHUB_SHA,
      pr: __ENV.GITHUB_PR,
      org: 'ardatan',
      repo: 'graphql-tools',
      renderTitle({ passes }) {
        return passes ? '✅ Benchmark Results' : '❌ Benchmark Failed';
      },
      renderMessage({ passes, checks, thresholds }) {
        const result = [];

        if (thresholds.failures) {
          result.push(
            `**Performance regression detected**: it seems like your Pull Request adds some extra latency to Schema Stitching`
          );
        }

        if (checks.failures) {
          result.push('**Failed assertions detected**');
        }

        if (!passes) {
          result.push(`> If the performance regression is expected, please increase the failing threshold.`);
        }

        return result.join('\n');
      },
    });
  }
  return {
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

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
