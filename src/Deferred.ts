export class Deferred<T> {
  readonly promise: Promise<T>;

  constructor() {
    this.promise = new Promise<T>((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });
  }

  private _resolve: ((value: T | PromiseLike<T>) => void) | undefined;

  get resolve(): (value: (PromiseLike<T> | T)) => void {
    return this._resolve!;
  }

  private _reject: ((reason?: any) => void) | undefined;

  get reject(): (reason?: any) => void {
    return this._reject!;
  }
}
