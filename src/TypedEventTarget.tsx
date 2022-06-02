interface TypedEventListener<T extends Event> {
  (evt: T): void;
}

interface TypedEventListenerObject<T extends Event> {
  handleEvent(object: T): void;
}

type TypedEventListenerOrTypedEventListenerObject<T extends Event> = TypedEventListener<T> | TypedEventListenerObject<T>;

type CustomEventKeyOf<T, D = any> = {
  [K in keyof T]: T[K] extends CustomEvent<D> ? K : never
}[keyof T]

export class TypedEventTarget<EventMap extends { [key in keyof EventMap]: Event }> extends EventTarget {
  public dispatchCustomEvent<K extends string & CustomEventKeyOf<EventMap, undefined>>(type: K): boolean
  public dispatchCustomEvent<K extends string & CustomEventKeyOf<EventMap, T>, T, E extends EventMap[K] & CustomEvent<T>>(type: K, detail: E['detail']): boolean
  public dispatchCustomEvent<K extends string & CustomEventKeyOf<EventMap, T>, T, E extends EventMap[K] & CustomEvent<T>>(type: K, detail?: E['detail']): boolean {
    return super.dispatchEvent(new CustomEvent(type, { detail }));
  }

  public dispatchEvent<K extends keyof EventMap>(e: EventMap[K]): boolean {
    return super.dispatchEvent(e);
  }

  public addEventListener<K extends string & keyof EventMap>(type: K, callback: TypedEventListenerOrTypedEventListenerObject<EventMap[K]> | null, options?: AddEventListenerOptions | boolean) {
    super.addEventListener(type, callback as (EventListenerOrEventListenerObject | null), options);
  }

  public removeEventListener<K extends string & keyof EventMap>(type: K, callback: TypedEventListenerOrTypedEventListenerObject<EventMap[K]> | null, options?: EventListenerOptions | boolean) {
    super.removeEventListener(type, callback as (EventListenerOrEventListenerObject | null), options);
  }
}
