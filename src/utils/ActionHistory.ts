import Action from "./Action";

export default class History {
  maxHistory: number;
  readonly invokedActions: Action<unknown>[];
  readonly revokedActions: Action<unknown>[];

  constructor(maxHistory: number = 1000) {
    this.maxHistory = maxHistory;
    this.invokedActions = [];
    this.revokedActions = [];
  }

  do(action: Action<unknown>) {
    action.invoke();
    this.invokedActions.push(action);
    if (this.invokedActions.length > this.maxHistory) {
      this.invokedActions.shift();
    }
    this.revokedActions.splice(0);
  }

  undo() {
    const action = this.invokedActions.pop();
    if (action === undefined) return;
    action.revoke();
    this.revokedActions.push(action);
  }

  redo() {
    const action = this.revokedActions.pop();
    if (action === undefined) return;
    action.invoke();
    this.invokedActions.push(action);
  }
}
