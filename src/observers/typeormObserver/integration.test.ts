import { makeDatasource } from '../../../typeorm';
import { TypeORMObserverLogger } from './logger';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { Author } from '../../../typeorm/Author';
import { useNetworkViewer, UseNetworkViewerOpts } from '../../useNetworkViewer';
import { TypeORMObserver } from './index';
import { createTestkit } from '@envelop/testing';
import 'jest-expect-json';

function escapeRegex(string: string) {
  return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

describe('typeormObserver/integration', () => {
  const logger = new TypeORMObserverLogger();
  const datasource = makeDatasource({
    logger,
  });
  const schema = makeExecutableSchema({
    typeDefs: [
      `type Author { firstName: String! lastName: String! birthday: String! }`,
      `type Query { authors: [Author] }`,
      `type Query { author(id: ID!): Author }`,
    ],
    resolvers: {
      Query: {
        authors: async () => {
          return new Promise((resolve) => {
            setTimeout(() => resolve(datasource.manager.find(Author)), 5);
          });
        },
        author: async (_parent, args: { id: number }) => {
          return new Promise((resolve) => {
            setTimeout(() => resolve(datasource.manager.findBy(Author, { id: args.id })), 5);
          });
        },
      },
    },
  });

  beforeAll(async () => {
    await datasource.initialize();
    const author = new Author();
    author.first_name = 'Terry';
    author.last_name = 'Mancour';
    await datasource.manager.save(author);
  });
  afterAll(async () => {
    await datasource.destroy();
  });

  it('includes typeorm observations in log message', async () => {
    const config: UseNetworkViewerOpts = {
      logFunction: jest.fn(),
      logGraphQlDocument: true,
      additionalObservers: [new TypeORMObserver(logger)],
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
        observations: expect.arrayContaining([expect.objectContaining({ label: 'TYPEORM' })]),
      }),
    );
  });

  it('supports concurrent requests', async () => {
    const config: UseNetworkViewerOpts = {
      logFunction: jest.fn(),
      logGraphQlDocument: true,
      additionalObservers: [new TypeORMObserver(logger)],
    };
    const testInstance = createTestkit([useNetworkViewer(true, config)], schema);
    await testInstance.execute(`query author { author(id: 1) { firstName lastName } }`);
    await testInstance.execute(`query authors { authors { firstName lastName } }`);
    expect(config.logFunction).toHaveBeenCalledTimes(2);

    const queryA = JSON.stringify(
      `SELECT "Author"."id" AS "Author_id", "Author"."first_name" AS "Author_first_name", "Author"."last_name" AS "Author_last_name" FROM "author" "Author"`,
    );
    const queryB = JSON.stringify(
      `SELECT "Author"."id" AS "Author_id", "Author"."first_name" AS "Author_first_name", "Author"."last_name" AS "Author_last_name" FROM "author" "Author" WHERE ("Author"."id" = ?)`,
    );

    expect(config.logFunction).toBeCalledWith('useNetworkViewer', expect.stringContaining(queryA));
    expect(config.logFunction).toBeCalledWith('useNetworkViewer', expect.stringContaining(queryB));
    // make sure these do not occur together
    expect(config.logFunction).not.toBeCalledWith(
      'useNetworkViewer',
      expect.stringMatching(`${escapeRegex(queryA)}.*${escapeRegex(queryB)}`),
    );
    expect(config.logFunction).not.toBeCalledWith(
      'useNetworkViewer',
      expect.stringMatching(`${escapeRegex(queryB)}.*${escapeRegex(queryA)}`),
    );
  });
});
