import React, { useEffect, useState } from 'react';
import { WebSerialCommunicationsInterface } from './WebSerialCommunicationsInterface';
import { Device } from './X1';
import {
  Button,
  Card,
  Classes,
  ControlGroup,
  Drawer,
  DrawerSize,
  Elevation,
  Expander,
  H2,
  CalloutProps,
  Icon,
  Radio,
  RadioGroup,
  Callout,
  Intent,
} from '@blueprintjs/core';
import { ErrorBoundary } from './ErrorBoundary';
import { MockDevice } from './MockDevice';
import { DeviceStatus } from './DeviceStatus';
import { MockDeviceControls } from './MockDeviceControls';

type SupportedCommunicationsInterfaces = MockDevice | WebSerialCommunicationsInterface;

enum ConnectionStatus {
  Connecting,
  Connected,
  Disconnecting,
  Disconnected,
  Error,
}

interface TransitionState {
  readonly state: ConnectionStatus.Connecting | ConnectionStatus.Disconnecting;
}

interface DisconnectedState {
  readonly state: ConnectionStatus.Disconnected;
}

interface ConnectedState {
  readonly state: ConnectionStatus.Connected;
  readonly communicationsInterface: SupportedCommunicationsInterfaces;
  readonly device: Device;
}

interface ErrorState {
  readonly state: ConnectionStatus.Error;
  readonly error: Error;
}

type ConnectionState = TransitionState | DisconnectedState | ConnectedState | ErrorState;

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

  if (process.env.NODE_ENV !== 'production') {
    modes.add(ConnectionMode.Mock);
  }

  return modes;
}

function ConnectionModeHelpCallout({ mode, ...passThroughProps }: { mode: ConnectionMode | undefined } & CalloutProps) {
  switch (mode) {
    case ConnectionMode.Mock:
      return <Callout intent={Intent.PRIMARY} {...passThroughProps}>
        "Connect" to a mock device for testing purposes.<br />
        Use the <Icon icon="cog" /> button to configure the mock device once connected.
      </Callout>;
    case ConnectionMode.Serial:
      return <Callout intent={Intent.PRIMARY} {...passThroughProps}>
        Connect to an X1 device using Bluetooth Serial - same as the included software.<br />
        You must pair the X1 to your device first, following the instructions in the user manual.
      </Callout>;
    case ConnectionMode.Ble:
    case ConnectionMode.WebSocket:
    case undefined:
      return <Callout intent={Intent.WARNING} {...passThroughProps}>
        Your browser does not support any methods to connect to an X1 device.
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

  const connect = async () => {
    if (connection.state !== ConnectionStatus.Disconnected || connectionMode === undefined) {
      return;
    }

    setConnection({ state: ConnectionStatus.Connecting });

    let communicationsInterface: SupportedCommunicationsInterfaces;

    if (connectionMode === ConnectionMode.Mock) {
      communicationsInterface = new MockDevice();
    } else if (connectionMode === ConnectionMode.Serial) {
      try {
        communicationsInterface = new WebSerialCommunicationsInterface();

        const port = await navigator.serial.requestPort();

        // TODO: Handle the port being closed unexpectedly.
        await communicationsInterface.open(port);
      } catch (e) {
        setConnection({
          state: ConnectionStatus.Error,
          error: (e instanceof Error) ? e : new Error('unknown error'),
        });

        return;
      }
    } else {
      setConnection({
        state: ConnectionStatus.Error,
        error: new Error(`Connection mode ${ConnectionMode[connectionMode]} not implemented`),
      });

      return;
    }

    const device = new Device(communicationsInterface);

    if (await device.getFirmwareVersion() !== 20) {
      if ('close' in communicationsInterface) {
        await communicationsInterface.close();
      }

      setConnection({
        state: ConnectionStatus.Error,
        error: new Error('firmware version mismatch'),
      });

      return;
    }

    await device.watchVariables(true);

    // @ts-ignore
    window.device = device;

    setConnection({
      state: ConnectionStatus.Connected,
      communicationsInterface,
      device,
    });
  };

  const disconnect = async () => {
    if (connection.state !== ConnectionStatus.Connected) {
      return;
    }

    setConnection({ state: ConnectionStatus.Disconnecting });

    await connection.device.watchVariables(false);

    if ('close' in connection.communicationsInterface) {
      await connection.communicationsInterface.close();
    }

    setConnection({ state: ConnectionStatus.Disconnected });
  };

  const [mockDeviceDialogOpen, setMockDeviceDialogOpen] = useState(false);
  const usingMockDevice = connection.state === ConnectionStatus.Connected && 'getVariableValues' in connection.communicationsInterface;

  return (
    <div className="container">
      <H2 className="cell">
        <Icon icon="offline" size={32} color="#ff3366" style={{ marginRight: 10 }} />
        Scream Everyware</H2>
      <Card elevation={Elevation.ONE} className="cell">
        Connection State:{' '}
        {ConnectionStatus[connection.state]}{connection.state === ConnectionStatus.Error && ` (${connection.error.message})`}
        <ControlGroup className="connection-buttons">
          <Button onClick={connect} disabled={connection.state !== ConnectionStatus.Disconnected || connectionMode === undefined}>Connect</Button>
          <Button onClick={disconnect} disabled={connection.state !== ConnectionStatus.Connected}>Disconnect</Button>
          {usingMockDevice && <>
            <Expander />
            <Button icon="cog" onClick={() => setMockDeviceDialogOpen(true)} />
            <Drawer isOpen={mockDeviceDialogOpen} onClose={() => setMockDeviceDialogOpen(false)} size={DrawerSize.SMALL} title="Mock Device State">
              <div className={Classes.DRAWER_BODY}>
                <div className={Classes.DIALOG_BODY}>
                  <MockDeviceControls device={connection.device} mockDevice={connection.communicationsInterface} />
                </div>
              </div>
            </Drawer>
          </>}
        </ControlGroup>
      </Card>
      {connection.state === ConnectionStatus.Disconnected && enabledConnectionModes.size > 1 && <Card elevation={Elevation.ONE} className="cell">
        <RadioGroup label="Connect Using" onChange={ev => setConnectionMode(+ev.currentTarget.value)} selectedValue={connectionMode}>
          {enabledConnectionModes.has(ConnectionMode.Mock) && <Radio value={ConnectionMode.Mock} label="Mock Device" />}
          {enabledConnectionModes.has(ConnectionMode.Serial) && <Radio value={ConnectionMode.Serial} label="Bluetooth Serial" />}
          {enabledConnectionModes.has(ConnectionMode.Ble) && <Radio value={ConnectionMode.Ble} label="X1 Bridge (Bluetooth)" />}
          {enabledConnectionModes.has(ConnectionMode.WebSocket) && <Radio value={ConnectionMode.WebSocket} label="X1 Bridge (WebSocket)" />}
        </RadioGroup>
      </Card>}
      {connection.state === ConnectionStatus.Disconnected && <div className="cell">
          <ConnectionModeHelpCallout mode={connectionMode} />
      </div>}
      <ErrorBoundary>
        {connection.state === ConnectionStatus.Connected && <DeviceStatus device={connection.device} />}
      </ErrorBoundary>
    </div>
  );
}
