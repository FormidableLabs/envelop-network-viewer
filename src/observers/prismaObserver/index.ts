import {
  ExecuteArgs,
  ExecuteDoneReport,
  NetworkObserver,
  OnExecuteDoneCallback,
} from '../../NetworkObserver';
import { PrismaClient } from '@prisma/client';
import EventEmitter from 'events';
import { middlewareFactory } from './middleware';
import { ExecutionListener } from './executionListener';

export const EVENT_PRISMA_QUERY = 'QUERY';

export class PrismaObserver implements NetworkObserver {
  constructor(
    private readonly prisma: PrismaClient,
    private emitter: EventEmitter = new EventEmitter(),
  ) {}
  initialize(): void {
    // @ts-ignore
    this.prisma.$use(middlewareFactory(this.emitter));
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
