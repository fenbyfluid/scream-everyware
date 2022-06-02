import { CommunicationsInterface, VariableUpdate } from './X1';
import { Deferred } from './Deferred';
import { TypedEventTarget } from './TypedEventTarget';

const uuids = {
  bridge_service: '00001000-7858-48fb-b797-8613e960da6a',
  serial_data: '00002001-7858-48fb-b797-8613e960da6a',
  bluetooth_scan: '00002002-7858-48fb-b797-8613e960da6a',
  bluetooth_connect: '00002003-7858-48fb-b797-8613e960da6a',
  config_name: '00002004-7858-48fb-b797-8613e960da6a',
  config_pin_code: '00002005-7858-48fb-b797-8613e960da6a',
  config_bt_addr: '00002006-7858-48fb-b797-8613e960da6a',
  config_con_idle: '0000200a-7858-48fb-b797-8613e960da6a',
  config_discon_idle: '0000200b-7858-48fb-b797-8613e960da6a',
  battery_voltage: '00002000-7858-48fb-b797-8613e960da6a',
  debug_log: '00002007-7858-48fb-b797-8613e960da6a',
  restart: '00002008-7858-48fb-b797-8613e960da6a',
  sleep: '0000200c-7858-48fb-b797-8613e960da6a',
  ota_update: '00002009-7858-48fb-b797-8613e960da6a',
};

export const RequestDeviceOptions = {
  filters: [{
    services: [
      uuids.bridge_service,
    ],
  }],
  optionalServices: [
    'battery_service',
  ],
};

export enum ScanState {
  NotScanning = 0x00,
  Scanning = 0x01,
  ScanningDisabled = 0xFF,
}

export interface PairedDevice {
  address: string;
  name: string;
}

export interface BtScanResult {
  address: string;
  name: string;
  rssi: number;
}

interface WebBluetoothCommunicationsInterfaceEventMap {
  'disconnected': CustomEvent<undefined>,
  'battery-level-changed': CustomEvent<undefined>,
  'bt-scan-changed': CustomEvent<undefined>;
  'bt-connected': CustomEvent<undefined>;
  'bt-connecting': CustomEvent<{ attempt: number, attempts: number }>;
  'bt-connection-failed': CustomEvent<undefined>;
  'bt-disconnected': CustomEvent<undefined>;
}

export class WebBluetoothCommunicationsInterface extends TypedEventTarget<WebBluetoothCommunicationsInterfaceEventMap> implements CommunicationsInterface {
  private server: BluetoothRemoteGATTServer | null = null;
  private service: BluetoothRemoteGATTService | null = null;
  private btScanCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private btConnectCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private pairedDeviceConfigCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private serialDataCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;

  private batteryLevel_: number = 100;
  public get batteryLevel(): number {
    return this.batteryLevel_;
  }

  private scanning_: ScanState = ScanState.NotScanning;
  public get scanning(): ScanState {
    return this.scanning_;
  }

  private scanResults_: Map<string, BtScanResult> = new Map();
  public get scanResults(): BtScanResult[] {
    return Array.from(this.scanResults_.values());
  }

  private pairedDeviceAddress_: string | null = null;
  private pairedDeviceName_: string | null = null;
  public get pairedDevice(): PairedDevice | null {
    return this.pairedDeviceAddress_ !== null ? {
      address: this.pairedDeviceAddress_,
      name: this.pairedDeviceName_ ?? '',
    } : null;
  }

  private name_: string | null = null;
  public get name(): string {
    return this.name_ ?? '';
  }
  public set name(name: string) {
    this.name_ = name;

    (async () => {
      const characteristic = await this.service!.getCharacteristic(uuids.config_name);

      const textEncoder = new TextEncoder();
      const value = textEncoder.encode(name);

      await characteristic.writeValue(value);
    })();
  }

