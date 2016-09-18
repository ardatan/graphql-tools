import { expect } from 'chai';
import { graphql } from 'graphql';
import { PubSub } from 'graphql-subscriptions';
import { makeExecutableSchema } from '../schemaGenerator';
import { autopublishMutationResults } from '../autopublish';
import 'mocha';

const speciesMap = {
  'Tiger': { id: 0, name: 'Tiger' },
  'Cat': { id: 1, name: 'Cat' },
  'Dog': { id: 2, name: 'Dog' },
};

const speciesIndex: [string] = [
  'Tiger',
  'Cat',
  'Dog',
];

const typeDefs = `
  type Species {
    id: Int!
    name: String!
  }

  type Query {
    # either name or id required!
    species(name: String, id: Int): Species
  }
  type Mutation {
    createSpecies(name: String!): Species!
    updateSpecies(id: Int!, newName: String!): Species
    deleteSpecies(id: Int!): Species
  }
`;
const resolvers = {
  Query: {
    species: (root: any, { id, name }: { id: number, name: string }) => {
      if (id !== undefined && name !== undefined) {
        throw new Error('Must provide either name or id argument, not both');
      }
      if (id !== undefined) {
        return speciesMap[speciesIndex[id]];
      }
      if (name !== undefined) {
        return speciesMap[name];
      }
      throw new Error('Must provide either id or name argument');
    },
  },
  Mutation: {
    createSpecies: (root: any, { name }: { name: string }) => {
      speciesMap[name] = { id: speciesIndex.length, name };
      speciesIndex.push(name);
      return speciesMap[name];
    },
    updateSpecies: (root: any, { id, newName }: { id: number, newName: string }) => {
      const species = speciesMap[speciesIndex[id]];
      delete speciesMap[speciesIndex[id]];
      species['name'] = newName;
      speciesMap[newName] = species;
      speciesIndex[species.id] = newName;
      return species;
    },
    deleteSpecies: (root: any, { id }: { id: number }) => {
      const species = speciesMap[speciesIndex[id]];
      delete speciesMap[speciesIndex[id]];
      speciesIndex[species.id] = null;
      return species;
    },
  },
};

const schema = makeExecutableSchema({ typeDefs, resolvers });

const pubsub = new PubSub();

describe('self-test', () => {
  it('query works', () => {
    const query = `
      {
        species(name: "Tiger"){
          id
        }
      }
    `;
    return graphql(schema, query).then( res => {
      return expect(res.data['species']['id']).to.equals(0);
    });
  });

  it('create mutation works', () => {
    const mutation = `
      mutation {
        createSpecies(name: "Eagle"){
          id
        }
      }
    `;
    const query = `
      {
        species(name: "Eagle"){
          id
          name
        }
      }
    `;
    const expected = { id: 3, name: 'Eagle' };
    return graphql(schema, mutation).then( data => {
      return graphql(schema, query).then( res => {
        return expect(res.data['species']).to.deep.equal(expected);
      });
    });
  });

  it('update mutation works', () => {
    const mutation = `
      mutation {
        updateSpecies(id: 1, newName: "Meow"){
          id
          name
        }
      }
    `;
    const query = `
      {
        species(id: 1){
          id
          name
        }
      }
    `;
    const expected = { id: 1, name: 'Meow' };
    return graphql(schema, mutation).then( data => {
      return graphql(schema, query).then( res => {
        return expect(res.data['species']).to.deep.equal(expected);
      });
    });
  });

  it('delete mutation works', () => {
    const mutation = `
      mutation {
        deleteSpecies(id: 3){
          id
          name
        }
      }
    `;
    const query = `
      {
        species(id: 3){
          id
          name
        }
      }
    `;
    const expected: any = null;
    return graphql(schema, mutation).then( data => {
      return graphql(schema, query).then( res => {
        return expect(res.data['species']).to.deep.equal(expected);
      });
    });
  });
});

describe('Autopublish', () => {
  it('publishes payloads to the channel on mutations', () => {
    const added: any[] = [];
    const p1 = new Promise((resolve, reject) => {
        pubsub.subscribe('createSpecies', (data: any) => {
            added.push(data);
            resolve(undefined);
        });
    });
    const updated: any[] = [];
    const p2 = new Promise((resolve, reject) => {
    pubsub.subscribe('updateSpecies', (data: any) => {
            updated.push(data);
            resolve(undefined);
        });
    });
    const deleted: any[] = [];
    const p3 = new Promise((resolve, reject) => {
    pubsub.subscribe('deleteSpecies', (data: any) => {
            deleted.push(data);
            resolve(undefined);
        });
    });
    const ready = Promise.all([p1, p2, p3]);

    // autopublish
    autopublishMutationResults(schema, pubsub);

    // run one mutation of each, then check to make sure you got em all!
    const mutation = `
      mutation {
        createSpecies(name: "Rhino"){
          name
        }
        updateSpecies(id: 0, newName: "Penguin"){
          name
        }
        deleteSpecies(id: 2){
          name
        }
      }
    `;
    const expected = {
      'added': { name: 'Rhino' },
      'updated': { name: 'Penguin' },
      'deleted': { name: 'Dog' },
    };
    return graphql(schema, mutation).then( data => {
        return ready.then(() => {
            expect(added[0]['name']).to.deep.equal(expected['added']['name']);
            expect(updated[0]['name']).to.deep.equal(expected['updated']['name']);
            expect(deleted[0]['name']).to.deep.equal(expected['deleted']['name']);
        });
    });

    // if you got them all, yay!
  });
});
