// These types aren't available from @prisma/client and are not part of the public interface
import EventEmitter from 'events';
import { EVENT_PRISMA_QUERY } from './index';
import { DMMF } from '@prisma/client/runtime';

export type Action = `${DMMF.ModelAction}` | 'executeRaw' | 'queryRaw' | 'runCommandRaw';
export type QueryMiddlewareParams = {
  /** The model this is executed on */
  model?: string;
  /** The action that is being handled */
  action: Action;
  dataPath: string[];
  runInTransaction: boolean;
  args: unknown;
};
export type Middleware = <T = unknown>(
  params: QueryMiddlewareParams,
  next: (params: QueryMiddlewareParams) => Promise<T>,
) => Promise<T>;

export const middlewareFactory = (emitter: EventEmitter): Middleware => {
  return async <T = unknown>(
    params: QueryMiddlewareParams,
    next: (params: QueryMiddlewareParams) => Promise<T>,
  ) => {
    const before = Date.now();
    const result = next(params);
    const after = Date.now();
    emitter.emit(EVENT_PRISMA_QUERY, {
      ...params,
      duration_ms: after - before,
    });
    return result;
  };
};
