import { createTestkit } from '@envelop/testing';
import { useNetworkViewer, UseNetworkViewerOpts } from './index';
import { makeExecutableSchema } from '@graphql-tools/schema';
import 'jest-expect-json';

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
  beforeEach(() => jest.resetModules());

  describe('default configuration', () => {
    it('logs operationName after operation execution', async () => {
      const config = { logFunction: jest.fn() };
      const testInstance = createTestkit([useNetworkViewer(true, config)], schema);
      await testInstance.execute(`query test { test }`);
      expect(config.logFunction).toBeCalledWith(
        'useNetworkViewer',
        expect.jsonContaining({
          operationName: 'test',
        }),
      );
    });
    it('does not log document after operation execution', async () => {
      const config = { logFunction: jest.fn() };
      const testInstance = createTestkit([useNetworkViewer(true, config)], schema);
      await testInstance.execute(`query test { test }`);
      expect(config.logFunction).toBeCalledWith(
        'useNetworkViewer',
        expect.not.stringMatching('query\\s+test\\s+{\\s+test\\s+}'),
      );
    });
  });

  describe('config overrides', () => {
    it('logGraphQlDocument:true - logs document after operation execution', async () => {
      const config: UseNetworkViewerOpts = { logFunction: jest.fn(), logGraphQlDocument: true };
      const testInstance = createTestkit([useNetworkViewer(true, config)], schema);
      const result = await testInstance.execute(`query test { test }`);
      expect(config.logFunction).toBeCalledWith(
        'useNetworkViewer',
        expect.jsonContaining({
          operationName: 'test',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          document: expect.stringMatching('query\\s+test\\s+{\\s+test\\s+}'),
        }),
      );
    });
  });
});
