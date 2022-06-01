import './BridgeSettings.css';
import {
  BtScanResult,
  PairedDevice,
  ScanState,
  WebBluetoothCommunicationsInterface,
} from './WebBluetoothCommunicationsInterface';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Alignment,
  Button,
  Card,
  Classes,
  ControlGroup,
  Elevation,
  Expander,
  FileInput,
  FormGroup,
  Icon,
  InputGroup,
  Intent,
  Menu,
  MenuItem, Switch,
  Tab,
  TabId,
  Tabs,
  Tag,
} from '@blueprintjs/core';

export function BridgeBattery({ bridge }: { bridge: WebBluetoothCommunicationsInterface }) {
  const [batteryLevel, setBatteryLevel] = useState<number>(bridge.batteryLevel);

  const onBatteryLevelChanged = useCallback(() => {
    setBatteryLevel(bridge.batteryLevel);
  }, [bridge]);

  useEffect(() => {
    bridge.addEventListener('battery-level-changed', onBatteryLevelChanged);

    return () => {
      bridge.removeEventListener('battery-level-changed', onBatteryLevelChanged);
    };
  }, [bridge, onBatteryLevelChanged]);

  const width = (batteryLevel / 100) * 8;
  const icon = <span aria-hidden="true" className={Classes.ICON}>
    <svg data-icon="feed" width="16" height="16" viewBox="0 0 16 16">
      <path d="M1 13h12s1 0 1-1v-1s0-1 1-1c0 0 1 0 1-1V7s0-1-1-1c0 0-1 0-1-1V4s0-1-1-1H1S0 3 0 4v8s0 1 1 1Zm1-8h10v6H2V5Z" fillRule="evenodd" />
      <path d={`M3 6v4h${width}V6H3Z`} />
    </svg>
  </span>;

  return <Tag minimal={true} rightIcon={icon}>{batteryLevel}%</Tag>;
}

function SignalStrengthIcon({ rssi }: { rssi: number }) {
  let path = 'M1.99 11.99c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.89-2-2-2z';

  if (rssi >= -100) {
    path += 'm1-4c-.55 0-1 .45-1 1s.45 1 1 1c1.66 0 3 1.34 3 3 0 .55.45 1 1 1s1-.45 1-1c0-2.76-2.24-5-5-5z';
  }

  if (rssi >= -80) {
    path += 'm0-4c-.55 0-1 .45-1 1s.45 1 1 1c3.87 0 7 3.13 7 7 0 .55.45 1 1 1s1-.45 1-1a9 9 0 00-9-9z';
  }

  if (rssi >= -60) {
    path += 'm0-4c-.55 0-1 .45-1 1s.45 1 1 1c6.08 0 11 4.92 11 11 0 .55.45 1 1 1s1-.45 1-1c0-7.18-5.82-13-13-13z';
  }

  return <span aria-hidden="true" className={Classes.ICON}>
    <svg data-icon="feed" width="16" height="16" viewBox="0 0 16 16">
      <path d={path} fillRule="evenodd" />
    </svg>
  </span>;
}

interface DevicesPanelProps {
  bridge: WebBluetoothCommunicationsInterface;
  setScanState: React.Dispatch<React.SetStateAction<ScanState>>;
  showAllResults: boolean;
  setHasHiddenResults: React.Dispatch<React.SetStateAction<boolean>>;
  pairedDevice: PairedDevice | null;
  setPairedDevice: React.Dispatch<React.SetStateAction<PairedDevice | null>>;
}

function DevicesPanel({ bridge, setScanState, showAllResults, setHasHiddenResults, pairedDevice, setPairedDevice }: DevicesPanelProps) {
  const [scanResults, setScanResults] = useState<BtScanResult[]>([]);

  const onScanChanged = useCallback(() => {
    setScanState(bridge.scanning);
    setScanResults(bridge.scanResults);
  }, [bridge, setScanState]);

  useEffect(() => {
    bridge.addEventListener('bt-scan-changed', onScanChanged);

    return () => {
      bridge.removeEventListener('bt-scan-changed', onScanChanged);
    };
  }, [bridge, onScanChanged]);

  const initialPairedDevice = useMemo(() => bridge.pairedDevice, [bridge])

  const displayScanResults = useMemo(() => {
    const displayScanResults: (BtScanResult | PairedDevice)[] = [];

    let hasHiddenResults = false;
    let foundPairedDevice = false;
    let foundInitialPairedDevice = false;

    for (const result of scanResults) {
      if (result.name.match(/^SLMK1/) === null) {
        hasHiddenResults = true;

        if (!showAllResults) {
          continue;
        }
      }

      if (result.address === pairedDevice?.address) {
        foundPairedDevice = true;
      }

      if (result.address === initialPairedDevice?.address) {
        foundInitialPairedDevice = true;
      }

      displayScanResults.push(result);
    }

    if (pairedDevice && !foundPairedDevice) {
      displayScanResults.push(pairedDevice);
    }

    if (initialPairedDevice && !foundInitialPairedDevice && initialPairedDevice.address !== pairedDevice?.address) {
      displayScanResults.push(initialPairedDevice);
    }

    displayScanResults.sort((a, b) => a.name.localeCompare(b.name));

    setHasHiddenResults(hasHiddenResults);

    return displayScanResults;
  }, [pairedDevice, initialPairedDevice, setHasHiddenResults, scanResults, showAllResults]);

  return <div>
      <Menu className={`${Classes.ELEVATION_1} bridge-device-menu`}>
      {displayScanResults.length > 0 ? displayScanResults.map(r => <MenuItem
        key={r.address}
        selected={r.address === pairedDevice?.address}
        icon={(r.address === pairedDevice?.address) ? 'selection' : 'circle'}
        text={r.name}
        labelElement={'rssi' in r ? <SignalStrengthIcon rssi={r.rssi} /> : <Icon icon="link" />}
        onClick={async () => {
          const paired = (r.address === pairedDevice?.address) ? null : {
            address: r.address,
            name: r.name,
          };

          await bridge.setPairedDevice(paired);

          setPairedDevice(paired);
        }}
      />) : <div className={`no-results-item ${Classes.TEXT_MUTED}`}>
        Use the <Icon icon="refresh" style={{ paddingLeft: 3, paddingRight: 3 }} /> button to scan for devices.
      </div>}
    </Menu>
    <Button disabled={pairedDevice === null} fill={true} intent={Intent.PRIMARY} onClick={() => bridge.connect()}>Connect</Button>
  </div>;
}

