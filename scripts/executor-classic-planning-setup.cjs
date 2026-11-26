/**
 * Jest setupFiles entry for classic-mode dual runs of the executor suite.
 * Must run before tests import `@graphql-tools/executor` / plan modules.
 *
 * Usage (test path before --setupFiles — Jest treats setupFiles as an array option):
 *   npx jest packages/executor/src/execution/__tests__/core \
 *     --setupFiles ./scripts/executor-classic-planning-setup.cjs
 */
process.env.GRAPHQL_TOOLS_EXECUTOR_PLANNING = '0';
