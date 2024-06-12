import { BaseEvent, EventDispatcher } from "three";

export class Action {
  isExecuted: boolean;
  private _invoke: () => void;
  private _revoke: () => void;
  readonly description: string;

  constructor(invoke: () => void, revoke: () => void, description = "", isExecuted = false) {
    this.isExecuted = isExecuted;
    this.description = description;
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

type ActionHistoryEventMap = {
  push: { action: Action };
  undo: { action: Action };
  redo: { action: Action };
  clear: {};
  moveCursor: { to: number };
  change: {};
};

export class ActionHistory extends EventDispatcher<ActionHistoryEventMap> {
  maxHistory: number;
  readonly actions: Action[];
  private cursor: number;

  get index() {
    return this.cursor;
  }

  get lastAction() {
    return this.actions[this.cursor];
  }

  constructor(maxHistory: number = 1000) {
    super();
    this.maxHistory = maxHistory;
    this.actions = [];
    this.cursor = -1; // the last executed action.
  }

  push(action: Action) {
    if (!action.isExecuted) action.invoke();
    if (!action.isExecuted) action.invoke();

    if (this.actions.length === this.maxHistory) {
      this.actions.shift();
      this.cursor--;
    }
    this.actions[++this.cursor] = action;
    this.actions.splice(this.cursor + 1);
    this.dispatchEvent({ type: "push", action });
  }

  undo() {
    if (this.cursor < 0) return;
    const action = this.actions[this.cursor--]!;
    action.revoke();
    this.dispatchEvent({ type: "undo", action });
  }

  redo() {
    if (this.cursor + 1 >= this.actions.length) return;
    const action = this.actions[++this.cursor]!;
    action.invoke();
    this.dispatchEvent({ type: "redo", action });
  }

  clear() {
    this.actions.splice(0);
    this.cursor = -1;
    this.dispatchEvent({ type: "clear" });
  }

  moveCursor(to: number) {
    if (to < 0 || to >= this.actions.length) return;
    if (to < this.cursor) {
      while (this.cursor > to) this.undo();
    } else {
      while (this.cursor < to) this.redo();
    }
    this.dispatchEvent({ type: "moveCursor", to });
  }

  override dispatchEvent<T extends keyof ActionHistoryEventMap>(event: BaseEvent<T> & ActionHistoryEventMap[T]) {
    super.dispatchEvent(event);
    super.dispatchEvent({ type: "change" });
  }
}