function SettingsPanel({ bridge }: { bridge: WebBluetoothCommunicationsInterface }) {
  const [resetConfigAlertOpen, setResetConfigAlertOpen] = useState<boolean>(false);

  return <Card elevation={Elevation.ONE} className="cell">
    <FormGroup label="Bluetooth Name" helperText="Bluetooth name to show for the bridge." labelFor="bridgeConfigName">
      <InputGroup id="bridgeConfigName" defaultValue={bridge.name} onBlur={ev => bridge.name = ev.currentTarget.value} />
    </FormGroup>
    <FormGroup label="Bluetooth Pin" helperText="Pin code required for pairing new clients." labelFor="bridgeConfigPin">
      <InputGroup id="bridgeConfigPin" defaultValue="" onBlur={ev => bridge.pinCode = +ev.currentTarget.value} />
    </FormGroup>
    <FormGroup label="Connected Idle Timeout" helperText="If a connected client is idle for this long, disconnect it." labelFor="bridgeConfigConnectedIdle">
      <InputGroup id="bridgeConfigConnectedIdle" defaultValue={bridge.connectedIdleTimeout.toString()} onBlur={ev => bridge.connectedIdleTimeout = +ev.currentTarget.value} />
    </FormGroup>
    <FormGroup label="Disconnected Idle Timeout" helperText="If no clients are connected for this long, go to sleep." labelFor="bridgeConfigDisconnectedIdle">
      <InputGroup id="bridgeConfigDisconnectedIdle" defaultValue={bridge.disconnectedIdleTimeout.toString()} onBlur={ev => bridge.disconnectedIdleTimeout = +ev.currentTarget.value} />
    </FormGroup>
    {<FormGroup label="Update Firmware" helperText="Upload new firmware to the bridge." labelFor="bridgeFirmware">
      <FileInput fill={true} id="bridgeFirmware" />
    </FormGroup>}
    <ControlGroup style={{ justifyContent: 'flex-end' }}>
      <Button onClick={() => bridge.sleep()}>Sleep</Button>
      <Button onClick={() => bridge.restart()}>Restart</Button>
      <Button onClick={() => setResetConfigAlertOpen(true)} intent={Intent.DANGER}>Reset Config</Button>
    </ControlGroup>
    <Alert
      cancelButtonText="Cancel"
      canEscapeKeyCancel={true}
      confirmButtonText="Reset Config"
      intent={Intent.DANGER}
      isOpen={resetConfigAlertOpen}
      onConfirm={() => bridge.restart(true)}
      onClose={() => setResetConfigAlertOpen(false)}
    >
      <p>
        Are you sure you want to reset the config for <b>{bridge.name}</b>?
      </p>
    </Alert>
  </Card>;
}

export function BridgeSettings({ bridge }: { bridge: WebBluetoothCommunicationsInterface }) {
  const [selectedTab, setSelectedTab] = useState<TabId>('devices');
  const [scanState, setScanState] = useState<ScanState>(bridge.scanning);
  const [showAllResults, setShowAllResults] = useState<boolean>(false);
  const [hasHiddenResults, setHasHiddenResults] = useState<boolean>(false);
  const [pairedDevice, setPairedDevice] = useState<PairedDevice | null>(bridge.pairedDevice);

  return <>
    <div className="cell">
      <Tabs selectedTabId={selectedTab} onChange={newTab => setSelectedTab(newTab)}>
        <Tab id="devices" title="Connect X1" panel={<DevicesPanel bridge={bridge} setScanState={setScanState} showAllResults={showAllResults} setHasHiddenResults={setHasHiddenResults} pairedDevice={pairedDevice} setPairedDevice={setPairedDevice} />} />
        <Tab id="settings" title="Settings" panel={<SettingsPanel bridge={bridge} />} />
        <Expander />
        <ControlGroup style={{ alignItems: 'center' }}>
          <Switch checked={showAllResults} onChange={ev => setShowAllResults(ev.currentTarget.checked)} disabled={selectedTab !== 'devices' || !hasHiddenResults} inline={true} alignIndicator={Alignment.RIGHT} style={{ marginBottom: 0, marginRight: 20 }}>Show All</Switch>
          <Button disabled={selectedTab !== 'devices' || scanState !== ScanState.NotScanning} loading={scanState === ScanState.Scanning} onClick={() => bridge.beginScanning()} minimal={false} icon="refresh" />
        </ControlGroup>
      </Tabs>
    </div>
  </>;
}
