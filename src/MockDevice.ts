import { CommunicationsInterface, VariableUpdate } from './X1';

export class MockDevice implements CommunicationsInterface {
  private streamingChanges: boolean = false;
  private pendingMessageResolver: () => void;
  private pendingMessagePromise: Promise<void>;
  private pendingMessages: (VariableUpdate | string | null)[] = [];
  private variableValues: Map<number, number> = new Map();
  private setCommands: Map<number, number> = new Map();

  async setPulseRateKnob(value: number): Promise<void> {
    await this.setVariable('f'.charCodeAt(0), value);
  }

  async setOutputPercentage(value: number): Promise<void> {
    await this.setVariable('v'.charCodeAt(0), Math.round(value * 255), false);
  }

  constructor() {
    this.pendingMessageResolver = () => undefined;
    this.pendingMessagePromise = new Promise<void>(resolve => {
      this.pendingMessageResolver = resolve;
    });

    const variables = [
      { id: '1', command: '1', value: 0x00 }, // "Short" Switch Mode
      { id: '2', command: '2', value: 0x00 }, // "Normal" Switch Mode
      { id: '3', command: '3', value: 0x00 }, // "Medium" Switch Mode
      { id: '4', command: '4', value: 0x00 }, // "Long" Switch Mode
      { id: 'c', command: 'C', value: 0x0F }, // Enabled Channels
      { id: 'd', value: 0 }, // Count Down Timer
      { id: 'f', value: 0 }, // Pulse Rate Knob
      { id: 'i', value: 0 }, // Mode Info
      { id: 'l', value: 127 }, // Input Voltage
      { id: 'm', command: 'P', value: 0x00 }, // Current Mode
      { id: 'p', value: 0 }, // Pulse Width Switch
      { id: 'r', value: 0 }, // Trigger Rate Knob
      { id: 's', value: 20 }, // Firmware Version
      { id: 't', value: 0 }, // Trigger Mode Switch
      { id: 'u', value: 0 }, // Unit Mode
      { id: 'v', value: 0 }, // Output Percentage
      { id: 'z', command: 'Z', value: 0 }, // Buzzer Mode
    ];

    for (const variable of variables) {
      this.variableValues.set(variable.id.charCodeAt(0), variable.value);

      if (variable.command) {
        this.setCommands.set(variable.command.charCodeAt(0), variable.id.charCodeAt(0));
      }
    }
  }

  async* receiveMessages(): AsyncGenerator<VariableUpdate | string, void, void> {
    while (true) {
      await this.pendingMessagePromise;
      this.pendingMessagePromise = new Promise<void>(resolve => {
        this.pendingMessageResolver = resolve;
      });

      while (true) {
        const message = this.pendingMessages.shift();
        if (message === undefined) {
          break;
        }

        if (message === null) {
          return;
        }

        // console.log('receiveMessages', message);
        yield message;
      }
    }
  }

  async sendCommand(command: number, argument: number): Promise<void> {
    // console.log('sendCommand', command, argument);

    switch (command) {
      case 'E'.charCodeAt(0):
        switch (argument) {
          case '+'.charCodeAt(0):
            this.streamingChanges = true;

            for (const [variable, value] of this.variableValues) {
              if (variable === 'v'.charCodeAt(0)) {
                continue;
              }

              await this.sendMessage({ variable, value });
            }

            break;
          case '-'.charCodeAt(0):
            this.streamingChanges = false;
            break;
          default:
            throw new Error(`unexpected E command param '${String.fromCharCode(argument)}' (${argument})`);
        }
        break;
      case 'G'.charCodeAt(0):
        const value = this.variableValues.get(argument);
        if (value === undefined) {
          throw new Error(`tried to get value of unknown variable '${String.fromCharCode(argument)}' (${argument})`);
        }

        await this.sendMessage({ variable: argument, value });
        break;
      case 'T'.charCodeAt(0):
        throw new Error('unimplemented');
      default:
        const variable = this.setCommands.get(command);
        if (variable === undefined) {
          throw new Error(`unknown command '${String.fromCharCode(command)}' (${command})`);
        }

        await this.setVariable(variable, argument);
    }
  }

  private async sendMessage(message: VariableUpdate | string): Promise<void> {
    this.pendingMessages.push(message);
    this.pendingMessageResolver();

    // TODO: This seems to let our written messages settle into the reader.
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  private async setVariable(variable: number, value: number, sendChange = true): Promise<void> {
    this.variableValues.set(variable, value);

    if (this.streamingChanges && sendChange) {
      await this.sendMessage({ variable, value });
    }
  }
}
