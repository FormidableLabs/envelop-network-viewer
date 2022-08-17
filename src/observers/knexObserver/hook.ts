import EventEmitter from 'events';
import { Knex } from 'knex';

export const EVENT_ON_QUERY = 'query';

export type QueryEventArgs = {
  options?: Record<string, unknown>;
  bindings?: Array<unknown>;
  method?: string;
  sql: string;
};

export const hook = (knex: Knex, emitter: EventEmitter) => {
  knex.on('query', (data) => {
    emitter.emit(EVENT_ON_QUERY, data);
  });
};
