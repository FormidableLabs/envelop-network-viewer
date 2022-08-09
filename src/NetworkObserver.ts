import { ContextTest } from './fauxClsHooked';

export type ExecuteDoneReport = {
  label: string;
  data: Record<string, any>;
};
export type OnExecuteDoneCallback = () => ExecuteDoneReport;

export type ExecuteArgs = {
  contextTest: ContextTest;
};

export interface NetworkObserver {
  initialize: () => void;
  onExecute: (args: ExecuteArgs) => OnExecuteDoneCallback;
}
