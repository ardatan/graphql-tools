/**
 * Jest setupFiles entry for classic-mode dual runs of the executor suite.
 * Must run before tests import `@graphql-tools/executor` / plan modules.
 *
 * Usage:
 *   npx jest --setupFiles ./scripts/executor-classic-planning-setup.cjs \
 *     packages/executor/src/execution/__tests__/core
 */
process.env.GRAPHQL_TOOLS_EXECUTOR_PLANNING = '0';