  public set pinCode(pinCode: number) {
    (async () => {
      const characteristic = await this.service!.getCharacteristic(uuids.config_pin_code);

      const value = new DataView(new ArrayBuffer(Uint32Array.BYTES_PER_ELEMENT));
      value.setUint32(0, pinCode, true);

      await characteristic.writeValue(value);
    })();
  }

  private connectedIdleTimeout_: number | null = null;
  public get connectedIdleTimeout(): number {
    return this.connectedIdleTimeout_ ?? 0;
  }
  public set connectedIdleTimeout(connectedIdleTimeout: number) {
    this.connectedIdleTimeout_ = connectedIdleTimeout;

    (async () => {
      const characteristic = await this.service!.getCharacteristic(uuids.config_con_idle);

      const value = new DataView(new ArrayBuffer(Uint32Array.BYTES_PER_ELEMENT));
      value.setUint32(0, connectedIdleTimeout, true);

      await characteristic.writeValue(value);
    })();
  }

  private disconnectedIdleTimeout_: number | null = null;
  public get disconnectedIdleTimeout(): number {
    return this.disconnectedIdleTimeout_ ?? 0;
  }
  public set disconnectedIdleTimeout(disconnectedIdleTimeout: number) {
    this.disconnectedIdleTimeout_ = disconnectedIdleTimeout;

    (async () => {
      const characteristic = await this.service!.getCharacteristic(uuids.config_discon_idle);

      const value = new DataView(new ArrayBuffer(Uint32Array.BYTES_PER_ELEMENT));
      value.setUint32(0, disconnectedIdleTimeout, true);

      await characteristic.writeValue(value);
    })();
  }

  private connected_: boolean = false;
  public get connected(): boolean {
    return this.connected_;
  }

