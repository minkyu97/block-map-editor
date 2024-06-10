export class Action {
  isExecuted: boolean;
  private _invoke: () => void;
  private _revoke: () => void;

  constructor(invoke: () => void, revoke: () => void) {
    this.isExecuted = false;
    this._invoke = invoke;
    this._revoke = revoke;
  }

  invoke() {
    if (this.isExecuted) return;
    this._invoke();
    this.isExecuted = true;
  }

  revoke() {
    if (!this.isExecuted) return;
    this._revoke();
    this.isExecuted = false;
  }
}

export class ActionHistory {
  maxHistory: number;
  readonly invokedActions: Action[];
  readonly revokedActions: Action[];

  constructor(maxHistory: number = 1000) {
    this.maxHistory = maxHistory;
    this.invokedActions = [];
    this.revokedActions = [];
  }

  do(invoke: () => void, revoke: () => void) {
    const action = new Action(invoke, revoke);
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

  clear() {
    this.invokedActions.splice(0);
    this.revokedActions.splice(0);
  }
}
