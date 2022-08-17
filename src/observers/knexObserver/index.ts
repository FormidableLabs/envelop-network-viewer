import {
  ExecuteArgs,
  ExecuteDoneReport,
  NetworkObserver,
  OnExecuteDoneCallback,
} from '../../NetworkObserver';
import EventEmitter from 'events';
import { hook } from './hook';
import { Knex } from 'knex';
import { ExecutionListener } from './executionListener';

export class KnexObserver implements NetworkObserver {
  constructor(private readonly knex: Knex, private emitter: EventEmitter = new EventEmitter()) {}
  initialize(): void {
    hook(this.knex, this.emitter);
  }

  onExecute({ contextTest }: ExecuteArgs): OnExecuteDoneCallback {
    const listener = new ExecutionListener(contextTest);
    listener.bind(this.emitter);
    return (): ExecuteDoneReport => {
      const report = listener.report();
      listener.unbind(this.emitter);
      return report;
    };
  }
}