  async open(device: BluetoothDevice): Promise<void> {
    if (this.server !== null) {
      throw new Error('WebBluetoothCommunicationsInterface already open');
    }

    if (!device.gatt) {
      throw new Error('Bluetooth device missing GATT support');
    }

    device.addEventListener('gattserverdisconnected', () => {
      this.dispatchCustomEvent('disconnected');
    });

    this.server = await device.gatt.connect();

    const batteryService = await this.server.getPrimaryService('battery_service');
    const batteryLevelCharacteristic = await batteryService.getCharacteristic('battery_level');

    batteryLevelCharacteristic.addEventListener('characteristicvaluechanged', () => {
      const value = batteryLevelCharacteristic.value;
      if (value === undefined || value.byteLength < 1) {
        return;
      }

      const batteryLevel = value.getUint8(0);
      if (this.batteryLevel_ !== batteryLevel) {
        this.batteryLevel_ = batteryLevel;
        this.dispatchCustomEvent('battery-level-changed');
      }
    });

    await batteryLevelCharacteristic.startNotifications();
    await batteryLevelCharacteristic.readValue();

    this.service = await this.server.getPrimaryService(uuids.bridge_service);

    const debugLogCharacteristic = await this.service.getCharacteristic(uuids.debug_log);

    debugLogCharacteristic.addEventListener('characteristicvaluechanged', () => {
      const data = debugLogCharacteristic.value;
      if (!data) {
        return;
      }

      const textDecoder = new TextDecoder('utf-8', { fatal: true });
      console.log('bridge log message:', textDecoder.decode(data));
    });

    await debugLogCharacteristic.startNotifications();

    {
      const characteristic = await this.service!.getCharacteristic(uuids.config_name);
      const value = await characteristic.readValue();

      const textDecoder = new TextDecoder('utf-8', { fatal: true });
      this.name_ = textDecoder.decode(value);
    }

    {
      const characteristic = await this.service!.getCharacteristic(uuids.config_con_idle);
      const value = await characteristic.readValue();

      this.connectedIdleTimeout_ = value.getUint32(0, true);
    }

    {
      const characteristic = await this.service!.getCharacteristic(uuids.config_discon_idle);
      const value = await characteristic.readValue();

      this.disconnectedIdleTimeout_ = value.getUint32(0, true);
    }

    this.btScanCharacteristic = await this.service.getCharacteristic(uuids.bluetooth_scan);

    this.btScanCharacteristic.addEventListener('characteristicvaluechanged', async () => {
      const value = this.btScanCharacteristic?.value;
      if (!this.scanning_ || !value) {
        return;
      }

      if (value.byteLength < 7) {
        throw new Error('Malformed BT scan notification');
      }

      const address = [
        value.getUint8(0),
        value.getUint8(1),
        value.getUint8(2),
        value.getUint8(3),
        value.getUint8(4),
        value.getUint8(5),
      ].map(n => n.toString(16).padStart(2, '0')).join(':');

      const rssi = value.getInt8(6);

      const textDecoder = new TextDecoder('utf-8', { fatal: true });
      const name = textDecoder.decode(new Uint8Array(value.buffer, value.byteOffset + 7));

      if (address === '00:00:00:00:00:00') {
        this.scanning_ = ScanState.NotScanning;
        this.dispatchCustomEvent('bt-scan-changed');
        return;
      }

      this.scanResults_.set(address, {
        address,
        name,
        rssi,
      });

      this.dispatchCustomEvent('bt-scan-changed');
    });

    await this.btScanCharacteristic.startNotifications();
    this.scanning_ = (await this.btScanCharacteristic.readValue()).getUint8(0);

    this.btConnectCharacteristic = await this.service.getCharacteristic(uuids.bluetooth_connect);

    this.btConnectCharacteristic.addEventListener('characteristicvaluechanged', async () => {
      const value = this.btConnectCharacteristic?.value;
      if (!value || value.byteLength < 3) {
        return;
      }

      if (value.getUint8(0) === 1) {
        this.connected_ = true;
        this.dispatchCustomEvent('bt-connected');
        return;
      }

      if (value.getUint8(0) !== 0) {
        return;
      }

      if (this.connected_) {
        this.connected_ = false;
        this.dispatchCustomEvent('bt-disconnected');
        return;
      }

      const attempt = value.getUint8(1);
      const attempts = value.getUint8(2);

      if (attempts > 0) {
        this.dispatchCustomEvent('bt-connecting', { attempt, attempts });
        return;
      }

      this.dispatchCustomEvent('bt-connection-failed');
    });

    await this.btConnectCharacteristic.startNotifications();

    this.connected_ = (await this.btConnectCharacteristic.readValue()).getUint8(0) === 1;
    if (this.connected_) {
      this.dispatchCustomEvent('bt-connected');
    }

    this.pairedDeviceConfigCharacteristic = await this.service.getCharacteristic(uuids.config_bt_addr);

    const pairedDeviceValue = await this.pairedDeviceConfigCharacteristic.readValue();
    if (pairedDeviceValue.byteLength >= 6) {
      this.pairedDeviceAddress_ = [
        pairedDeviceValue.getUint8(0),
        pairedDeviceValue.getUint8(1),
        pairedDeviceValue.getUint8(2),
        pairedDeviceValue.getUint8(3),
        pairedDeviceValue.getUint8(4),
        pairedDeviceValue.getUint8(5),
      ].map(n => n.toString(16).padStart(2, '0')).join(':');

      const textDecoder = new TextDecoder('utf-8', { fatal: true });
      this.pairedDeviceName_ = textDecoder.decode(new Uint8Array(pairedDeviceValue.buffer, pairedDeviceValue.byteOffset + 6));
    }

    this.serialDataCharacteristic = await this.service.getCharacteristic(uuids.serial_data);
  }

  async close(): Promise<void> {
    if (this.server === null) {
      throw new Error('WebBluetoothCommunicationsInterface not open');
    }

    this.server.disconnect();
    this.server = null;
  }

