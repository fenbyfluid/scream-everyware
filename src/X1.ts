export interface VariableUpdate {
  readonly variable: number;
  readonly value: number;
}

export interface CommunicationsInterface {
  sendCommand(command: number, argument: number): Promise<void>;
  receiveMessages(): AsyncGenerator<VariableUpdate | string, void, void>;
}

export enum Mode {
  Torment = 0x00,
  SmoothSuffering,
  BitchTraining,
  TurboThruster,
  Random,
  RandomBitch,
  Purgatory,
  PurgatoryChaos,
  PersistentPain,
  Pulse,
  RampPulse,
  RampRepeat,
  RampIntensity,
  AudioAttack,
  TormentLowVoltage,
  PowerWavesLowVoltage,
  SpeedWaves,
  DemonPlay,
  ExtremeTorment = 0x80,
  ExtremeBitchTraining,
}

export const ModeNames: { [Property in Mode]: string; } = {
  [Mode.Torment]: 'Torment',
  [Mode.SmoothSuffering]: 'Smooth Suffering',
  [Mode.BitchTraining]: 'Bitch Training',
  [Mode.TurboThruster]: 'Turbo Thruster',
  [Mode.Random]: 'Random',
  [Mode.RandomBitch]: 'Random Bitch',
  [Mode.Purgatory]: 'Purgatory',
  [Mode.PurgatoryChaos]: 'Purgatory Chaos',
  [Mode.PersistentPain]: 'Persistent Pain',
  [Mode.Pulse]: 'Pulse',
  [Mode.RampPulse]: 'Ramp Pulse',
  [Mode.RampRepeat]: 'Ramp Repeat',
  [Mode.RampIntensity]: 'Ramp Intensity',
  [Mode.AudioAttack]: 'Audio Attack',
  [Mode.TormentLowVoltage]: 'Torment (LV)',
  [Mode.PowerWavesLowVoltage]: 'Power Waves (LV)',
  [Mode.SpeedWaves]: 'Speed Waves',
  [Mode.DemonPlay]: 'Demon Play',
  [Mode.ExtremeTorment]: 'Extreme Torment',
  [Mode.ExtremeBitchTraining]: 'Extreme Bitch Training',
};

enum FetchMode {
  Default,
  ForceLoad,
  WaitForChange,
}

export class Device {
  private interface: CommunicationsInterface;
  private streaming: boolean = false;
  private pendingVariables: Map<number, { promise: Promise<number>, resolve: (value: number) => void }> = new Map();
  private variableValues: Map<number, number> = new Map();

  constructor(communicationsInterface: CommunicationsInterface) {
    this.interface = communicationsInterface;
    this.processMessages().then(() => {});
  }

  async watchVariables(enable: boolean): Promise<void> {
    if (enable === this.streaming) {
      return;
    }

    await this.interface.sendCommand('E'.charCodeAt(0), enable ? '+'.charCodeAt(0) : '-'.charCodeAt(0));

    this.streaming = enable;
  }

  async manualTrigger(time: number): Promise<void> {
    // Convert to a multiple of 0.1s
    const value = Math.round(time * 10);

    if (value < 0x00 || value > 0xFF) {
      throw new Error(`trigger time ${time} (${value}) out of range`)
    }

    await this.interface.sendCommand('T'.charCodeAt(0), value);
  }

  async getShortSwitchMode(): Promise<Mode> {
    return await this.getVariable('1'.charCodeAt(0));
  }

  async setShortSwitchMode(mode: Mode): Promise<void> {
    await this.interface.sendCommand('1'.charCodeAt(0), mode);
  }

  async getNormalSwitchMode(): Promise<Mode> {
    return await this.getVariable('2'.charCodeAt(0));
  }

  async setNormalSwitchMode(mode: Mode): Promise<void> {
    await this.interface.sendCommand('2'.charCodeAt(0), mode);
  }

  async getMediumSwitchMode(): Promise<Mode> {
    return await this.getVariable('3'.charCodeAt(0));
  }

  async setMediumSwitchMode(mode: Mode): Promise<void> {
    await this.interface.sendCommand('3'.charCodeAt(0), mode);
  }

  async getLongSwitchMode(): Promise<Mode> {
    return await this.getVariable('4'.charCodeAt(0));
  }

  async setLongSwitchMode(mode: Mode): Promise<void> {
    await this.interface.sendCommand('4'.charCodeAt(0), mode);
  }

  async getEnabledChannels(waitForChange: boolean = false): Promise<number> {
    const fetchMode = waitForChange ? FetchMode.WaitForChange : FetchMode.Default;
    return await this.getVariable('c'.charCodeAt(0), fetchMode);
  }

