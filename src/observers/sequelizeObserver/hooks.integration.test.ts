import { DataTypes, InferAttributes, InferCreationAttributes, Model, Sequelize } from 'sequelize';
import EventEmitter from 'events';
import { EVENT_AFTER_QUERY, Hooks } from './hooks';
describe('sequelizeObserver/hooks/integration', () => {
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
  beforeAll(async () => {
    await sequelize.sync();
  });
  afterAll(async () => {
    await sequelize.close();
  });
  let hooks: Hooks;
  let emitter: EventEmitter;
  beforeEach(() => {
    emitter = new EventEmitter();
    emitter.emit = jest.fn();
    hooks = new Hooks(sequelize, emitter);
  });

  it('emits on model create', async () => {
    await Author.create({
      firstName: 'Jane',
      lastName: 'Austen',
      birthday: new Date(1775, 12, 16),
    });
    expect(emitter.emit).toHaveBeenCalledWith(
      'afterQuery',
      expect.objectContaining({
        model: Author,
        sql: 'INSERT INTO `authors` (`id`,`firstName`,`lastName`,`birthday`,`createdAt`,`updatedAt`) VALUES (NULL,$1,$2,$3,$4,$5);',
        options: expect.objectContaining({
          dialect: 'sqlite',
          type: 'INSERT',
          bind: expect.arrayContaining(['Jane', 'Austen', '1776-01-16 07:28:18.000 +00:00']),
        }),
      }),
    );
  });
  it('emits on model find', async () => {
    await Author.findAll({ where: { lastName: 'Austen' } });
    expect(emitter.emit).toHaveBeenCalledWith(
      'afterQuery',
      expect.objectContaining({
        model: Author,
        sql: "SELECT `id`, `firstName`, `lastName`, `birthday`, `createdAt`, `updatedAt` FROM `authors` AS `author` WHERE `author`.`lastName` = 'Austen';",
        options: expect.objectContaining({
          type: 'SELECT',
        }),
      }),
    );
  });
  it('emits on model update', async () => {
    const michael = await Author.create({
      firstName: 'Michael',
      lastName: 'Chrichton',
      birthday: new Date(1942, 10, 23),
    });
    michael.lastName = 'Crichton';
    await michael.save();
    expect(emitter.emit).toHaveBeenCalledWith(
      'afterQuery',
      expect.objectContaining({
        model: Author,
        sql: 'UPDATE `authors` SET `lastName`=$1,`updatedAt`=$2 WHERE `id` = $3',
        options: expect.objectContaining({
          type: 'UPDATE',
          bind: expect.arrayContaining(['Crichton']),
        }),
      }),
    );
  });
  it('emits on model delete', async () => {
    const robin = await Author.create({
      firstName: 'Robin',
      lastName: 'Cook',
      birthday: new Date(1940, 5, 4),
    });
    await robin.destroy();
    expect(emitter.emit).toHaveBeenCalledWith(
      'afterQuery',
      expect.objectContaining({
        model: Author,
        // @ts-ignore
        sql: 'DELETE FROM `authors` WHERE `id` = ' + robin.id,
        options: expect.objectContaining({
          type: 'DELETE',
        }),
      }),
    );
  });
  it('emits on raw query', async () => {
    await sequelize.query('select * from authors where lastName = ?', {
      replacements: ['Steinbeck'],
    });
    expect(emitter.emit).toHaveBeenCalledWith(
      EVENT_AFTER_QUERY,
      expect.objectContaining({
        model: undefined,
        // @ts-ignore
        sql: "select * from authors where lastName = 'Steinbeck'",
        options: expect.objectContaining({
          type: 'RAW',
          replacements: expect.arrayContaining(['Steinbeck']),
        }),
      }),
    );
  });
});
