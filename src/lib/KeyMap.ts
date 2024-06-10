const NONE = 0b0000;
const SHIFT = 0b0001;
const CTRL = 0b0010;
const ALT = 0b0100;
const META = 0b1000;

export const Modifiers = { NONE, SHIFT, CTRL, ALT, META } as const;

type Table = Map<number, Map<string, () => void>>;

export class KeyMap {
  private readonly _table: Table;
  isActive: boolean;

  constructor() {
    this._table = new Map();
    this.isActive = true;
    window.addEventListener("keydown", this.handle.bind(this));
  }

  bind(modifier: number, code: string, callback: () => void) {
    if (!this._table.has(modifier)) {
      this._table.set(modifier, new Map());
    }
    if (this._table.get(modifier)!.has(code)) {
      console.warn("Overwriting existing binding");
    }
    this._table.get(modifier)!.set(code, callback);
  }

  unbind(modifier: number, code: string) {
    this._table.get(modifier)?.delete(code);
  }

  activate() {
    this.isActive = true;
  }

  deactivate() {
    this.isActive = false;
  }

  handle(event: KeyboardEvent) {
    if (!this.isActive) return;
    const modifier =
      (event.shiftKey ? SHIFT : NONE) |
      (event.ctrlKey ? CTRL : NONE) |
      (event.altKey ? ALT : NONE) |
      (event.metaKey ? META : NONE);
    const callback = this._table.get(modifier)?.get(event.code);
    if (callback) {
      event.preventDefault();
      callback();
    }
  }
}