  async beginScanning(): Promise<void> {
    if (!this.btScanCharacteristic) {
      throw new Error('not connected');
    }

    this.scanResults_.clear();
    await this.btScanCharacteristic.writeValue(new Uint8Array([0x01]));

    this.scanning_ = (await this.btScanCharacteristic.readValue()).getUint8(0);
    this.dispatchCustomEvent('bt-scan-changed');
  }

  async cancelScanning(): Promise<void> {
    if (!this.btScanCharacteristic) {
      throw new Error('not connected');
    }

    if (this.scanning_ !== ScanState.Scanning) {
      return;
    }

    // The notification will update our state variables.
    await this.btScanCharacteristic.writeValue(new Uint8Array([0x00]));
  }

  async setPairedDevice(device: PairedDevice | null): Promise<void> {
    if (!this.pairedDeviceConfigCharacteristic) {
      throw new Error('not connected');
    }

    if (!device) {
      await this.pairedDeviceConfigCharacteristic.writeValue(new ArrayBuffer(0));

      this.pairedDeviceAddress_ = null;
      this.pairedDeviceName_ = null;

      return;
    }

    const address = device.address
      .split(':', 6)
      .map(n => Number.parseInt(n, 16));

    const textEncoder = new TextEncoder();
    const name = textEncoder.encode(device.name);

    const value = new Uint8Array(address.length + name.byteLength);
    for (let i = 0; i < address.length; ++i) {
      value[i] = address[i];
    }
    for (let i = 0; i < name.byteLength; ++i) {
      value[i + address.length] = name[i];
    }

    await this.pairedDeviceConfigCharacteristic.writeValue(value);

    this.pairedDeviceAddress_ = device.address;
    this.pairedDeviceName_ = device.name;
  }

  async connect(): Promise<void> {
    if (!this.btConnectCharacteristic) {
      throw new Error('not connected');
    }

    // TODO: Check the current state.
    await this.btConnectCharacteristic.writeValue(new Uint8Array([0x01]));

    // TODO: Return a promise that resolves / rejects.
  }

  async sleep(): Promise<void> {
    if (!this.service) {
      throw new Error('not connected');
    }

    const characteristic = await this.service.getCharacteristic(uuids.sleep);

    await characteristic.writeValue(new ArrayBuffer(0));
  }

  async restart(resetConfig?: boolean): Promise<void> {
    if (!this.service) {
      throw new Error('not connected');
    }

    const characteristic = await this.service.getCharacteristic(uuids.restart);

    await characteristic.writeValue(new Uint8Array([resetConfig ? 0x01 : 0x00]));
  }

  async *receiveMessages(): AsyncGenerator<VariableUpdate | string, void, void> {
    if (!this.serialDataCharacteristic) {
      throw new Error('not connected');
    }

    const pendingMessages: (VariableUpdate | string | null)[] = [];
    let pendingMessageSemaphore: Deferred<void> = new Deferred();

    this.serialDataCharacteristic.addEventListener('characteristicvaluechanged', () => {
      const data = this.serialDataCharacteristic?.value;
      if (!data) {
        return;
      }

      if (data.byteLength === 3) {
        const message = {
          variable: data.getUint8(0),
          value: data.getUint8(1),
        };

        pendingMessages.push(message);
      } else {
        const textDecoder = new TextDecoder('utf-8', { fatal: true });
        const message = textDecoder.decode(data);

        pendingMessages.push(message);
      }

      pendingMessageSemaphore.resolve();
    });

    await this.serialDataCharacteristic.startNotifications();

    while (true) {
      await pendingMessageSemaphore.promise;
      pendingMessageSemaphore = new Deferred();

      while (true) {
        const message = pendingMessages.shift();
        if (message === undefined) {
          break;
        }

        if (message === null) {
          return;
        }

        yield message;
      }
    }
  }

  async sendCommand(command: number, argument: number): Promise<void> {
    if (!this.serialDataCharacteristic) {
      throw new Error('not connected');
    }

    const message = new Uint8Array([command, argument, 0x0A]);
    await this.serialDataCharacteristic.writeValue(message);
  }
}
