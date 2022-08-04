import { createTestkit } from '@envelop/testing';
import { useNetworkViewer, UseNetworkViewerOpts } from './index';
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

  describe('default configuration', () => {
    it('logs operationName after operation execution', async () => {
      const config = { logFunction: jest.fn() };
      const testInstance = createTestkit([useNetworkViewer(true, config)], schema);
      await testInstance.execute(`query test { test }`);
      expect(config.logFunction).toBeCalledWith('useNetworkViewer', {
        operationName: 'test',
      });
    });
    it('does not log document after operation execution', async () => {
      const config = { logFunction: jest.fn() };
      const testInstance = createTestkit([useNetworkViewer(true, config)], schema);
      await testInstance.execute(`query test { test }`);
      expect(config.logFunction).toBeCalledWith('useNetworkViewer', {
        operationName: 'test',
        document: undefined,
      });
    });
  });

  describe('config overrides', () => {
    it('logGraphQlDocument:true - logs document after operation execution', async () => {
      const config: UseNetworkViewerOpts = { logFunction: jest.fn(), logGraphQlDocument: true };
      const testInstance = createTestkit([useNetworkViewer(true, config)], schema);
      const result = await testInstance.execute(`query test { test }`);
      expect(config.logFunction).toBeCalledWith('useNetworkViewer', {
        operationName: 'test',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        document: expect.stringMatching('query\\s+test\\s+{\\s+test\\s+}'),
      });
    });
  });
});
