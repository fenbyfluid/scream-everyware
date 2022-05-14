import { ModeInfo } from './ModeInfo';
import { BuzzerMode, Channel, Device, FetchMode, Mode, PulseWidthSwitch, TriggerModeSwitch, UnitMode } from './X1';
import {
  Button,
  Card,
  Classes,
  ControlGroup,
  Elevation,
  FormGroup,
  HTMLSelect,
  HTMLSelectProps,
  Icon,
  Intent,
  NumericInput,
  Switch,
  Tab,
  Tabs,
  Tag,
} from '@blueprintjs/core';
import React, { useEffect, useState } from 'react';
import { Deferred } from './Deferred';

export function useDeviceValue<D, T>(device: D, getter: (this: D, fetchMode: FetchMode) => Promise<T>): T {
  // TODO: Should this be nullable instead?
  const [value, setValue] = useState<T>(0 as unknown as T);

  useEffect(() => {
    const cancel = new Deferred<T>();

    (async () => {
      let fetchMode = FetchMode.Default;

      while (true) {
        try {
          const value = await Promise.race([
            getter.call(device, fetchMode),
            cancel.promise,
          ]);

          setValue(value);
        } catch (e) {
          break;
        }

        fetchMode = FetchMode.WaitForChange;
      }
    })();

    return () => {
      cancel.reject();
    };
  }, [device, getter]);

  return value;
}

interface ModeSelectProps extends HTMLSelectProps {
  device: Device;
  unitMode: UnitMode,
  getter: (this: Device, fetchMode: FetchMode) => Promise<Mode>;
  setter: (this: Device, mode: Mode) => Promise<void>;
}

function ModeSelect({ device, unitMode, getter, setter, ...passThroughProps }: ModeSelectProps) {
  const modeOptions = Object.keys(ModeInfo)
    .map(key => (+key as Mode))
    .filter(mode => {
      switch (unitMode) {
        case UnitMode.Normal:
          return mode < Mode.ExtremeTorment;
        case UnitMode.Extreme:
          return mode >= Mode.ExtremeTorment;
        default:
          throw new Error('unknown unit mode');
      }
    })
    .map(mode => ({
      label: ModeInfo[mode].name,
      value: mode,
    }));

  return <HTMLSelect {...passThroughProps} options={modeOptions} value={useDeviceValue(device, getter)} onChange={ev => setter.call(device, +ev.currentTarget.value)} />;
}

interface TriggerButtonProps {
  device: Device;
  currentMode: Mode;
  triggerModeSwitchValue: TriggerModeSwitch;
}

function TriggerButton({ device, currentMode, triggerModeSwitchValue }: TriggerButtonProps) {
  const enabled = (triggerModeSwitchValue === TriggerModeSwitch.Manual) && ModeInfo[currentMode].canRemoteTrigger();

  const [triggerTime, setTriggerTime] = useState(1.0);
  const onClick = async () => {
    await device.manualTrigger(triggerTime);
  };

  return <ControlGroup fill={true}>
    <Button disabled={!enabled} fill={true} onClick={onClick} intent={Intent.DANGER}>Trigger</Button>
    <NumericInput disabled={!enabled} fill={true} min={0.1} max={0.1 * 255} minorStepSize={null} stepSize={0.1} majorStepSize={1} defaultValue={triggerTime} onValueChange={n => setTriggerTime(n)} />
  </ControlGroup>;
}

interface ChannelSwitchesProps {
  device: Device;
  currentMode: Mode;
  triggerModeSwitchValue: TriggerModeSwitch;
}

function ChannelSwitches({ device, currentMode, triggerModeSwitchValue }: ChannelSwitchesProps) {
  const enabled = ModeInfo[currentMode].canSetChannels(triggerModeSwitchValue);

  const [desiredChannels, setDesiredChannels] = useState(0);

  const onSwitchChange = (channel: Channel, ev: React.FormEvent<HTMLInputElement>) => {
    const checked = ev.currentTarget.checked;
    setDesiredChannels(value => checked ? (value | channel) : (value & ~channel));
  };

  const channels = useDeviceValue(device, device.getUnitMode) === UnitMode.Normal ? [
    { name: '1', flag: Channel.One },
    { name: '2', flag: Channel.Two },
    { name: '3', flag: Channel.Three },
    { name: '4', flag: Channel.Four },
  ] : [
    { name: '1-2', flag: Channel.One },
    { name: '3-4', flag: Channel.Two },
  ];

  const enabledChannels = useDeviceValue(device, device.getEnabledChannels);

  return <div>
    {channels.map(({ name, flag }) => <ControlGroup fill={true} key={flag}>
      <Switch disabled={!enabled} checked={(desiredChannels & flag) === flag} onChange={ev => onSwitchChange(flag, ev)}>Channel {name}</Switch>
      <Icon icon={(enabledChannels & flag) === flag ? 'full-circle' : 'circle'} intent={Intent.DANGER} className={Classes.FIXED} />
    </ControlGroup>)}
    <ControlGroup fill={true} style={{ marginTop: 10 }}>
      <Button disabled={!enabled} onClick={() => device.setEnabledChannels(desiredChannels)}>Set Channels</Button>
      <Button disabled={!enabled} onClick={() => device.setEnabledChannels(0)}>All Off</Button>
    </ControlGroup>
  </div>;
}

