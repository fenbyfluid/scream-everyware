import React, { useState } from 'react';
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
  Icon,
  Radio,
  RadioGroup,
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

enum ConnectionMode {
  Mock,
  Serial,
  Ble,
  WebSocket,
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

export function App() {
  const [connection, setConnection] = useState<ConnectionState>({ state: ConnectionStatus.Disconnected });
  const [connectionMode, setConnectionMode] = useState(ConnectionMode.Serial);

  const connect = async () => {
    if (connection.state !== ConnectionStatus.Disconnected) {
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
        {ConnectionStatus[connection.state]}{connection.state === ConnectionStatus.Error ? ` (${connection.error.message})` : undefined}
        <ControlGroup className="connection-buttons">
          <Button onClick={connect} disabled={connection.state !== ConnectionStatus.Disconnected}>Connect</Button>
          <Button onClick={disconnect} disabled={connection.state !== ConnectionStatus.Connected}>Disconnect</Button>
          {usingMockDevice ? <>
            <Expander />
            <Button icon="cog" onClick={() => setMockDeviceDialogOpen(true)} />
            <Drawer isOpen={mockDeviceDialogOpen} onClose={() => setMockDeviceDialogOpen(false)} size={DrawerSize.SMALL} title="Mock Device State">
              <div className={Classes.DRAWER_BODY}>
                <div className={Classes.DIALOG_BODY}>
                  <MockDeviceControls device={connection.device} mockDevice={connection.communicationsInterface} />
                </div>
              </div>
            </Drawer>
          </> : undefined}
        </ControlGroup>
      </Card>
      {connection.state === ConnectionStatus.Disconnected ? <Card elevation={Elevation.ONE} className="cell">
        <RadioGroup label="Connection Mode" onChange={ev => setConnectionMode(+ev.currentTarget.value)} selectedValue={connectionMode}>
          <Radio value={ConnectionMode.Mock} label="Mock" />
          <Radio value={ConnectionMode.Serial} label="Serial" />
          <Radio value={ConnectionMode.Ble} label="Bluetooth LE" />
          <Radio value={ConnectionMode.WebSocket} label="WebSocket" />
        </RadioGroup>
      </Card> : undefined}
      <ErrorBoundary>
        {connection.state === ConnectionStatus.Connected ? <DeviceStatus device={connection.device} /> : undefined}
      </ErrorBoundary>
    </div>
  );
}
