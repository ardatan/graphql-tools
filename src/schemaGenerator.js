// Generates a schema for graphql-js given a shorthand schema

import { parse } from 'graphql/language';
import { buildASTSchema } from 'graphql/utilities';
import {
  GraphQLScalarType,
  getNamedType,
  GraphQLObjectType,
  GraphQLList,
  getNullableType,
} from 'graphql/type';
import { decorateWithTracer } from './tracing';

// @schemaDefinition: A GraphQL type schema in shorthand
// @resolvers: Definitions for resolvers to be merged with schema
function SchemaError(message) {
  Error.captureStackTrace(this, this.constructor);
  this.message = message;
}
SchemaError.prototype = new Error;


const generateSchema = (
  typeDefinitions,
  resolveFunctions,
  logger = null,
  forbidUndefinedInResolve = false,
) => {
  if (!typeDefinitions) {
    throw new SchemaError('Must provide typeDefinitions');
  }
  if (!resolveFunctions) {
    throw new SchemaError('Must provide resolveFunctions');
  }

  const schema = buildSchemaFromTypeDefinitions(typeDefinitions);

  addResolveFunctionsToSchema(schema, resolveFunctions);

  assertResolveFunctionsPresent(schema);

  if (forbidUndefinedInResolve) {
    addCatchUndefinedToSchema(schema);
  }

  if (logger) {
    addErrorLoggingToSchema(schema, logger);
  }

  return schema;
};

function buildSchemaFromTypeDefinitions(typeDefinitions) {
  return buildASTSchema(parse(typeDefinitions));
}

function forEachField(schema, fn) {
  const typeMap = schema.getTypeMap();
  Object.keys(typeMap).forEach((typeName) => {
    const type = typeMap[typeName];

    if (!getNamedType(type).name.startsWith('__') && type instanceof GraphQLObjectType) {
      const fields = type.getFields();
      Object.keys(fields).forEach((fieldName) => {
        const field = fields[fieldName];
        fn(field, typeName, fieldName);
      });
    }
  });
}

function addResolveFunctionsToSchema(schema, resolveFunctions) {
  Object.keys(resolveFunctions).forEach((typeName) => {
    const type = schema.getType(typeName);
    if (!type) {
      throw new SchemaError(
        `"${typeName}" defined in resolvers, but not in schema`
      );
    }

    Object.keys(resolveFunctions[typeName]).forEach((fieldName) => {
      if (!type.getFields()[fieldName]) {
        throw new SchemaError(
          `${typeName}.${fieldName} defined in resolvers, but not in schema`
        );
      }
      const field = type.getFields()[fieldName];
      field.resolve = resolveFunctions[typeName][fieldName];
    });
  });
}

class MockList {
  // wrappedFunction can return another MockList or a value
  constructor(len, wrappedFunction) {
    this.len = len;
    if (typeof wrappedFunction !== 'undefined') {
      if (typeof wrappedFunction !== 'function') {
        throw new Error('Second argument to MockList must be a function or undefined');
      }
      this.wrappedFunction = wrappedFunction;
    }
  }

  mock(o, a, c, r, fieldType, mockTypeFunc) {
    function randint(low, high) {
      return Math.floor(Math.random() * (high - low + 1) + low);
    }
    let arr;
    if (Array.isArray(this.len)) {
      arr = new Array(randint(this.len[0], this.len[1]));
    } else {
      arr = new Array(this.len);
    }
    for (let i = 0; i < arr.length; i++) {
      if (typeof this.wrappedFunction === 'function') {
        const res = this.wrappedFunction(o, a, c, r);
        if (res instanceof MockList) {
          arr[i] = res.mock(o, a, c, r, getNullableType(fieldType.ofType), mockTypeFunc);
        } else {
          arr[i] = res;
        }
      } else {
        arr[i] = mockTypeFunc(fieldType.ofType)(o, a, c, r);
      }
    }
    return arr;
  }
}

