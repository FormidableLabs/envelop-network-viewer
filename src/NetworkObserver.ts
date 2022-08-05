export type ExecuteDoneReport = {
  label: string;
  data: Record<string, any>;
};
export type OnExecuteDoneCallback = () => ExecuteDoneReport;

export interface NetworkObserver {
  initialize: () => void;
  onExecute: () => OnExecuteDoneCallback;
}
