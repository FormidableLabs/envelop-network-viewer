import { createTestkit, assertSingleExecutionValue } from '@envelop/testing';
import { useNetworkViewer } from './index';
import { makeExecutableSchema } from '@graphql-tools/schema';

describe('useNetworkViewer', () => {
  const schema = makeExecutableSchema({
    typeDefs: `type Query { test: String }`,
    resolvers: {
      Query: {
        test: () => {
          return 'foo';
        },
      },
    },
  });

  it('stub', async () => {
    const testInstance = createTestkit([useNetworkViewer()], schema);
    const result = await testInstance.execute(`query { test }`);
    expect(result).toEqual({ data: { test: 'foo' } });
  });
});
