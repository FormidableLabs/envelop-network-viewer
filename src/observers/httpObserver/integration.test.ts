import { createTestkit } from '@envelop/testing';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { Stubby } from 'stubby';
import { useNetworkViewer, UseNetworkViewerOpts } from '../../useNetworkViewer';
import http from 'http';
import 'jest-expect-json';

const request = (url: string) => {
  return new Promise((resolve, reject) => {
    const req = http.request(url, (res) => {
      let body = '';
      res.on('data', (chunk: Buffer) => {
        body += chunk.toString('utf-8');
      });
      res.on('end', () => resolve(body));
    });
    req.on('error', (e) => reject(e));
    req.end();
  });
};

describe('httpObserver', () => {
  const stubby = new Stubby();

  const schema = makeExecutableSchema({
    typeDefs: [
      `type Query { test: String }`,
      `type Query { test2: [String] }`,
      `type Query { test3: [String] }`,
    ],
    resolvers: {
      Query: {
        test: async () => request('http://localhost:8883/'),
        test2: async () => {
          return [
            await request('http://localhost:8883/foo'),
            await request('http://localhost:8883/bar'),
          ];
        },
        test3: async () => {
          return [
            await request('http://localhost:8883/fiz'),
            await request('http://localhost:8883/buz'),
          ];
        },
      },
    },
  });

  beforeAll((done) => {
    stubby.start(
      {
        stubs: 8883,
        tls: 8443,
        data: [
          {
            request: { url: '/$', method: 'GET' },
            response: { body: 'hello world' },
          },
          {
            request: { url: '/([a-zA-Z]+)$', method: 'GET' },
            response: { body: '<% url[0] %>', latency: 10 },
          },
        ],
      },
      (err) => {
        done(err);
      },
    );
  }, 100);
  afterAll((done) => {
    stubby.stop(() => {
      done();
    });
  }, 1000);
  beforeEach(() => jest.resetModules());

  describe('integration', () => {
    it('includes http/https observations in log message', async () => {
      const config: UseNetworkViewerOpts = {
        logFunction: jest.fn(),
        logGraphQlDocument: true,
      };
      const testInstance = createTestkit([useNetworkViewer(true, config)], schema);
      await testInstance.execute(`query test { test }`);
      expect(config.logFunction).toBeCalledWith(
        'useNetworkViewer',
        expect.jsonContaining({
          operationName: 'test',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          document: expect.stringMatching('query\\s+test\\s+{\\s+test\\s+}'),
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          observations: expect.arrayContaining([expect.objectContaining({ label: 'HTTP/HTTPS' })]),
        }),
      );
    });
    it('supports concurrent requests', async () => {
      const config: UseNetworkViewerOpts = {
        logFunction: jest.fn(),
        logGraphQlDocument: true,
        enableConcurrencySupport: true,
      };
      const testInstance = createTestkit([useNetworkViewer(true, config)], schema);
      await Promise.all([
        testInstance.execute(`query test { test2 }`),
        testInstance.execute(`query test2 { test3 }`),
      ]);
      // verify requests for paths foo and bar, and biz and buz are grouped together
      expect(config.logFunction).toBeCalledWith(
        'useNetworkViewer',
        expect.stringMatching('/foo.+/bar'),
      );
      expect(config.logFunction).toBeCalledWith(
        'useNetworkViewer',
        expect.stringMatching('/fiz.+/buz'),
      );
      // make sure we don't see unexpected paths grouped together
      expect(config.logFunction).toBeCalledWith(
        'useNetworkViewer',
        expect.not.stringMatching('/fiz.+/bar'),
      );
      expect(config.logFunction).toBeCalledWith(
        'useNetworkViewer',
        expect.not.stringMatching('/bar.+/fiz'),
      );
      expect(config.logFunction).toBeCalledWith(
        'useNetworkViewer',
        expect.not.stringMatching('/fiz.+/foo'),
      );
      expect(config.logFunction).toBeCalledWith(
        'useNetworkViewer',
        expect.not.stringMatching('/foo.+/fiz'),
      );
      expect(config.logFunction).toBeCalledWith(
        'useNetworkViewer',
        expect.not.stringMatching('/buz.+/foo'),
      );
      expect(config.logFunction).toBeCalledWith(
        'useNetworkViewer',
        expect.not.stringMatching('/foo.+/buz'),
      );
    });
  });
});
