const fields = ['id', 'name', 'username'];
const id = '1';

module.exports = /* GraphQL */`
  query getUser {
    user(id: ${id}) {
      ${fields.join('\n')}
    }
  }
`;
