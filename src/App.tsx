import React, { useEffect, useState } from 'react';
import { WebSerialCommunicationsInterface } from './WebSerialCommunicationsInterface';
import { Device } from './X1';
import {
  Button,
  Callout,
  CalloutProps,
  Card,
  Classes,
  ControlGroup,
  Drawer,
  DrawerSize,
  Elevation,
  Expander,
  H2,
  Icon,
  Intent,
  Radio,
  RadioGroup,
} from '@blueprintjs/core';
import { ErrorBoundary } from './ErrorBoundary';
import { MockDevice } from './MockDevice';
import { DeviceStatus } from './DeviceStatus';
import { MockDeviceControls } from './MockDeviceControls';
import {
  WebBluetoothCommunicationsInterface,
  RequestDeviceOptions,
} from './WebBluetoothCommunicationsInterface';
import { BridgeBattery, BridgeSettings } from './BridgeSettings';

type SupportedCommunicationsInterfaces = WebSerialCommunicationsInterface | WebBluetoothCommunicationsInterface | MockDevice;

enum ConnectionStatus {
  InterfaceConnecting,
  InterfaceConnected,
  DeviceConnecting,
  DeviceConnected,
  Disconnecting,
  Disconnected,
  Error,
}

interface TransitionState {
  readonly state: ConnectionStatus.InterfaceConnecting| ConnectionStatus.DeviceConnecting | ConnectionStatus.Disconnecting;
}

interface DisconnectedState {
  readonly state: ConnectionStatus.Disconnected;
}

interface InterfaceConnectedState {
  readonly state: ConnectionStatus.InterfaceConnected;
  readonly communicationsInterface: SupportedCommunicationsInterfaces;
}

interface DeviceConnectedState {
  readonly state: ConnectionStatus.DeviceConnected;
  readonly communicationsInterface: SupportedCommunicationsInterfaces;
  readonly device: Device;
}

interface ErrorState {
  readonly state: ConnectionStatus.Error;
  readonly error: Error;
}

type ConnectionState = TransitionState | DisconnectedState | InterfaceConnectedState | DeviceConnectedState | ErrorState;

enum ConnectionMode {
  Mock,
  Serial,
  Ble,
  WebSocket,
}

function defaultConnectionModes(): Set<ConnectionMode> {
  const modes = new Set<ConnectionMode>();

  if (typeof window.navigator?.serial?.requestPort === 'function') {
    modes.add(ConnectionMode.Serial);
  }

  if (typeof window.navigator?.bluetooth?.requestDevice === 'function') {
    modes.add(ConnectionMode.Ble);
  }

  if (process.env.NODE_ENV !== 'production') {
    modes.add(ConnectionMode.Mock);
  }

  return modes;
}

function ConnectionModeHelpCallout({ mode, ...passThroughProps }: { mode: ConnectionMode | undefined } & CalloutProps) {
  switch (mode) {
    case ConnectionMode.Mock:
      return <Callout intent={Intent.PRIMARY} {...passThroughProps}>
        <p>"Connect" to a mock device for testing purposes.</p>
        <p>Use the <Icon icon="cog" /> button to configure the mock device once connected.</p>
      </Callout>;
    case ConnectionMode.Serial:
      return <Callout intent={Intent.PRIMARY} {...passThroughProps}>
        <p>Connect to an X1 device using Bluetooth Serial - same as the included software.</p>
        <p>You must pair the X1 to your device first, following the instructions in the user manual.</p>
      </Callout>;
    case ConnectionMode.Ble:
      return <Callout intent={Intent.PRIMARY} {...passThroughProps}>
        <p>Connect to an X1 device via an X1 Bridge module.</p>
        <p>The X1 Bridge is a BLE bridge for devices that do not support legacy Bluetooth Classic used by the X1.</p>
        {(process.env.REACT_APP_X1_BRIDGE_URL ?? '').length > 0 && <p>
          {/* eslint-disable-next-line */}
          <a target="_blank" rel="noopener" href={process.env.REACT_APP_X1_BRIDGE_URL}>Click here</a> to learn more about the X1 Bridge project.
        </p>}
      </Callout>;
    case ConnectionMode.WebSocket:
    case undefined:
      return <Callout intent={Intent.WARNING} {...passThroughProps}>
        <p>Your browser does not support any methods to connect to an X1 device.</p>
      </Callout>;
  }

  return null;
}

