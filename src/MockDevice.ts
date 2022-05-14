import { CommunicationsInterface, FetchMode, Mode, PulseWidthSwitch, TriggerModeSwitch, VariableUpdate } from './X1';
import { Deferred } from './Deferred';

export class MockDevice implements CommunicationsInterface {
  private pendingMessages: (VariableUpdate | string | null)[] = [];
  private pendingMessageSemaphore: Deferred<void> = new Deferred();
  private setCommands: Map<number, number> = new Map();

  private variableValues: Map<number, number> = new Map();
  private streamingChanges: boolean = false;
  private triggered: boolean = false;
  private channelMasks: number[] = [0x00, 0x0F];
  private modeTimeout: any;
  private triggerChange: Deferred<boolean> = new Deferred();

  constructor() {
    const variables = [
      { id: '1', command: '1', value: 0x00 }, // "Short" Switch Mode
      { id: '2', command: '2', value: 0x00 }, // "Normal" Switch Mode
      { id: '3', command: '3', value: 0x00 }, // "Medium" Switch Mode
      { id: '4', command: '4', value: 0x00 }, // "Long" Switch Mode
      { id: 'c', command: 'C', value: 0x00 }, // Enabled Channels
      { id: 'd', value: 0 }, // Count Down Timer
      { id: 'f', value: 0 }, // Pulse Rate Knob
      { id: 'i', value: 0 }, // Mode Info
      { id: 'l', value: 127 }, // Input Voltage
      { id: 'm', command: 'P', value: 0x00 }, // Current Mode
      { id: 'p', value: 0x00 }, // Pulse Width Switch
      { id: 'r', value: 0 }, // Trigger Rate Knob
      { id: 's', value: 20 }, // Firmware Version
      { id: 't', value: 0x03 }, // Trigger Mode Switch
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

  async setPulseSwitch(value: PulseWidthSwitch): Promise<void> {
    await this.setVariable('p', value);
  }

  async setPulseRateKnob(value: number): Promise<void> {
    await this.setVariable('f', value);
  }

  async setTriggerSwitch(value: TriggerModeSwitch): Promise<void> {
    await this.setVariable('t', value);
  }

  async setTriggerRateKnob(value: number): Promise<void> {
    await this.setVariable('r', value);
  }

  async setOutputPercentage(value: number): Promise<void> {
    await this.setVariable('v', Math.round(value * 255), false);
  }

  async setTriggered(triggered: boolean): Promise<void> {
    this.triggered = triggered;

    this.triggerChange.resolve(triggered);
    this.triggerChange = new Deferred();

    await this.setVariable('c', this.channelMasks[this.triggered ? 1 : 0]);
  }

  async getTriggered(fetchMode: FetchMode): Promise<boolean> {
    if (fetchMode !== FetchMode.WaitForChange) {
      return this.triggered;
    }

    return this.triggerChange.promise;
  }

  getVariableValues(): IterableIterator<[number, number]> {
    return this.variableValues.entries();
  }

  async* receiveMessages(): AsyncGenerator<VariableUpdate | string, void, void> {
    while (true) {
      await this.pendingMessageSemaphore.promise;
      this.pendingMessageSemaphore = new Deferred();

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
        await this.setTriggered(true);

        setTimeout(() => {
          this.setTriggered(false);
        }, argument * 0.1 * 1000);

        break;
      case 'C'.charCodeAt(0):
        this.channelMasks[this.triggered ? 1 : 0] = argument;
        await this.setVariable('c', argument);
        break;
      case 'P'.charCodeAt(0):
        if (this.modeTimeout !== null) {
          clearTimeout(this.modeTimeout);
          this.modeTimeout = null;
        }

        await this.setVariable('m', argument);
        await this.setVariable('d', 0, false);
        await this.setVariable('i', 0, false);

        if (argument === Mode.Purgatory) {
          const countDown = async (time: number, done: Function, ...args: any[]) => {
            this.modeTimeout = null;

            await this.setVariable('d', time);

            if (time > 0) {
              this.modeTimeout = setTimeout(countDown, 1000, time - 1, done, ...args);
              return;
            }

            done(...args);
          };

          const runPurgatory = async (level: number) => {
            await this.setVariable('i', level);

            if (level >= 9) {
              level = 0;
            }

            await countDown(5 + level, runPurgatory, level + 1);
          };

          await runPurgatory(1);
        }

        break;
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
    this.pendingMessageSemaphore.resolve();

    // TODO: This seems to let our written messages settle into the reader.
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  private async setVariable(variable: number | string, value: number, sendChange = true): Promise<void> {
    if (typeof variable === 'string') {
      variable = variable.charCodeAt(0);
    }

    const oldValue = this.variableValues.get(variable);
    this.variableValues.set(variable, value);

    if (oldValue !== value && this.streamingChanges && sendChange) {
      await this.sendMessage({ variable, value });
    }
  }
}
