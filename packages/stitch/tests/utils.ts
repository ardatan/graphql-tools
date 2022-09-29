import ExtendableError from 'es6-error'
import { IExecutableSchemaDefinition } from '@graphql-tools/schema'
import { ApolloServer } from 'apollo-server-express'
import fetch from 'cross-fetch'
import express from 'express'
import { GraphQLSchema } from 'graphql'
import http from 'http'


export const SERVER_PORT = 2000

export const startTestServer = async (typeDefs: IExecutableSchemaDefinition['typeDefs'], resolvers: IExecutableSchemaDefinition['resolvers'], schema: GraphQLSchema) => {
  const app = express()
  const httpServer = http.createServer(app)

  const testServer = new ApolloServer({
    resolvers,
    formatError: (error: any) => {
      const actualError = error.originalError || error

      return {
        message: actualError.message,
        errorCode: actualError.errorCode,
      }
    },
    schema,
    typeDefs,
  })

  await testServer.start()
  await httpServer.listen({ port: SERVER_PORT })

  testServer.applyMiddleware({
    app,
    path: '/',
  })

  return {
    stop: async () => {
      await testServer.stop()
      httpServer.close()
    },
  }
}

export const makeRequest = async (query: string, variables: Record<string, unknown>) => {
  const response = await fetch(`http://localhost:${SERVER_PORT}/`, {
    body: JSON.stringify({
      operationName: null,
      variables,
      query,
    }),
    method: 'POST',
    headers: {
      accept: '*/*',
      'content-type': 'application/json',
    },
  })

  return response.json()
}

export class ControlledError extends ExtendableError {
  errorCode?: string | null

  constructor(
    message: string,
    errorCode?: string | null,
  ) {
    super(message)
    this.errorCode = errorCode
  }
}
