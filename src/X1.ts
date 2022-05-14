import { Deferred } from './Deferred';

export interface VariableUpdate {
  readonly variable: number;
  readonly value: number;
}

export interface CommunicationsInterface {
  sendCommand(command: number, argument: number): Promise<void>;
  receiveMessages(): AsyncGenerator<VariableUpdate | string, void, void>;
}

export enum PulseWidthSwitch {
  Short = 0x01,
  Normal = 0x00,
  Medium = 0x03,
  Long = 0x02,
}

export enum TriggerModeSwitch {
  Continuous = 0x01,
  Pulse = 0x00,
  Manual = 0x03,
  Audio = 0x02,
}

export enum UnitMode {
  Normal = 0x00,
  Extreme = 0x01,
}

export enum BuzzerMode {
  Always = 0x00,
  WhenOutput = 0x01,
}

export enum Channel {
  One = 1 << 0,
  Two = 1 << 1,
  Three = 1 << 2,
  Four = 1 << 3,
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

export enum FetchMode {
  Default,
  ForceLoad,
  WaitForChange,
}

export class Device {
  private interface: CommunicationsInterface;
  private streaming: boolean = false;
  private pendingVariables: Map<number, Deferred<number>> = new Map();
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
      throw new Error(`trigger time ${time} (${value}) out of range`);
    }

    await this.interface.sendCommand('T'.charCodeAt(0), value);
  }

  async getSwitchMode(switchPosition: PulseWidthSwitch, fetchMode: FetchMode = FetchMode.Default): Promise<Mode> {
    let variable;
    switch (switchPosition) {
      case PulseWidthSwitch.Short:
        variable = '1'.charCodeAt(0);
        break;
      case PulseWidthSwitch.Normal:
        variable = '2'.charCodeAt(0);
        break;
      case PulseWidthSwitch.Medium:
        variable = '3'.charCodeAt(0);
        break;
      case PulseWidthSwitch.Long:
        variable = '4'.charCodeAt(0);
        break;
    }

    return await this.getVariable(variable, fetchMode);
  }

  async setSwitchMode(switchPosition: PulseWidthSwitch, mode: Mode): Promise<void> {
    let variable;
    switch (switchPosition) {
      case PulseWidthSwitch.Short:
        variable = '1'.charCodeAt(0);
        break;
      case PulseWidthSwitch.Normal:
        variable = '2'.charCodeAt(0);
        break;
      case PulseWidthSwitch.Medium:
        variable = '3'.charCodeAt(0);
        break;
      case PulseWidthSwitch.Long:
        variable = '4'.charCodeAt(0);
        break;
    }

    await this.interface.sendCommand(variable, mode);

    // The set commands for these don't mirror back the new value.
    this.processVariableUpdate(variable, mode);
  }

  async getEnabledChannels(fetchMode: FetchMode = FetchMode.Default): Promise<number> {
    return await this.getVariable('c'.charCodeAt(0), fetchMode);
  }

  async setEnabledChannels(channelMask: number): Promise<void> {
    await this.interface.sendCommand('C'.charCodeAt(0), channelMask);
  }

  async getCountDownTimeRemaining(fetchMode: FetchMode = FetchMode.Default): Promise<number> {
    return await this.getVariable('d'.charCodeAt(0), fetchMode);
  }

  async getPulseRateKnobValue(fetchMode: FetchMode = FetchMode.Default): Promise<number> {
    return await this.getVariable('f'.charCodeAt(0), fetchMode);
  }

  async getModeInfo(fetchMode: FetchMode = FetchMode.Default): Promise<number> {
    return await this.getVariable('i'.charCodeAt(0), fetchMode);
  }

  async getInputVoltage(fetchMode: FetchMode = FetchMode.Default): Promise<number> {
    return (await this.getVariable('l'.charCodeAt(0), fetchMode)) / 10;
  }

  async getCurrentMode(fetchMode: FetchMode = FetchMode.Default): Promise<Mode> {
    return await this.getVariable('m'.charCodeAt(0), fetchMode);
  }

  async setCurrentMode(mode: Mode): Promise<void> {
    await this.interface.sendCommand('P'.charCodeAt(0), mode);
  }

  async getPulseWidthSwitchValue(fetchMode: FetchMode = FetchMode.Default): Promise<PulseWidthSwitch> {
    return await this.getVariable('p'.charCodeAt(0), fetchMode);
  }

  async getTriggerRateKnobValue(fetchMode: FetchMode = FetchMode.Default): Promise<number> {
    return await this.getVariable('r'.charCodeAt(0), fetchMode);
  }

  async getFirmwareVersion(fetchMode: FetchMode = FetchMode.Default): Promise<number> {
    return await this.getVariable('s'.charCodeAt(0), fetchMode);
  }

  async getTriggerModeSwitchValue(fetchMode: FetchMode = FetchMode.Default): Promise<TriggerModeSwitch> {
    return await this.getVariable('t'.charCodeAt(0), fetchMode);
  }

  async getUnitMode(fetchMode: FetchMode = FetchMode.Default): Promise<UnitMode> {
    return await this.getVariable('u'.charCodeAt(0), fetchMode);
  }

  async getOutputPercentage(fetchMode: FetchMode = FetchMode.Default): Promise<number> {
    if (fetchMode === FetchMode.Default) {
      fetchMode = FetchMode.ForceLoad;
    }

    return (await this.getVariable('v'.charCodeAt(0), fetchMode)) / 255;
  }

  async getBuzzerMode(fetchMode: FetchMode = FetchMode.Default): Promise<BuzzerMode> {
    return await this.getVariable('z'.charCodeAt(0), fetchMode);
  }

  async setBuzzerMode(buzzerMode: BuzzerMode): Promise<void> {
    await this.interface.sendCommand('Z'.charCodeAt(0), buzzerMode);
  }

  private async processMessages(): Promise<void> {
    for await (const message of this.interface.receiveMessages()) {
      if (typeof message === 'string') {
        console.log(message);
        continue;
      }

      const { variable, value } = message;
      this.processVariableUpdate(variable, value);

      // Special case: changing the mode resets the info and countdown
      if (variable === 'm'.charCodeAt(0)) {
        this.processVariableUpdate('i'.charCodeAt(0), 0);
        this.processVariableUpdate('d'.charCodeAt(0), 0);
      }
    }

    for (const [variable, pending] of this.pendingVariables) {
      this.pendingVariables.delete(variable);
      pending.reject(new Error('connection closed'));
    }
  }

  private processVariableUpdate(variable: number, value: number) {
    this.variableValues.set(variable, value);

    const pending = this.pendingVariables.get(variable);
    if (pending) {
      this.pendingVariables.delete(variable);
      pending.resolve(value);
    }
  }

  private async getVariable(variable: number, fetchMode: FetchMode = FetchMode.Default): Promise<number> {
    const value = this.variableValues.get(variable);
    if (this.streaming && fetchMode === FetchMode.Default && value !== undefined) {
      return value;
    }

    const pending = this.pendingVariables.get(variable);
    if (pending) {
      return pending.promise;
    }

    const deferred = new Deferred<number>();
    this.pendingVariables.set(variable, deferred);

    if (!this.streaming && fetchMode === FetchMode.WaitForChange) {
      throw new Error('WaitForChange used while not streaming');
    }

    if (fetchMode !== FetchMode.WaitForChange && (!this.streaming || fetchMode === FetchMode.ForceLoad)) {
      await this.interface.sendCommand('G'.charCodeAt(0), variable);
    }

    return deferred.promise;
  }
}
