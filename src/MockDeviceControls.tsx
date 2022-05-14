import { MockDevice } from './MockDevice';
import { Button, FormGroup, Intent, Slider, Tag } from '@blueprintjs/core';
import React from 'react';
import { Device } from './X1';
import { useDeviceValue } from './DeviceStatus';
import { ModeInfo } from './ModeInfo';

function VariableDump({ mockDevice }: { mockDevice: MockDevice }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
    {Array.from(mockDevice.getVariableValues())
      .map(([variable, value]) => <Tag key={variable}>
        {String.fromCharCode(variable)}:
        0x{value.toString(16).toUpperCase().padStart(2, '0')}
      </Tag>)}
  </div>;
}

export function MockDeviceControls({ device, mockDevice }: { device: Device, mockDevice: MockDevice }) {
  const triggered = useDeviceValue(mockDevice, mockDevice.getTriggered);

  return <>
    <VariableDump mockDevice={mockDevice} />
    <div style={{ display: 'flex', marginBottom: -20 }}>
      <FormGroup label="Mode" className="sidebar-tag">
        <Tag large={true} minimal={true}>{ModeInfo[useDeviceValue(device, device.getCurrentMode)].name}</Tag>
      </FormGroup>
      <FormGroup label="Info" className="sidebar-tag">
        <Tag large={true} minimal={true}>{useDeviceValue(device, device.getModeInfo)}</Tag>
      </FormGroup>
      <FormGroup label="Countdown" className="sidebar-tag">
        <Tag large={true} minimal={true}>{useDeviceValue(device, device.getCountDownTimeRemaining)}</Tag>
      </FormGroup>
      <FormGroup label="Channels" className="sidebar-tag">
        <Tag large={true} minimal={true}>{useDeviceValue(device, device.getEnabledChannels).toString(2).padStart(4, '0').split('').reverse().join('')}</Tag>
      </FormGroup>
    </div>
    <FormGroup label="Pulse Width Switch" className="sidebar-slider">
      <Slider min={0} max={3} labelRenderer={v => ['Short', 'Normal', 'Medium', 'Long'][v]} value={[1, 0, 3, 2][useDeviceValue(device, device.getPulseWidthSwitchValue)]} onChange={v => mockDevice.setPulseSwitch([1, 0, 3, 2][v])} />
    </FormGroup>
    <FormGroup label="Pulse Rate Knob" className="sidebar-slider">
      <Slider min={0x00} max={0xFF} labelStepSize={0xFF / 6} value={useDeviceValue(device, device.getPulseRateKnobValue)} onChange={v => mockDevice.setPulseRateKnob(v)} />
    </FormGroup>
    <FormGroup label="Trigger Mode Switch" className="sidebar-slider">
      <Slider min={0} max={3} labelRenderer={v => ['Cont.', 'Pulse', 'Manual', 'Audio'][v]} value={[1, 0, 3, 2][useDeviceValue(device, device.getTriggerModeSwitchValue)]} onChange={v => mockDevice.setTriggerSwitch([1, 0, 3, 2][v])} />
    </FormGroup>
    <FormGroup label="Trigger Rate Knob" className="sidebar-slider">
      <Slider min={0x00} max={0xFF} labelStepSize={0xFF / 6} value={useDeviceValue(device, device.getTriggerRateKnobValue)} onChange={v => mockDevice.setTriggerRateKnob(v)} />
    </FormGroup>
    <Button fill={true} intent={Intent.DANGER} outlined={!triggered} onClick={() => mockDevice.setTriggered(!triggered)}>Trigger</Button>
  </>;
}
