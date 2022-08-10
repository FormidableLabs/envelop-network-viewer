import { Plugin, handleStreamOrSingleExecutionResult } from '@envelop/core';
import { getOperationName } from './getFromAST';
import { print } from 'graphql/language/printer';
import { NetworkObserver, OnExecuteDoneCallback } from './NetworkObserver';
import { HttpObserver } from './observers/httpObserver';
import { ContextTest, createNamespace as fauxCreateNamespace, Namespaceish } from './fauxClsHooked';
import { createNamespace } from 'cls-hooked';
import { v4 } from 'uuid';
import { ExecutionArgs } from 'graphql';

export type UseNetworkViewerOpts = {
  logFunction?: (message?: unknown, ...optionalParams: unknown[]) => void;
  logGraphQlDocument?: boolean;
  additionalObservers?: Array<NetworkObserver>;
  enableConcurrencySupport?: boolean;
};

export const useNetworkViewer = (enabled = false, opts?: UseNetworkViewerOpts): Plugin => {
  if (!enabled) {
    return {};
  }
  const logFunction = opts?.logFunction || console.log;

  const observers: Array<NetworkObserver> = [
    new HttpObserver(),
    ...(opts?.additionalObservers || []),
  ];

  const namespace: Namespaceish = opts?.enableConcurrencySupport
    ? createNamespace('envelop-network-viewer')
    : fauxCreateNamespace('envelop-network-viewer');

  return {
    onPluginInit() {
      observers.forEach((observer) => observer.initialize());
    },
    onExecute({ executeFn, setExecuteFn, args }) {
      let callbacks: Array<OnExecuteDoneCallback> = [];
      const id = v4();
      function clsExecuteFn(args: ExecutionArgs) {
        namespace.set('id', id);
        const contextTest = new ContextTest(id, namespace);
        callbacks = observers.map((observer) => observer.onExecute({ contextTest }));
        return executeFn(args);
      }
      setExecuteFn(namespace.bind(clsExecuteFn));
      return {
        onExecuteDone: (payload) => {
          return handleStreamOrSingleExecutionResult(payload, () => {
            const observations = callbacks.map((callback) => callback());
            logFunction(
              'useNetworkViewer',
              JSON.stringify(
                {
                  operationName: getOperationName(args.document),
                  operationId: id,
                  document: opts?.logGraphQlDocument ? print(args.document) : undefined,
                  observations,
                },
                null,
                0,
              ),
            );
          });
        },
      };
    },
  };
};
