export interface PrismaDefinition {
  datamodel?: string | string[];
  subscriptions?: SubscriptionMap;
  custom?: any;
  secret?: string;
  disableAuth?: boolean;
  seed?: Seed;
  endpoint?: string;
  hooks?: any;
  generate?: Generate[];
  databaseType?: DatabaseType;
}

export type DatabaseType = 'relational' | 'document';

export interface Generate {
  generator: string;
  output: string;
}

export interface Seed {
  import?: string;
  run?: string;
}

export interface SubscriptionMap {
  [subscriptionName: string]: SubscriptionDefinition;
}

export interface SubscriptionDefinition {
  query: string;
  webhook: FunctionHandlerWebhookSource;
}

export type FunctionHandlerWebhookSource = string | FunctionHandlerWebhookWithHeaders;

export interface FunctionHandlerWebhookWithHeaders {
  url: string;
  headers?: Headers;
}

export interface Headers {
  [key: string]: string;
}

const schema = JSON.parse(`{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "JSON schema for Prisma prisma.yml files",
  "definitions": {
    "subscription": {
      "description": "A piece of code that you should run.",
      "type": "object",
      "properties": {
        "query": {
          "type": "string"
        },
        "webhook": {
          "oneOf": [
            {
              "type": "string"
            },
            {
              "type": "object",
              "properties": {
                "url": {
                  "type": "string"
                },
                "headers": {
                  "type": "object"
                }
              },
              "required": ["url"]
            }
          ]
        }
      },
      "required": ["query", "webhook"]
    }
  },
  "properties": {
    "datamodel": {
      "description": "Type definitions for database models, relations, enums and other types",
      "type": ["string", "array"],
      "items": {
        "type": ["string", "array"]
      }
    },
    "secret": {
      "description": "Secret for securing the API Endpoint",
      "type": "string",
      "items": {
        "type": "string"
      }
    },
    "disableAuth": {
      "description": "Disable authentication for the endpoint",
      "type": "boolean",
      "items": {
        "type": "boolean"
      }
    },
    "generate": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "generator": {
            "type": "string"
          },
          "output": {
            "type": "string"
          }
        }
      }
    },
    "seed": {
      "description": "Database seed",
      "type": "object",
      "properties": {
        "import": {
          "type": "string"
        },
        "run": {
          "type": "string"
        }
      }
    },
    "subscriptions": {
      "description": "All server-side subscriptions",
      "type": "object",
      "additionalProperties": {
        "$ref": "#/definitions/subscription"
      }
    },
    "custom": {
      "description": "Custom field to use in variable interpolations with \${self:custom.field}",
      "type": "object"
    },
    "hooks": {
      "description": "Command hooks. Current available hooks are: post-deploy.",
      "type": "object"
    },
    "endpoint": {
      "description": "Endpoint the service will be reachable at. This also determines the cluster the service will deployed to.",
      "type": "string",
      "items": {
        "type": "string"
      }
    },
    "databaseType": {
      "type": "string",
      "oneOf": [{ "enum": ["relational", "document"] }]
    }
  },
  "additionalProperties": false
}`);

export default schema;
