import { makeExecutableSchema } from '@graphql-tools/schema';
import { useNetworkViewer, UseNetworkViewerOpts } from '../../index';
import { PrismaObserver } from './index';
import { PrismaClient } from '@prisma/client';
import { createTestkit } from '@envelop/testing';
import 'jest-expect-json';

describe('prismaObserver/integration', () => {
  const prisma = new PrismaClient();
  const schema = makeExecutableSchema({
    typeDefs: [
      `type Author { firstName: String! lastName: String! }`,
      `type Query { authors: [Author] }`,
      `type Query { author(id: ID!): Author }`,
    ],
    resolvers: {
      Query: {
        authors: async () => {
          return new Promise((resolve) => {
            setTimeout(() => resolve(prisma.author.findMany()), 5);
          });
        },
        author: async (_parent, args: { id: number }) => {
          return new Promise((resolve) => {
            setTimeout(
              () =>
                resolve(
                  prisma.author.findUnique({
                    where: {
                      id: args.id,
                    },
                  }),
                ),
              5,
            );
          });
        },
      },
    },
  });

  beforeEach(() => jest.resetModules());
  afterEach(async () => {
    return prisma.$disconnect();
  });

  it('includes prisma observations in log message', async () => {
    const config: UseNetworkViewerOpts = {
      logFunction: jest.fn(),
      logGraphQlDocument: true,
      additionalObservers: [new PrismaObserver(prisma)],
    };
    const testInstance = createTestkit([useNetworkViewer(true, config)], schema);
    await testInstance.execute(`query authors { authors { firstName lastName } }`);
    expect(config.logFunction).toBeCalledWith(
      'useNetworkViewer',
      expect.jsonContaining({
        operationName: 'authors',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        document: expect.stringMatching(
          'query\\s+authors\\s+{\\s+authors\\s+{\\s+firstName\\s+lastName\\s+}\\s+}',
        ),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        observations: expect.arrayContaining([expect.objectContaining({ label: 'PRISMA' })]),
      }),
    );
  });
  it('supports concurrent requests', async () => {
    const config: UseNetworkViewerOpts = {
      logFunction: jest.fn(),
      logGraphQlDocument: true,
      additionalObservers: [new PrismaObserver(prisma)],
    };
    const testInstance = createTestkit([useNetworkViewer(true, config)], schema);
    await testInstance.execute(`query author { author(id: 1) { firstName lastName } }`);
    await testInstance.execute(`query authors { authors { firstName lastName } }`);
    expect(config.logFunction).toHaveBeenCalledTimes(2);
    expect(config.logFunction).toBeCalledWith(
      'useNetworkViewer',
      expect.stringMatching(`"args":{"where":{"id":"1"}}.*"action":"findUnique","model":"Author"`),
    );
    expect(config.logFunction).toBeCalledWith(
      'useNetworkViewer',
      expect.stringMatching(`"action":"findMany","model":"Author"`),
    );
    // make sure these do not occur together
    expect(config.logFunction).toBeCalledWith(
      'useNetworkViewer',
      expect.not.stringMatching(
        `"action":"findUnique","model":"Author".*"action":"findMany","model":"Author"`,
      ),
    );
    expect(config.logFunction).toBeCalledWith(
      'useNetworkViewer',
      expect.not.stringMatching(
        `"action":"findMany","model":"Author".*"action":"findUnique","model":"Author"`,
      ),
    );
  });
});
