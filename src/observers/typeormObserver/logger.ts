import { Logger, QueryRunner } from 'typeorm';
import { LoggerFactory } from 'typeorm/logger/LoggerFactory';
import { LoggerOptions } from 'typeorm/logger/LoggerOptions';
import EventEmitter from 'events';

export const EVENT_LOG_QUERY = 'logQuery';
export type EventLogQueryArgs = {
  query: string;
  parameters?: Array<unknown>;
};

export class TypeORMObserverLogger implements Logger {
  private readonly logger?: Logger;
  private emitter?: EventEmitter;
  constructor(
    logger?: 'advanced-console' | 'simple-console' | 'file' | 'debug' | Logger,
    options?: LoggerOptions,
  ) {
    if (logger) {
      this.logger = new LoggerFactory().create(logger, options);
    }
  }

  initialize(emitter: EventEmitter) {
    this.emitter = emitter;
  }

  log(level: 'log' | 'info' | 'warn', message: any, queryRunner?: QueryRunner): any {
    if (this.logger) return this.logger.log(level, message, queryRunner);
  }

  logMigration(message: string, queryRunner?: QueryRunner): any {
    if (this.logger) return this.logger.logMigration(message, queryRunner);
  }

  logQuery(query: string, parameters?: any[], queryRunner?: QueryRunner): any {
    if (this.emitter) {
      this.emitter.emit(EVENT_LOG_QUERY, { query, parameters });
    }
    if (this.logger) return this.logger.logQuery(query, parameters, queryRunner);
  }

  logQueryError(
    error: string | Error,
    query: string,
    parameters?: any[],
    queryRunner?: QueryRunner,
  ): any {
    if (this.logger) return this.logger.logQueryError(error, query, parameters, queryRunner);
  }

  logQuerySlow(time: number, query: string, parameters?: any[], queryRunner?: QueryRunner): any {
    if (this.logger) return this.logger.logQuerySlow(time, query, parameters, queryRunner);
  }

  logSchemaBuild(message: string, queryRunner?: QueryRunner): any {
    if (this.logger) return this.logger.logSchemaBuild(message, queryRunner);
  }
}
