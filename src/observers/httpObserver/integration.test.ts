import { createTestkit } from '@envelop/testing';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { Stubby } from 'stubby';
import { useNetworkViewer, UseNetworkViewerOpts } from '../../index';
import http from 'http';
import 'jest-expect-json';

describe('httpObserver', () => {
  const stubby = new Stubby();

  const schema = makeExecutableSchema({
    typeDefs: `type Query { test: String }`,
    resolvers: {
      Query: {
        test: async () => {
          return new Promise((resolve, reject) => {
            const req = http.request('http://localhost:8883/', (res) => {
              let body = '';
              res.on('data', (chunk: Buffer) => {
                body += chunk.toString('utf-8');
              });
              res.on('end', () => resolve(body));
            });
            req.on('error', (e) => reject(e));
            req.end();
          });
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
        ],
      },
      (err) => {
        done();
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
        logFunction: jest.fn((...args) => console.log(...args)),
        logGraphQlDocument: true,
      };
      const testInstance = createTestkit([useNetworkViewer(true, config)], schema);
      const result = await testInstance.execute(`query test { test }`);
      expect(config.logFunction).toBeCalledWith(
        'useNetworkViewer',
        expect.jsonContaining({
          operationName: 'test',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          document: expect.stringMatching('query\\s+test\\s+{\\s+test\\s+}'),
          observations: expect.arrayContaining([expect.objectContaining({ label: 'HTTP/HTTPS' })]),
        }),
      );
    });
  });
});