  async setEnabledChannels(channelMask: number): Promise<void> {
    await this.interface.sendCommand('C'.charCodeAt(0), channelMask);
  }

  async getCountDownTimeRemaining(waitForChange: boolean = false): Promise<number> {
    const fetchMode = waitForChange ? FetchMode.WaitForChange : FetchMode.Default;
    return await this.getVariable('d'.charCodeAt(0), fetchMode);
  }

  async getPulseRateKnobValue(waitForChange: boolean = false): Promise<number> {
    const fetchMode = waitForChange ? FetchMode.WaitForChange : FetchMode.Default;
    return await this.getVariable('f'.charCodeAt(0), fetchMode);
  }

  async getModeInfo(waitForChange: boolean = false): Promise<number> {
    const fetchMode = waitForChange ? FetchMode.WaitForChange : FetchMode.Default;
    return await this.getVariable('i'.charCodeAt(0), fetchMode);
  }

  async getInputVoltage(waitForChange: boolean = false): Promise<number> {
    const fetchMode = waitForChange ? FetchMode.WaitForChange : FetchMode.Default;
    return await this.getVariable('l'.charCodeAt(0), fetchMode);
  }

  async getCurrentMode(waitForChange: boolean = false): Promise<Mode> {
    const fetchMode = waitForChange ? FetchMode.WaitForChange : FetchMode.Default;
    return await this.getVariable('m'.charCodeAt(0), fetchMode);
  }

  async setCurrentMode(mode: Mode): Promise<void> {
    await this.interface.sendCommand('P'.charCodeAt(0), mode);
  }

  async getPulseWidthSwitchValue(waitForChange: boolean = false): Promise<number> {
    const fetchMode = waitForChange ? FetchMode.WaitForChange : FetchMode.Default;
    return await this.getVariable('p'.charCodeAt(0), fetchMode);
  }

  async getTriggerRateKnobValue(waitForChange: boolean = false): Promise<number> {
    const fetchMode = waitForChange ? FetchMode.WaitForChange : FetchMode.Default;
    return await this.getVariable('r'.charCodeAt(0), fetchMode);
  }

  async getFirmwareVersion(): Promise<number> {
    return await this.getVariable('s'.charCodeAt(0));
  }

  async getTriggerModeSwitchValue(waitForChange: boolean = false): Promise<number> {
    const fetchMode = waitForChange ? FetchMode.WaitForChange : FetchMode.Default;
    return await this.getVariable('t'.charCodeAt(0), fetchMode);
  }

  async getUnitMode(): Promise<number> {
    return await this.getVariable('u'.charCodeAt(0));
  }

  async getOutputPercentage(): Promise<number> {
    return (await this.getVariable('v'.charCodeAt(0), FetchMode.ForceLoad)) / 255;
  }

  async getBuzzerMode(waitForChange: boolean = false): Promise<number> {
    const fetchMode = waitForChange ? FetchMode.WaitForChange : FetchMode.Default;
    return await this.getVariable('z'.charCodeAt(0), fetchMode);
  }

  async setBuzzerMode(buzzerMode: number): Promise<void> {
    await this.interface.sendCommand('Z'.charCodeAt(0), buzzerMode);
  }

  private async processMessages(): Promise<void> {
    for await (const message of this.interface.receiveMessages()) {
      if (typeof message === 'string') {
        console.log(message);
        continue;
      }

      const { variable, value } = message;
      this.variableValues.set(variable, value);

      const pending = this.pendingVariables.get(variable);
      if (pending) {
        this.pendingVariables.delete(variable);
        pending.resolve(value);
      }
    }
  }

  private async getVariable(variable: number, fetchMode: FetchMode = FetchMode.Default): Promise<number> {
    const value = this.variableValues.get(variable);
    if (this.streaming && fetchMode !== FetchMode.ForceLoad && value !== undefined) {
      return value;
    }

    const pending = this.pendingVariables.get(variable);
    if (pending) {
      return pending.promise;
    }

    let resolve: ((value: number) => void) | null = null;
    const promise = new Promise<number>(resolveFn => {
      resolve = resolveFn;
    });

    this.pendingVariables.set(variable, { promise, resolve: resolve! });

    if (!this.streaming && fetchMode === FetchMode.WaitForChange) {
      throw new Error('WaitForChange used while not streaming');
    }

    if (fetchMode !== FetchMode.WaitForChange && (!this.streaming || fetchMode === FetchMode.ForceLoad)) {
      await this.interface.sendCommand('G'.charCodeAt(0), variable);
    }

    return promise;
  }
}
