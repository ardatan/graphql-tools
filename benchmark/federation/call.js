const { fetch } = require('@whatwg-node/fetch');

fetch('http://localhost:3000/stitching', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
  },
  body: JSON.stringify({
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
  }),
})
  .then(res => res.json())
  .then(data => console.log(JSON.stringify(data, null, 2)));
