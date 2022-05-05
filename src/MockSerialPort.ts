import { ReadableStream, WritableStream } from 'node:stream/web';

export class MockSerialPort implements SerialPort {
  readable: ReadableStream<Uint8Array> | null = null;
  writable: WritableStream<Uint8Array> | null = null;

  public testBytesWritten: number[] = [];
  private readableStreamController: ReadableStreamController<Uint8Array> | null = null;

  static ParseTestBytes(bytes: (number | string)[]): number[] {
    return bytes.flatMap(v => {
      if (typeof v === 'string') {
        return v.split('').map(c => c.charCodeAt(0));
      } else {
        return v;
      }
    });
  }

  async writeBytesForTest(buffer: (number | string)[]): Promise<void> {
    if (!this.readableStreamController) {
      throw new Error('Serial port not open');
    }

    const bytes = MockSerialPort.ParseTestBytes(buffer);
    this.readableStreamController.enqueue(new Uint8Array(bytes));

    // TODO: This seems to let our written bytes settle into the reader.
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  get onconnect(): ((this: SerialPort, ev: Event) => any) | null {
    return null;
  }

  set onconnect(value: ((this: SerialPort, ev: Event) => any) | null) {
    throw new Error('Method not implemented.');
  }

  get ondisconnect(): ((this: SerialPort, ev: Event) => any) | null {
    return null;
  }

  set ondisconnect(value: ((this: SerialPort, ev: Event) => any) | null) {
    throw new Error('Method not implemented.');
  }

  async open(options: SerialOptions): Promise<void> {
    this.readable = new ReadableStream<Uint8Array>({
      start: (controller) => {
        this.readableStreamController = controller;
      },
    });

    this.writable = new WritableStream<Uint8Array>({
      write: (chunk: Uint8Array) => {
        this.testBytesWritten = [...this.testBytesWritten, ...chunk];
      },
    });
  }

  async setSignals(signals: SerialOutputSignals): Promise<void> {
    throw new Error('Method not implemented.');
  }

  async getSignals(): Promise<SerialInputSignals> {
    throw new Error('Method not implemented.');
  }

  getInfo(): SerialPortInfo {
    throw new Error('Method not implemented.');
  }

  async close(): Promise<void> {
    // TODO: Implement the proper closing algorithm.
    await this.readableStreamController?.close();
    this.readableStreamController = null;
    this.readable = null;
    await this.writable?.abort();
    this.writable = null;
  }

  addEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: AddEventListenerOptions | boolean): void {
    throw new Error('Method not implemented.');
  }

  removeEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: EventListenerOptions | boolean): void {
    throw new Error('Method not implemented.');
  }

  dispatchEvent(event: Event): boolean {
    throw new Error('Method not implemented.');
  }
}
