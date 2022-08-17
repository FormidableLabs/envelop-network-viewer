import { DataTypes, InferAttributes, InferCreationAttributes, Model, Sequelize } from 'sequelize';
import { useNetworkViewer, UseNetworkViewerOpts } from '../../useNetworkViewer';
import { SequelizeObserver } from './index';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { createTestkit } from '@envelop/testing';
import 'jest-expect-json';

describe('sequelizeObserver/integration', () => {
  const sequelize = new Sequelize('sqlite::memory:', {
    logging: false,
  });
  class Author extends Model<InferAttributes<Author>, InferCreationAttributes<Author>> {
    declare firstName: string;
    declare lastName: string;
    declare birthday: Date;
  }
  Author.init(
    {
      firstName: DataTypes.STRING,
      lastName: DataTypes.STRING,
      birthday: DataTypes.DATE,
    },
    { sequelize, modelName: 'author' },
  );

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
            setTimeout(() => resolve(Author.findAll()), 5);
          });
        },
        author: async (_parent, args: { id: number }) => {
          return new Promise((resolve) => {
            setTimeout(() => resolve(Author.findByPk(args.id)), 5);
          });
        },
      },
    },
  });

  beforeAll(async () => {
    await sequelize.sync();
  });
  afterAll(async () => {
    await sequelize.close();
  });

  it('includes sequelize observations in log message', async () => {
    const config: UseNetworkViewerOpts = {
      logFunction: jest.fn(),
      logGraphQlDocument: true,
      additionalObservers: [new SequelizeObserver(sequelize)],
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
        observations: expect.arrayContaining([expect.objectContaining({ label: 'SEQUELIZE' })]),
      }),
    );
  });
  it('supports concurrent requests', async () => {
    const config: UseNetworkViewerOpts = {
      logFunction: jest.fn(),
      logGraphQlDocument: true,
      additionalObservers: [new SequelizeObserver(sequelize)],
    };
    const testInstance = createTestkit([useNetworkViewer(true, config)], schema);
    await testInstance.execute(`query author { author(id: 1) { firstName lastName } }`);
    await testInstance.execute(`query authors { authors { firstName lastName } }`);
    expect(config.logFunction).toHaveBeenCalledTimes(2);
    expect(config.logFunction).toBeCalledWith(
      'useNetworkViewer',
      expect.stringMatching(
        `"sql":"SELECT \`id\`, \`firstName\`, \`lastName\`, \`birthday\`, \`createdAt\`, \`updatedAt\` FROM \`authors\` AS \`author\` WHERE \`author\`.\`id\` = '1';"`,
      ),
    );
    expect(config.logFunction).toBeCalledWith(
      'useNetworkViewer',
      expect.stringMatching(
        `"sql":"SELECT \`id\`, \`firstName\`, \`lastName\`, \`birthday\`, \`createdAt\`, \`updatedAt\` FROM \`authors\` AS \`author\`;"`,
      ),
    );
    // make sure these do not occur together
    expect(config.logFunction).toBeCalledWith(
      'useNetworkViewer',
      expect.not.stringMatching(
        `"sql":"SELECT \`id\`, \`firstName\`, \`lastName\`, \`birthday\`, \`createdAt\`, \`updatedAt\` FROM \`authors\` AS \`author\` WHERE \`author\`.\`id\` = '1';".*"sql":"SELECT \`id\`, \`firstName\`, \`lastName\`, \`birthday\`, \`createdAt\`, \`updatedAt\` FROM \`authors\` AS \`author\`;"`,
      ),
    );
    expect(config.logFunction).toBeCalledWith(
      'useNetworkViewer',
      expect.not.stringMatching(
        `"sql":"SELECT \`id\`, \`firstName\`, \`lastName\`, \`birthday\`, \`createdAt\`, \`updatedAt\` FROM \`authors\` AS \`author\`;".*"sql":"SELECT \`id\`, \`firstName\`, \`lastName\`, \`birthday\`, \`createdAt\`, \`updatedAt\` FROM \`authors\` AS \`author\` WHERE \`author\`.\`id\` = '1';"`,
      ),
    );
  });
});
