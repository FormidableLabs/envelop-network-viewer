export type OnExecuteDoneCallback = () => void;

export interface NetworkObserver {
  initialize: () => void;
  onExecute: () => OnExecuteDoneCallback;
}