export function App() {
  const [connection, setConnection] = useState<ConnectionState>({ state: ConnectionStatus.Disconnected });
  const [enabledConnectionModes, setEnabledConnectionModes] = useState(defaultConnectionModes);
  const [connectionMode, setConnectionMode] = useState<ConnectionMode | undefined>(() => {
    const [defaultConnectionMode] = enabledConnectionModes;
    return defaultConnectionMode;
  });

  useEffect(() => {
    // @ts-ignore
    window.enableMockDevice = () => {
      setEnabledConnectionModes(modes => {
        return new Set([...modes.keys(), ConnectionMode.Mock]);
      });

      setConnectionMode(mode => {
        if (mode !== undefined) {
          return mode;
        }

        return ConnectionMode.Mock;
      });
    };

    return () => {
      // @ts-ignore
      delete window.enableMockDevice;
    };
  }, []);

  const connectDevice = async (communicationsInterface: SupportedCommunicationsInterfaces) => {
    setConnection({ state: ConnectionStatus.DeviceConnecting });

    const device = new Device(communicationsInterface);

    if (await device.getFirmwareVersion() !== 20) {
      if ('close' in communicationsInterface) {
        await communicationsInterface.close();
      }

      setConnection({
        state: ConnectionStatus.Error,
        error: new Error('Firmware version mismatch. Ensure the device is using version 2.0.'),
      });

      return;
    }

    await device.watchVariables(true);

    // @ts-ignore
    window.communicationsInterface = communicationsInterface;

    // @ts-ignore
    window.device = device;

    setConnection({
      state: ConnectionStatus.DeviceConnected,
      communicationsInterface,
      device,
    });
  };

  const connect = async () => {
    if (connection.state !== ConnectionStatus.Disconnected || connectionMode === undefined) {
      return;
    }

    setConnection({ state: ConnectionStatus.InterfaceConnecting });

    switch (connectionMode) {
      case ConnectionMode.Mock:
        const communicationsInterface = new MockDevice();

        await connectDevice(communicationsInterface);

        break;
      case ConnectionMode.Serial:
        try {
          const communicationsInterface = new WebSerialCommunicationsInterface();

          const port = await navigator.serial.requestPort();

          communicationsInterface.addEventListener('disconnected', () => {
            // TODO: Do we need to check the current state?
            setConnection({
              state: ConnectionStatus.Error,
              error: new Error('Device Disconnected'),
            });
          });

          await communicationsInterface.open(port);

          await connectDevice(communicationsInterface);
        } catch (e) {
          setConnection({
            state: ConnectionStatus.Error,
            error: (e instanceof Error) ? e : new Error('Unknown Error'),
          });
        }

        break;
      case ConnectionMode.Ble:
        try {
          const communicationsInterface = new WebBluetoothCommunicationsInterface();

          communicationsInterface.addEventListener('bt-connected', () => {
            connectDevice(communicationsInterface);
          });

          // TODO: Is this sane?
          communicationsInterface.addEventListener('bt-disconnected', () => {
            setConnection(connection => {
              if (connection.state !== ConnectionStatus.DeviceConnected) {
                return connection;
              }

              return {
                state: ConnectionStatus.InterfaceConnected,
                communicationsInterface: connection.communicationsInterface,
              };
            });
          });

          communicationsInterface.addEventListener('disconnected', () => {
            // TODO: Do we need to check the current state?
            setConnection({
              state: ConnectionStatus.Error,
              error: new Error('Bridge Disconnected'),
            });
          });

          const device = await navigator.bluetooth.requestDevice(RequestDeviceOptions);

          await communicationsInterface.open(device);

          // @ts-ignore
          window.communicationsInterface = communicationsInterface;

          setConnection({
            state: ConnectionStatus.InterfaceConnected,
            communicationsInterface,
          });
        } catch (e) {
          setConnection({
            state: ConnectionStatus.Error,
            error: (e instanceof Error) ? e : new Error('Unknown Error'),
          });
        }

        break;
      default:
        setConnection({
          state: ConnectionStatus.Error,
          error: new Error(`Connection mode ${ConnectionMode[connectionMode]} not implemented`),
        });
    }
  };

  const disconnect = async () => {
    if (connection.state !== ConnectionStatus.InterfaceConnected && connection.state !== ConnectionStatus.DeviceConnected) {
      return;
    }

    setConnection({ state: ConnectionStatus.Disconnecting });

    if (connection.state === ConnectionStatus.DeviceConnected) {
      await connection.device.watchVariables(false);
    }

    if ('close' in connection.communicationsInterface) {
      await connection.communicationsInterface.close();
    }

    setConnection({ state: ConnectionStatus.Disconnected });
  };

  const [mockDeviceDialogOpen, setMockDeviceDialogOpen] = useState(false);
  const usingMockDevice = connection.state === ConnectionStatus.DeviceConnected && 'getVariableValues' in connection.communicationsInterface;

  const usingBridgeDevice = (connection.state === ConnectionStatus.InterfaceConnected || connection.state === ConnectionStatus.DeviceConnected) && 'beginScanning' in connection.communicationsInterface;

  return (
    <div className="container">
      <H2 className="cell">
        <Icon icon="offline" size={32} color="#ff3366" style={{ marginRight: 10 }} />
        Scream Everyware</H2>
      <Card elevation={Elevation.ONE} className="cell">
        Connection State: {ConnectionStatus[connection.state].replace(/([a-z])([A-Z])/g, (_, a, b) => `${a} ${b}`)}
        <ControlGroup className="connection-buttons">
          <Button onClick={connect} disabled={connection.state !== ConnectionStatus.Disconnected || connectionMode === undefined} loading={connection.state === ConnectionStatus.InterfaceConnecting || connection.state === ConnectionStatus.DeviceConnecting}>Connect</Button>
          <Button onClick={disconnect} disabled={connection.state !== ConnectionStatus.InterfaceConnected && connection.state !== ConnectionStatus.DeviceConnected} loading={connection.state === ConnectionStatus.Disconnecting}>Disconnect</Button>
          <Expander />
          {usingMockDevice && <>
            <Button icon="cog" onClick={() => setMockDeviceDialogOpen(true)} />
            <Drawer isOpen={mockDeviceDialogOpen} onClose={() => setMockDeviceDialogOpen(false)} size={DrawerSize.SMALL} title="Mock Device State">
              <div className={Classes.DRAWER_BODY}>
                <div className={Classes.DIALOG_BODY}>
                  <MockDeviceControls device={connection.device} mockDevice={connection.communicationsInterface} />
                </div>
              </div>
            </Drawer>
          </>}
          {usingBridgeDevice && <>
              <BridgeBattery bridge={connection.communicationsInterface} />
          </>}
        </ControlGroup>
      </Card>
      {connection.state === ConnectionStatus.Error && <Callout intent={Intent.DANGER} icon={null} className={Classes.ELEVATION_1}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Icon intent={Intent.DANGER} size={20} icon="error" style={{ marginRight: 10 }} />
          <span>{connection.error.message}</span>
          <Expander />
          <Button intent={Intent.DANGER} outlined={true} onClick={() => setConnection({ state: ConnectionStatus.Disconnected })}>
            Try Again
          </Button>
        </div>
      </Callout>}
      {connection.state === ConnectionStatus.Disconnected && enabledConnectionModes.size > 1 && <Card elevation={Elevation.ONE} className="cell">
        <RadioGroup label="Connect Using" onChange={ev => setConnectionMode(+ev.currentTarget.value)} selectedValue={connectionMode}>
          {enabledConnectionModes.has(ConnectionMode.Mock) && <Radio value={ConnectionMode.Mock} label="Mock Device" />}
          {enabledConnectionModes.has(ConnectionMode.Serial) && <Radio value={ConnectionMode.Serial} label="Bluetooth Serial" />}
          {enabledConnectionModes.has(ConnectionMode.Ble) && <Radio value={ConnectionMode.Ble} label="X1 Bridge (via Bluetooth)" />}
          {enabledConnectionModes.has(ConnectionMode.WebSocket) && <Radio value={ConnectionMode.WebSocket} label="X1 Bridge (via Wi-Fi)" />}
        </RadioGroup>
      </Card>}
      {connection.state === ConnectionStatus.Disconnected && <div className="cell">
          <ConnectionModeHelpCallout mode={connectionMode} className={Classes.ELEVATION_1} />
      </div>}
      <ErrorBoundary>
        {usingBridgeDevice && connection.state === ConnectionStatus.InterfaceConnected && <BridgeSettings bridge={connection.communicationsInterface} />}
        {connection.state === ConnectionStatus.DeviceConnected && <DeviceStatus device={connection.device} />}
      </ErrorBoundary>
      <Expander />
      <div className={`footer cell ${Classes.TEXT_SMALL} ${Classes.TEXT_MUTED}`}>
        <p>
          Created with{' '}
          <a target="_blank" rel="noreferrer" href="https://blueprintjs.com">Blueprint</a>
          {' '}and{' '}
          <a target="_blank" rel="noreferrer" href="https://reactjs.org">React</a>
        </p>
        {(process.env.REACT_APP_GITHUB_REPO ?? '').length > 0 && <p>
          {/* eslint-disable-next-line */}
          <a target="_blank" rel="noopener" href={`https://github.com/${process.env.REACT_APP_GITHUB_REPO}`}>Fork me on GitHub</a>
        </p>}
      </div>
    </div>
  );
}
