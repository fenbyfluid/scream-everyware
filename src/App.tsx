import React, { useEffect, useState } from 'react';
import { WebSerialCommunicationsInterface } from './WebSerialCommunicationsInterface';
import { Device } from './X1';
import { Button } from '@blueprintjs/core';

enum ConnectionStatus {
  Connecting,
  Connected,
  Disconnecting,
  Disconnected,
  Error,
}

interface DisconnectedState {
  state: ConnectionStatus.Disconnected | ConnectionStatus.Connecting | ConnectionStatus.Disconnecting;
}

interface ConnectedState {
  state: ConnectionStatus.Connected;
  communicationsInterface: WebSerialCommunicationsInterface;
  device: Device;
}

interface ErrorState {
  state: ConnectionStatus.Error;
  error: Error;
}

type ConnectionState = DisconnectedState | ConnectedState | ErrorState;

interface WatcherProps {
  device: Device,
  getter: (waitForChange: boolean) => Promise<number>,
}

function Watcher({ device, getter }: WatcherProps) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let cancel: ((reason?: any) => void) | null = null;
    const cancelPromise = new Promise<number>((resolve, reject) => {
      cancel = reject;
    });

    (async () => {
      while (true) {
        try {
          const value = await Promise.race([getter.call(device, true), cancelPromise]);

          setValue(value);
        } catch (e) {
          break;
        }
      }
    })();

    return () => {
      cancel!();
    };
  }, [device, getter]);

  return <span>{value} (0x{value.toString(16).toUpperCase().padStart(2, '0')})</span>;
}

export function App() {
  let [connection, setConnection] = useState<ConnectionState>({ state: ConnectionStatus.Disconnected });

  const connect = async () => {
    if (connection.state !== ConnectionStatus.Disconnected) {
      return;
    }

    setConnection({ state: ConnectionStatus.Connecting });

    const port = (await navigator.serial.getPorts()).at(0) || (await navigator.serial.requestPort());

    const communicationsInterface = new WebSerialCommunicationsInterface();
    await communicationsInterface.open(port);

    const device = new Device(communicationsInterface);
    if (await device.getFirmwareVersion() !== 20) {
      await communicationsInterface.close();

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
    await connection.communicationsInterface.close();

    setConnection({ state: ConnectionStatus.Disconnected });
  };

  return (
    <div className="container">
      Connection State: {ConnectionStatus[connection.state]}
      <div>
        <Button type="button" onClick={connect} disabled={connection.state !== ConnectionStatus.Disconnected}>Connect</Button>
        <Button type="button" onClick={disconnect} disabled={connection.state !== ConnectionStatus.Connected}>Disconnect</Button>
      </div>
      <div>
        Pulse Rate Knob: {connection.state === ConnectionStatus.Connected ?
        <Watcher device={connection.device} getter={connection.device.getPulseRateKnobValue} /> : '---'}
      </div>
    </div>
  );
}
