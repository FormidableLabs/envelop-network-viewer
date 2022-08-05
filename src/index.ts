import { Plugin, handleStreamOrSingleExecutionResult } from '@envelop/core';
import { getOperationName } from './getFromAST';
import { print } from 'graphql/language/printer';
import { NetworkObserver } from './NetworkObserver';
import { HttpObserver } from './observers/httpObserver';

export type UseNetworkViewerOpts = {
  logFunction?: (message?: any, ...optionalParams: any[]) => void;
  logGraphQlDocument?: boolean;
  additionalObservers?: Array<NetworkObserver>;
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

  return {
    onPluginInit() {
      observers.forEach((observer) => observer.initialize());
    },
    onExecute({ args }) {
      const callbacks = observers.map((observer) => observer.onExecute());
      return {
        onExecuteDone: (payload) => {
          return handleStreamOrSingleExecutionResult(payload, ({ result, setResult }) => {
            const observations = callbacks.map((callback) => callback());
            // Here you can access result, and modify it with setResult if needed
            logFunction('useNetworkViewer', {
              operationName: getOperationName(args.document),
              document: opts?.logGraphQlDocument ? print(args.document) : undefined,
              observations,
            });
          });
        },
      };
    },
  };
};
