import http from 'k6/http';

const params = {
  headers: {
    'Content-Type': 'application/json',
  },
};

export function checkNoErrors(resp) {
  return !('errors' in resp.json());
}

export function graphql({ query, operationName, variables, endpoint }) {
  return http.post(
    endpoint,
    JSON.stringify({
      query,
      operationName,
      variables,
    }),
    params
  );
}
