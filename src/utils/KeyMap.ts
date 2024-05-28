const NONE = 0b0000;
const SHIFT = 0b0001;
const CTRL = 0b0010;
const ALT = 0b0100;
const META = 0b1000;

export const Modifiers = { NONE, SHIFT, CTRL, ALT, META } as const;

type Table = { [modifier: number]: { [code: string]: () => void } };

export default class KeyMap {
  private static instance: KeyMap;
  private readonly _table: Table;
  isActive: boolean;

  private constructor() {
    this._table = {};
    this.isActive = true;
    window.addEventListener("keydown", this.handle.bind(this));
  }

  static getInstance() {
    if (!KeyMap.instance) {
      KeyMap.instance = new KeyMap();
    }
    return KeyMap.instance;
  }

  bind(modifier: number, code: string, callback: () => void) {
    if (!(modifier in this._table)) {
      this._table[modifier] = {};
    }
    if (this._table[modifier]![code]) {
      console.warn("Overwriting existing binding");
    }
    this._table[modifier]![code] = callback;
  }

  unbind(modifier: number, code: string) {
    delete this._table[modifier]?.[code];
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
    const callback = this._table[modifier]?.[event.code];
    if (callback) {
      event.preventDefault();
      callback();
    }
  }
}
