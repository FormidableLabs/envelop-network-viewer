import Knex from 'knex';
import { EVENT_ON_QUERY, hook } from './hook';
import EventEmitter from 'events';

interface Author {
  id: number;
  first_name: string;
  last_name: string;
}

describe('knexObserver/hook', () => {
  const knex = Knex({
    client: 'sqlite3',
    connection: {
      filename: ':memory:',
    },
    useNullAsDefault: true,
  });

  const emitter = new EventEmitter();
  // @ts-ignore
  emitter.emit = jest.fn();

  hook(knex, emitter);

  beforeAll(async () => {
    await knex.raw(
      `CREATE TABLE authors (contact_id INTEGER PRIMARY KEY AUTOINCREMENT, first_name TEXT NOT NULL, last_name TEXT NOT NULL);`,
    );
  });
  afterAll(async () => {
    await knex.destroy();
  });

  it('query builder first emits query events', async () => {
    await knex<Author>('authors').where('last_name', 'Sanderson').first();
    expect(emitter.emit).toHaveBeenCalledWith(
      EVENT_ON_QUERY,
      expect.objectContaining({
        sql: 'select * from `authors` where `last_name` = ? limit ?',
        bindings: expect.arrayContaining(['Sanderson', 1]),
      }),
    );
  });
  it('query builder select emits query events', async () => {
    await knex<Author>('authors').where('first_name', 'Brandon').select('last_name');
    expect(emitter.emit).toHaveBeenCalledWith(
      EVENT_ON_QUERY,
      expect.objectContaining({
        sql: 'select `last_name` from `authors` where `first_name` = ?',
        bindings: expect.arrayContaining(['Brandon']),
      }),
    );
  });
  it('query builder insert emits query events', async () => {
    await knex<Author>('authors').insert({
      first_name: 'Brandon',
      last_name: 'sanderson',
    });
    expect(emitter.emit).toHaveBeenCalledWith(
      EVENT_ON_QUERY,
      expect.objectContaining({
        sql: 'insert into `authors` (`first_name`, `last_name`) values (?, ?)',
        bindings: expect.arrayContaining(['Brandon', 'sanderson']),
      }),
    );
  });
  it('query builder update emits query events', async () => {
    await knex<Author>('authors').where({ last_name: 'sanderson' }).update({
      last_name: 'Sanderson',
    });
    expect(emitter.emit).toHaveBeenCalledWith(
      EVENT_ON_QUERY,
      expect.objectContaining({
        sql: 'update `authors` set `last_name` = ? where `last_name` = ?',
        bindings: expect.arrayContaining(['Sanderson']),
      }),
    );
  });
  it('raw query emits query events', async () => {
    await knex.raw('select * from authors where last_name like ?', ['S*']);
    expect(emitter.emit).toHaveBeenCalledWith(
      EVENT_ON_QUERY,
      expect.objectContaining({
        sql: 'select * from authors where last_name like ?',
        bindings: expect.arrayContaining(['S*']),
      }),
    );
  });
});
