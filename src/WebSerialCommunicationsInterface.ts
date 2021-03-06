import { CommunicationsInterface, VariableUpdate } from './X1';
import { TypedEventTarget } from './TypedEventTarget';

interface WebSerialCommunicationsInterfaceEventMap {
  'disconnected': CustomEvent<undefined>;
}

export class WebSerialCommunicationsInterface extends TypedEventTarget<WebSerialCommunicationsInterfaceEventMap> implements CommunicationsInterface {
  private port: SerialPort | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

  async open(port: SerialPort): Promise<void> {
    if (this.port !== null) {
      throw new Error('WebSerialCommunicationsInterface already open');
    }

    // Retry a number of times as the bluetooth connection can take a while.
    let error = undefined;
    for (let i = 0; i < 10; ++i) {
      try {
        await port.open({
          baudRate: 115200,
        });

        this.port = port;

        break;
      } catch (e) {
        error = e;
        console.log(e);
      }
    }

    if (this.port === null) {
      throw error;
    }

    // TODO: This doesn't seem to get emitted.
    this.port.addEventListener('disconnect', () => {
      this.port = null;

      this.dispatchCustomEvent('disconnected');
    });
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

    try {
      const writer = this.port.writable.getWriter();

      const message = [command, argument, 0x0A];
      // console.log('sendCommand', message);
      await writer.write(new Uint8Array(message));

      writer.releaseLock();
    } catch (e) {
      console.log(e);

      if (this.port.writable) {
        throw e;
      }

      await this.close();

      this.dispatchCustomEvent('disconnected');
    }
  }

  async* receiveMessages(): AsyncGenerator<VariableUpdate | string, void, void> {
    if (this.port === null) {
      throw new Error('WebSerialCommunicationsInterface not open');
    }

    if (this.port.readable === null) {
      throw new Error('Serial port not readable');
    }

    do {
      let canceled = false;
      const buffer = [];
      this.reader = this.port.readable.getReader();

      while (true) {
        try {
          const { value, done } = await this.reader.read();
          if (done) {
            canceled = true;
            break;
          }

          // console.log('receiveMessages.read', value);
          buffer.push(...value);
        } catch (e) {
          console.log(e);
          break;
        }

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

      if (canceled) {
        return;
      }
    } while (this.port.readable !== null);

    await this.close();

    this.dispatchCustomEvent('disconnected');
  }
}
