import EventEmitter from 'events';
import { Sequelize } from 'sequelize';
import { AbstractQuery } from 'sequelize/types/dialects/abstract/query';
import { DeepPartial } from '../../deepPartial';

export const EVENT_AFTER_QUERY = 'afterQuery';
export type QueryEventArgs = DeepPartial<
  AbstractQuery & {
    sql: string;
    options: {
      bind?: Array<unknown>;
    };
  }
>;

export class Hooks {
  constructor(
    private readonly sequelize: Sequelize,
    private readonly emitter: EventEmitter = new EventEmitter(),
  ) {
    sequelize.addHook('afterQuery', (options, query) => {
      emitter.emit(EVENT_AFTER_QUERY, query);
    });
  }
}