function addMockFunctionsToSchema({ schema, mocks, preserveResolvers = false } = {}) {
  function isObject(thing) {
    return thing === Object(thing) && !Array.isArray(thing);
  }
  // TODO: rewrite from using Map of mock function to using an object?
  if (!schema) {
    // XXX should we check that schema is an instance of GraphQLSchema?
    throw new Error('Must provide schema to mock');
  }
  if (!isObject(mocks)) {
    throw new Error('mocks must be of type Object');
  }

  // use Map internally, because that API is nicer.
  const mockFunctionMap = new Map();
  Object.keys(mocks).forEach((typeName) => {
    mockFunctionMap.set(typeName, mocks[typeName]);
  });

  mockFunctionMap.forEach((mockFunction, mockTypeName) => {
    if (typeof mockFunction !== 'function') {
      throw new Error(`mockFunctionMap[${mockTypeName}] must be a function`);
    }
  });

  const defaultMockMap = new Map();
  defaultMockMap.set('Int', () => 58);
  defaultMockMap.set('Float', () => 12.3);
  defaultMockMap.set('String', () => 'Lorem Ipsum');
  defaultMockMap.set('Boolean', () => false);
  defaultMockMap.set('ID', () => '41ae7bd');

  const mockType = function mockType(type, typeName, fieldName) {
    // order of precendence for mocking:
    // 1. if the object passed in already has fieldName, just use that
    // --> if it's a function, that becomes your resolver
    // --> if it's a value, the mock resolver will return that
    // 2. if the nullableType is a list, recurse
    // 2. if there's a mock defined for this typeName, that will be used
    // 3. if there's no mock defined, use the default mocks for this type
    return (o, a, c, r) => {
      // nullability doesn't matter for the purpose of mocking.
      const fieldType = getNullableType(type);

      if (o && typeof o[fieldName] !== 'undefined') {
        let result;
        // if we're here, the field is already defined
        if (typeof o[fieldName] === 'function') {
          result = o[fieldName](o, a, c, r);
          if (result instanceof MockList) {
            result = result.mock(o, a, c, r, fieldType, mockType);
          }
        } else {
          result = o[fieldName];
        }

        // Now we merge the result with the default mock for this type.
        // This allows overriding defaults while writing very little code.
        // We only do merging for objects, of course
        if (isObject(result) && mockFunctionMap.has(fieldType.name)) {
          result = Object.assign(mockFunctionMap.get(fieldType.name)(o, a, c, r), result);
        }
        return result;
      }

      if (fieldType instanceof GraphQLList) {
        return [mockType(type.ofType)(o, a, c, r), mockType(type.ofType)(o, a, c, r)];
      }
      if (mockFunctionMap.has(fieldType.name)) {
        // the object passed doesn't have this field, so we apply the default mock
        return mockFunctionMap.get(fieldType.name)(o, a, c, r);
      }
      if (fieldType instanceof GraphQLObjectType) {
        return {};
      }
      if (defaultMockMap.has(fieldType.name)) {
        return defaultMockMap.get(fieldType.name)(o, a, c, r);
      }
      // if we get to here, we don't have a value, and we don't have a mock for this type,
      // we could return undefined, but that would be hard to debug, so we throw instead.
      throw new Error(`No mock defined for type "${fieldType.name}"`);
    };
  };

  // TODO: allow mocking of RootQuery and RootMutation

  forEachField(schema, (field, typeName, fieldName) => {
    if (preserveResolvers && field.resolve) {
      return;
    }

    // we have to handle the root mutation and root query types differently,
    // because no resolver is called at the root.
    const isOnQueryType = typeName === (schema.getQueryType() || {}).name;
    const isOnMutationType = typeName === (schema.getMutationType() || {}).name;
    if (isOnQueryType || isOnMutationType) {
      if (mockFunctionMap.has(typeName)) {
        const rootMock = mockFunctionMap.get(typeName);
        if (rootMock()[fieldName]) {
          // TODO: assert that it's a function
          // eslint-disable-next-line no-param-reassign
          field.resolve = (o, a, c, r) => {
            const u = o || {}; // TODO: should we clone instead?
            u[fieldName] = rootMock()[fieldName];
            // XXX this is a bit of a hack to still use mockType, which
            // lets you mock lists etc. as well
            // otherwise we could just set field.resolve to rootMock()[fieldName]
            // it's like pretending there was a resolve function that ran before
            // the root resolve function.
            return mockType(field.type, typeName, fieldName)(u, a, c, r);
          };
          return;
        }
      }
    }
    // eslint-disable-next-line no-param-reassign
    field.resolve = mockType(field.type, typeName, fieldName);
  });
}

function assertResolveFunctionsPresent(schema) {
  forEachField(schema, (field, typeName, fieldName) => {
    // requires a resolve function on every field that has arguments
    if (field.args.length > 0) {
      expectResolveFunction(field, typeName, fieldName);
    }

    // requires a resolve function on every field that returns a non-scalar type
    if (!(getNamedType(field.type) instanceof GraphQLScalarType)) {
      expectResolveFunction(field, typeName, fieldName);
    }
  });
}

function expectResolveFunction(field, typeName, fieldName) {
  if (!field.resolve) {
    throw new SchemaError(`Resolve function missing for "${typeName}.${fieldName}"`);
  }
  if (typeof field.resolve !== 'function') {
    throw new SchemaError(`Resolver "${typeName}.${fieldName}" must be a function`);
  }
}

function addErrorLoggingToSchema(schema, logger) {
  if (!logger) {
    throw new Error('Must provide a logger');
  }
  if (typeof logger.log !== 'function') {
    throw new Error('Logger.log must be a function');
  }
  forEachField(schema, (field, typeName, fieldName) => {
    const errorHint = `${typeName}.${fieldName}`;
    // eslint-disable-next-line no-param-reassign
    field.resolve = decorateWithLogger(field.resolve, logger, errorHint);
  });
}

/*
 * fn: The function to decorate with the logger
 * logger: an object instance of type Logger
 * hint: an optional hint to add to the error's message
 */
function decorateWithLogger(fn, logger, hint = '') {
  return (...args) => {
    try {
      return fn(...args);
    } catch (e) {
      if (hint) {
        e.message = `Error in resolver ${hint}\n${e.message}`;
      }
      logger.log(e);
      // we want to pass on the error, just in case.
      throw e;
    }
  };
}

function addCatchUndefinedToSchema(schema) {
  forEachField(schema, (field, typeName, fieldName) => {
    const errorHint = `${typeName}.${fieldName}`;
    // eslint-disable-next-line no-param-reassign
    field.resolve = decorateToCatchUndefined(field.resolve, errorHint);
  });
}

function addTracingToResolvers(schema, tracer) {
  forEachField(schema, (field, typeName, fieldName) => {
    const functionName = `${typeName}.${fieldName}`;
    // eslint-disable-next-line no-param-reassign
    field.resolve = decorateWithTracer(
      field.resolve,
      tracer,
      { functionType: 'resolve', functionName },
    );
  });
}

function decorateToCatchUndefined(fn, hint) {
  return (...args) => {
    const result = fn(...args);
    if (typeof result === 'undefined') {
      throw new Error(`Resolve function for "${hint}" returned undefined`);
    }
    return result;
  };
}

export {
  generateSchema,
  SchemaError,
  addErrorLoggingToSchema,
  addResolveFunctionsToSchema,
  addCatchUndefinedToSchema,
  assertResolveFunctionsPresent,
  addTracingToResolvers,
  addMockFunctionsToSchema,
  buildSchemaFromTypeDefinitions,
  MockList,
};