function PulseSwitchModeSelect({ device }: { device: Device }) {
  const pulseSwitchPositions = [
    PulseWidthSwitch.Short,
    PulseWidthSwitch.Normal,
    PulseWidthSwitch.Medium,
    PulseWidthSwitch.Long,
  ];

  return <>
    {pulseSwitchPositions.map(switchPosition =>
      <FormGroup label={`${PulseWidthSwitch[switchPosition]} Switch Mode`} labelFor={`pulseSwitchModeSelect-${switchPosition}`} key={switchPosition}>
        <ModeSelect id={`pulseSwitchModeSelect-${switchPosition}`} fill={true} device={device} unitMode={UnitMode.Normal} getter={device.getSwitchMode.bind(device, switchPosition)} setter={device.setSwitchMode.bind(device, switchPosition)} />
      </FormGroup>)}
  </>;
}

function InputVoltage({ device }: { device: Device }) {
  const inputVoltage = useDeviceValue(device, device.getInputVoltage);
  const [intent, label] = (() => {
    if (inputVoltage > 14) {
      return [Intent.DANGER, 'Over Voltage'];
    } else if (inputVoltage > 10.5) {
      return [Intent.NONE, 'OK'];
    } else if (inputVoltage > 10) {
      return [Intent.WARNING, 'Voltage Low'];
    } else {
      return [Intent.DANGER, 'Under Voltage'];
    }
  })();

  return <Tag intent={intent} large={true} minimal={intent === Intent.NONE}>
    Power Supply: {inputVoltage}V ({label})
  </Tag>;
}

function StatusPanel({ device }: { device: Device }) {
  const [showModeInfo, setShowModeInfo] = useState(false);
  const [showCountDown, setShowCountDown] = useState(false);

  const currentMode = useDeviceValue(device, device.getCurrentMode);
  const modeInfo = useDeviceValue(device, device.getModeInfo);
  const countDownTimeRemaining = useDeviceValue(device, device.getCountDownTimeRemaining);
  const pulseWidthSwitchValue = useDeviceValue(device, device.getPulseWidthSwitchValue);
  const triggerModeSwitchValue = useDeviceValue(device, device.getTriggerModeSwitchValue);

  useEffect(() => {
    setShowModeInfo(false);
    setShowCountDown(false);
  }, [currentMode]);

  useEffect(() => {
    setShowCountDown(false);
  }, [triggerModeSwitchValue]);

  if (!showModeInfo && modeInfo > 0) {
    setShowModeInfo(true);
  }

  if (!showCountDown && countDownTimeRemaining > 0) {
    setShowCountDown(true);
  }

  const formatTime = (v: number): string => {
    const minutes = (v / 60) | 0;
    const seconds = v % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return <div className="panel-container">
    <div className="panel panel-left">
      <Card elevation={Elevation.ONE} className="cell">
        <FormGroup label="Current Mode" labelFor="currentModeSelect">
          <ModeSelect id="currentModeSelect" fill={true} device={device} unitMode={useDeviceValue(device, device.getUnitMode)} getter={device.getCurrentMode} setter={device.setCurrentMode} />
        </FormGroup>
        {showModeInfo ? <FormGroup label="Mode Info">
          <Tag minimal={true} large={true}>{modeInfo}</Tag>
        </FormGroup> : undefined}
        {showCountDown ? <FormGroup label="Countdown">
          <Tag minimal={true} large={true} intent={countDownTimeRemaining <= 10 ? Intent.DANGER : Intent.NONE}>{formatTime(countDownTimeRemaining)}</Tag>
        </FormGroup> : undefined}
      </Card>
      <Card elevation={Elevation.ONE} className="cell">
        <FormGroup label="Pulse Switch">
          <Tag minimal={true} large={true}>{PulseWidthSwitch[pulseWidthSwitchValue]}</Tag>
          {' '}
          <Tag minimal={true} large={true}>{ModeInfo[currentMode].getPulseWidthSwitchLabel(pulseWidthSwitchValue, triggerModeSwitchValue) ?? 'Not Used'}</Tag>
        </FormGroup>
        <FormGroup label="Pulse Rate">
          <Tag minimal={true} large={true}>{useDeviceValue(device, device.getPulseRateKnobValue)}</Tag>
        </FormGroup>
        <FormGroup label="Trigger Switch">
          <Tag minimal={true} large={true}>{TriggerModeSwitch[triggerModeSwitchValue]}</Tag>
        </FormGroup>
        <FormGroup label="Trigger Rate">
          <Tag minimal={true} large={true}>{useDeviceValue(device, device.getTriggerRateKnobValue)}</Tag>
        </FormGroup>
      </Card>
    </div>
    <div className="panel panel-right">
      <Card elevation={Elevation.ONE} className="cell">
        <ChannelSwitches device={device} currentMode={currentMode} triggerModeSwitchValue={triggerModeSwitchValue} />
      </Card>
      <div className="cell">
        <TriggerButton device={device} currentMode={currentMode} triggerModeSwitchValue={triggerModeSwitchValue} />
      </div>
      <Card elevation={Elevation.ONE} className="cell">
        <Switch checked={useDeviceValue(device, device.getBuzzerMode) === BuzzerMode.Always} onChange={ev => device.setBuzzerMode(ev.currentTarget.checked ? BuzzerMode.Always : BuzzerMode.WhenOutput)} disabled={!ModeInfo[currentMode].canSetBuzzMode()}>
          Buzz Always On
        </Switch>
      </Card>
    </div>
  </div>;
}

function SettingsPanel({ device }: { device: Device }) {
  return <>
    <Card elevation={Elevation.ONE} className="cell">
      <PulseSwitchModeSelect device={device} />
    </Card>
  </>;
}

export function DeviceStatus({ device }: { device: Device }) {
  return <>
    <Tabs large={true} renderActiveTabPanelOnly={true} className="cell">
      <Tab id="status" title="Status" panel={<StatusPanel device={device} />} />
      <Tab id="settings" title="Settings" panel={<SettingsPanel device={device} />} />
      <Tabs.Expander />
      <InputVoltage device={device} />
    </Tabs>
  </>;
}
