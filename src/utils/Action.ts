export default class Action<out T> {
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
