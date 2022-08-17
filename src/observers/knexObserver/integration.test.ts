import { useNetworkViewer, UseNetworkViewerOpts } from '../../useNetworkViewer';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { createTestkit } from '@envelop/testing';
import 'jest-expect-json';
import Knex from 'knex';
import { KnexObserver } from './index';

interface Author {
  id: number;
  first_name: string;
  last_name: string;
}

describe('knexObserver/integration', () => {
  const knex = Knex({
    client: 'sqlite3',
    connection: {
      filename: ':memory:',
    },
    useNullAsDefault: true,
  });

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
            setTimeout(() => resolve(knex<Author>('authors')), 5);
          });
        },
        author: async (_parent, args: { id: number }) => {
          return new Promise((resolve) => {
            setTimeout(() => resolve(knex<Author>('authors').where('id', args.id)), 5);
          });
        },
      },
    },
  });

  beforeAll(async () => {
    await knex.raw(
      `CREATE TABLE authors (contact_id INTEGER PRIMARY KEY AUTOINCREMENT, first_name TEXT NOT NULL, last_name TEXT NOT NULL);`,
    );
    await knex<Author>('authors').insert({
      first_name: 'Brandon',
      last_name: 'sanderson',
    });
  });
  afterAll(async () => {
    await knex.destroy();
  });

  it('includes knex observations in log message', async () => {
    const config: UseNetworkViewerOpts = {
      logFunction: jest.fn(),
      logGraphQlDocument: true,
      additionalObservers: [new KnexObserver(knex)],
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
        observations: expect.arrayContaining([expect.objectContaining({ label: 'KNEX' })]),
      }),
    );
  });
  it('supports concurrent requests', async () => {
    const config: UseNetworkViewerOpts = {
      logFunction: jest.fn(),
      logGraphQlDocument: true,
      additionalObservers: [new KnexObserver(knex)],
    };
    const testInstance = createTestkit([useNetworkViewer(true, config)], schema);
    await testInstance.execute(`query author { author(id: 1) { firstName lastName } }`);
    await testInstance.execute(`query authors { authors { firstName lastName } }`);
    expect(config.logFunction).toHaveBeenCalledTimes(2);
    expect(config.logFunction).toBeCalledWith(
      'useNetworkViewer',
      expect.stringMatching('select \\* from `authors`'),
    );
    expect(config.logFunction).toBeCalledWith(
      'useNetworkViewer',
      expect.stringMatching('select \\* from `authors` where `id` = ?'),
    );
    // make sure these do not occur together
    expect(config.logFunction).toBeCalledWith(
      'useNetworkViewer',
      expect.not.stringMatching(
        `select \\* from \`authors\`.*select \\* from \`authors\` where \`id\` = ?`,
      ),
    );
    expect(config.logFunction).toBeCalledWith(
      'useNetworkViewer',
      expect.not.stringMatching(
        `select \\* from \`authors\` where \`id\` = ?.*select \\* from \`authors\``,
      ),
    );
  });
});
