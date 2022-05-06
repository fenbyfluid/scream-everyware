import { CommunicationsInterface, VariableUpdate } from './X1';

export class WebSerialCommunicationsInterface implements CommunicationsInterface {
  private port: SerialPort | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

  async open(port: SerialPort): Promise<void> {
    if (this.port !== null) {
      throw new Error('WebSerialCommunicationsInterface already open');
    }

    // Retry a number of times as the bluetooth connection can take a while.
    for (let i = 0; i < 10; ++i) {
      try {
        await port.open({
          baudRate: 115200,
        });

        break;
      } catch (e) {
        console.log(e);
      }
    }

    this.port = port;
  }

  async close(): Promise<void> {
    if (this.port === null) {
      throw new Error('WebSerialCommunicationsInterface not open');
    }

    if (this.reader) {
      await this.reader.cancel();
    }

    await this.port.close();
    this.port = null;
  }

  async sendCommand(command: number, argument: number): Promise<void> {
    if (this.port === null) {
      throw new Error('WebSerialCommunicationsInterface not open');
    }

    if (this.port.writable === null) {
      throw new Error('Serial port not writable');
    }

    const writer = this.port.writable.getWriter();

    const message = [command, argument, 0x0A];
    // console.log('sendCommand', message);
    await writer.write(new Uint8Array(message));

    writer.releaseLock();
  }

  async* receiveMessages(): AsyncGenerator<VariableUpdate | string, void, void> {
    if (this.port === null) {
      throw new Error('WebSerialCommunicationsInterface not open');
    }

    if (this.port.readable === null) {
      throw new Error('Serial port not readable');
    }

    const buffer = [];
    this.reader = this.port.readable.getReader();

    while (true) {
      const { value, done } = await this.reader.read();
      if (done) {
        break;
      }

      // console.log('receiveMessages.read', value);
      buffer.push(...value);

      while (true) {
        if (buffer.length < 3) {
          break;
        }

        const messageEnd = buffer.indexOf(0x0A, 2);
        if (messageEnd === -1) {
          break;
        }

        const message = buffer.splice(0, messageEnd + 1);
        // console.log('receiveMessages', message);

        if (message.length > 3) {
          yield message.map(b => String.fromCharCode(b)).join('');
          continue;
        }

        yield { variable: message[0], value: message[1] };
      }
    }

    this.reader.releaseLock();
    this.reader = null;
  }
}
