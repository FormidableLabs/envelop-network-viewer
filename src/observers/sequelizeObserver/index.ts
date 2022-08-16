import {
  ExecuteArgs,
  ExecuteDoneReport,
  NetworkObserver,
  OnExecuteDoneCallback,
} from '../../NetworkObserver';
import EventEmitter from 'events';
import { Sequelize } from 'sequelize';
import { Hooks } from './hooks';
import { ExecutionListener } from './executionListener';

export class SequelizeObserver implements NetworkObserver {
  constructor(
    private readonly sequelize: Sequelize,
    private emitter: EventEmitter = new EventEmitter(),
  ) {}
  initialize(): void {
    new Hooks(this.sequelize, this.emitter);
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
