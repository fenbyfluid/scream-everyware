import './BridgeSettings.css';
import {
  BtScanResult,
  PairedDevice,
  ScanState,
  WebBluetoothCommunicationsInterface,
} from './WebBluetoothCommunicationsInterface';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Alignment,
  Button,
  Card,
  Classes,
  ControlGroup,
  Dialog,
  Elevation,
  Expander,
  FileInput,
  FormGroup,
  Icon,
  InputGroup,
  Intent,
  Menu,
  MenuItem,
  ProgressBar,
  Switch,
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
  connecting: boolean | { attempt: number, attempts: number };
  setConnecting: React.Dispatch<React.SetStateAction<boolean | { attempt: number, attempts: number }>>;
  setScanState: React.Dispatch<React.SetStateAction<ScanState>>;
  showAllResults: boolean;
  setHasHiddenResults: React.Dispatch<React.SetStateAction<boolean>>;
  pairedDevice: PairedDevice | null;
  setPairedDevice: React.Dispatch<React.SetStateAction<PairedDevice | null>>;
}

function DevicesPanel({ bridge, connecting, setConnecting, setScanState, showAllResults, setHasHiddenResults, pairedDevice, setPairedDevice }: DevicesPanelProps) {
  const [scanResults, setScanResults] = useState<BtScanResult[]>([]);

  const connect = useCallback(() => {
    setConnecting(true);

    bridge.connect();
  }, [bridge, setConnecting]);

  const onScanChanged = useCallback(() => {
    setScanState(bridge.scanning);
    setScanResults(bridge.scanResults);
  }, [bridge, setScanState]);

  const onConnectionAttempt = useCallback((ev: CustomEvent<{ attempt: number, attempts: number }>) => {
    setConnecting(ev.detail);
  }, [setConnecting]);

  const onConnectionFailed = useCallback(() => {
    setConnecting(false);
  }, [setConnecting]);

  useEffect(() => {
    bridge.addEventListener('bt-scan-changed', onScanChanged);
    bridge.addEventListener('bt-connecting', onConnectionAttempt);
    bridge.addEventListener('bt-connection-failed', onConnectionFailed);

    return () => {
      bridge.removeEventListener('bt-scan-changed', onScanChanged);
      bridge.removeEventListener('bt-connecting', onConnectionAttempt);
      bridge.removeEventListener('bt-connection-failed', onConnectionFailed);
    };
  }, [bridge, onConnectionAttempt, onConnectionFailed, onScanChanged]);

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

    // TODO: This call is illegal - needs to be done from a useEffect hook?
    //       Cannot update a component (`BridgeSettings`) while rendering a different component (`DevicesPanel`).
    setHasHiddenResults(hasHiddenResults);

    return displayScanResults;
  }, [pairedDevice, initialPairedDevice, setHasHiddenResults, scanResults, showAllResults]);

  return <div>
      <Menu className={`${Classes.ELEVATION_1} bridge-device-menu`}>
      {displayScanResults.length > 0 ? displayScanResults.map(r => <MenuItem
        key={r.address}
        disabled={connecting !== false}
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
    <Button disabled={connecting !== false || pairedDevice === null} loading={connecting !== false} fill={true} intent={Intent.PRIMARY} onClick={connect}>Connect</Button>
    { typeof connecting === 'object' && <div className={`${Classes.TEXT_MUTED} ${Classes.TEXT_SMALL}`} style={{ textAlign: 'center', marginTop: 15 }}>Connection attempt {connecting.attempt} of {connecting.attempts}</div>}
  </div>;
}

interface FirmwareInfo {
  data: Uint8Array;
  signature: Uint8Array | null;
}

function FirmwareUpdate({ id, bridge }: { id: string, bridge: WebBluetoothCommunicationsInterface }) {
  const [updateProgress, setUpdateProgress] = useState<false | { done: true } | { done: false, progress: number }>(false);
  const [firmwareFile, setFirmwareFile] = useState<File | null>(null);
  const [firmwareInfo, setFirmwareInfo] = useState<FirmwareInfo | null>(null);
  const [signingKeyHex, setSigningKeyHex] = useState<string>('');
  const [signingKeyState, setSigningKeyState] = useState<'empty' | 'wrong-format' | 'wrong-key' | 'ok'>('empty');
  const [outOfBandSignature, setOutOfBandSignature] = useState<Uint8Array | null>(null);
  const canDismiss = updateProgress === false || updateProgress.done;

  useEffect(() => {
    setUpdateProgress(false);

    if (firmwareFile === null) {
      setFirmwareInfo(null);
      return;
    }

    firmwareFile.arrayBuffer().then(buffer => {
      const data = new Uint8Array(buffer);

      // TODO: Handle signed images.
      if (data[0] !== 0xE9) {
        throw new Error('Not a firmware file');
      }

      setFirmwareInfo({
        data,
        signature: null,
      });
    }).catch(e => {
      // TODO: Surface this.
      console.log(e);
    });
  }, [firmwareFile]);

  useEffect(() => {
    if (firmwareInfo === null || firmwareInfo.signature !== null) {
      setOutOfBandSignature(null);
      return;
    }

    if (signingKeyHex.length === 0) {
      setSigningKeyState('empty');
      return;
    }

    if (signingKeyHex.match(/^[0-9a-f]{64}$/i) === null) {
      setSigningKeyState('wrong-format');
      return;
    }

    bridge.getFirmwareSigningPublicKey().then(publicKey => {
      return window.crypto.subtle.exportKey('jwk', publicKey);
    }).then(publicJwk => {
      const signingKeyBase64Url = btoa(signingKeyHex.match(/../g)!
        .map(n => Number.parseInt(n, 16))
        .map(n => String.fromCharCode(n))
        .join(''))
        .replaceAll('+', '-')
        .replaceAll('/', '_')
        .replaceAll('=', '');

      const privateJwk = {
        ...publicJwk,
        d: signingKeyBase64Url,
        key_ops: [
          'sign',
        ],
      };

      return window.crypto.subtle.importKey('jwk', privateJwk, {
        name: 'ECDSA',
        namedCurve: 'P-256'
      }, true,[
        'sign',
      ]).catch(e => {
        console.log(e);
        setSigningKeyState('wrong-key');
        return null;
      });
    }).then(privateKey => {
      if (!privateKey) {
        return null;
      }

      setSigningKeyState('ok');

      return window.crypto.subtle.sign({
        'name': 'ECDSA',
        'hash': 'SHA-256',
      }, privateKey, firmwareInfo.data).then(signature => {
        // Convert the signature from IEEE P1363 format to ASN.1 format.
        const asn1 = new Uint8Array(signature.byteLength + 6);
        asn1.set([0x30, signature.byteLength + 4, 0x02, signature.byteLength / 2], 0);
        asn1.set(new Uint8Array(signature, 0, signature.byteLength / 2), 4);
        asn1.set([0x02, signature.byteLength / 2], (signature.byteLength / 2) + 4);
        asn1.set(new Uint8Array(signature, signature.byteLength / 2, signature.byteLength / 2), (signature.byteLength / 2) + 6);

        setOutOfBandSignature(asn1);
      });
    });
  }, [bridge, firmwareInfo, signingKeyHex]);

  const doUpdate = async () => {
    if (firmwareInfo === null) {
      return;
    }

    const signature = outOfBandSignature ?? firmwareInfo.signature;
    if (signature === null) {
      return;
    }

    const startTime = Date.now();

    setUpdateProgress({ done: false, progress: 0 });

    await bridge.updateFirmware(firmwareInfo.data, signature, percent => {
      setUpdateProgress({ done: false, progress: percent });
    });

    setUpdateProgress({ done: true });

    console.log('duration', (Date.now() - startTime) / 1000);
  };

  return <>
    <FileInput fill={true} id={id} hasSelection={firmwareFile !== null} onInputChange={ev => {
      const files = ev.currentTarget.files;
      if (files && files.length > 0) {
        setFirmwareFile(files.item(0));
      } else {
        setFirmwareFile(null);
      }
    }} text={firmwareFile !== null ? firmwareFile.name : undefined} />
    <Dialog canEscapeKeyClose={canDismiss} canOutsideClickClose={canDismiss} isCloseButtonShown={canDismiss} isOpen={firmwareFile !== null} title="Firmware Update">
      <div className={Classes.DIALOG_BODY}>
        {firmwareInfo === null ? <p>
          Reading firmware file ...
        </p> : <p>
          The firmware update will take approximately {(firmwareInfo.data.length / bridge.mtu / 40).toFixed(0)} seconds.
        </p>}
        {firmwareInfo !== null && firmwareInfo.signature === null && <>
            <FormGroup
                label="Enter the private key to sign the firmware."
                labelFor="signingKey"
                intent={{
                  'empty': undefined,
                  'wrong-format': Intent.WARNING,
                  'wrong-key': Intent.DANGER,
                  'ok': Intent.SUCCESS,
                }[signingKeyState]}
                helperText={{
                  'empty': undefined,
                  'wrong-format': 'Private key should be 64 hexadecimal characters.',
                  'wrong-key': 'Private key does not match installed firmware.',
                  'ok': 'Private key matches the installed firmware.',
                }[signingKeyState]}
            >
                <InputGroup id="signingKey" value={signingKeyHex} onChange={ev => setSigningKeyHex(ev.currentTarget.value)} />
            </FormGroup>
        </>}
        <ProgressBar intent={Intent.PRIMARY} className="firmware-update-progress" value={updateProgress !== false ? (!updateProgress.done ? updateProgress.progress : 1) : 0} animate={updateProgress !== false && !updateProgress.done} />
        The bridge will disconnect and restart when the update is complete.
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button disabled={!canDismiss} onClick={() => setFirmwareFile(null)}>Cancel</Button>
          <Button intent={Intent.DANGER} disabled={firmwareInfo === null || updateProgress !== false || (outOfBandSignature || firmwareInfo.signature) === null} loading={updateProgress !== false} onClick={() => doUpdate()}>Begin Update</Button>
        </div>
      </div>
    </Dialog>
  </>;
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
    {bridge.supportsOta && <FormGroup label="Update Firmware" helperText="Upload new firmware to the bridge." labelFor="bridgeFirmware">
      <FirmwareUpdate id="bridgeFirmware" bridge={bridge} />
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
  const [connecting, setConnecting] = useState<boolean | { attempt: number, attempts: number }>(false);
  const [scanState, setScanState] = useState<ScanState>(bridge.scanning);
  const [showAllResults, setShowAllResults] = useState<boolean>(false);
  const [hasHiddenResults, setHasHiddenResults] = useState<boolean>(false);
  const [pairedDevice, setPairedDevice] = useState<PairedDevice | null>(bridge.pairedDevice);

  return <>
    <div className="cell">
      <Tabs selectedTabId={selectedTab} onChange={newTab => setSelectedTab(newTab)}>
        <Tab id="devices" title="Connect X1" disabled={connecting !== false} panel={<DevicesPanel bridge={bridge} connecting={connecting} setConnecting={setConnecting} setScanState={setScanState} showAllResults={showAllResults} setHasHiddenResults={setHasHiddenResults} pairedDevice={pairedDevice} setPairedDevice={setPairedDevice} />} />
        <Tab id="settings" title="Settings" disabled={connecting !== false} panel={<SettingsPanel bridge={bridge} />} />
        <Expander />
        <ControlGroup style={{ alignItems: 'center' }}>
          <Switch checked={showAllResults} onChange={ev => setShowAllResults(ev.currentTarget.checked)} disabled={connecting !== false || selectedTab !== 'devices' || !hasHiddenResults} inline={true} alignIndicator={Alignment.RIGHT} style={{ marginBottom: 0, marginRight: 20 }}>Show All</Switch>
          <Button disabled={connecting !== false || selectedTab !== 'devices' || scanState !== ScanState.NotScanning} loading={scanState === ScanState.Scanning} onClick={() => bridge.beginScanning()} minimal={false} icon="refresh" title={scanState === ScanState.ScanningDisabled ? 'Restart bridge to enable scanning.' : undefined} />
        </ControlGroup>
      </Tabs>
    </div>
  </>;
}
