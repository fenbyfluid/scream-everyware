import { Device, PulseWidthSwitch } from './X1';
import { MockSerialPort } from './MockSerialPort';
import { WebSerialCommunicationsInterface } from './WebSerialCommunicationsInterface';
import { MockDevice } from './MockDevice';

test('get variable', async () => {
  const mock = new MockDevice();

  const device = new Device(mock);
  expect(await device.getFirmwareVersion()).toBe(20);
});

test('get variable serial', async () => {
  const port = new MockSerialPort();

  const communicationsInterface = new WebSerialCommunicationsInterface();
  await communicationsInterface.open(port);

  const device = new Device(communicationsInterface);

  const firmwareVersionPromise = device.getFirmwareVersion();
  await port.writeBytesForTest(['s', 20, '\n']);
  expect(await firmwareVersionPromise).toBe(20);

  expect(port.testBytesWritten).toEqual(MockSerialPort.ParseTestBytes([
    'Gs\n',
  ]));
});

test('get variable twice serial', async () => {
  const port = new MockSerialPort();

  const communicationsInterface = new WebSerialCommunicationsInterface();
  await communicationsInterface.open(port);

  const device = new Device(communicationsInterface);

  const firmwareVersionPromiseOne = device.getFirmwareVersion();
  await port.writeBytesForTest(['s', 20, '\n']);
  expect(await firmwareVersionPromiseOne).toBe(20);

  const firmwareVersionPromiseTwo = device.getFirmwareVersion();
  await port.writeBytesForTest(['s', 40, '\n']);
  expect(await firmwareVersionPromiseTwo).toBe(40);

  expect(port.testBytesWritten).toEqual(MockSerialPort.ParseTestBytes([
    'Gs\n',
    'Gs\n',
  ]));
});

test('set variable', async () => {
  const mock = new MockDevice();

  const device = new Device(mock);
  expect(await device.getSwitchMode(PulseWidthSwitch.Short)).toBe(0);

  await device.setSwitchMode(PulseWidthSwitch.Short, 1);
  expect(await device.getSwitchMode(PulseWidthSwitch.Short)).toBe(1);
});

test('set variable serial', async () => {
  const port = new MockSerialPort();

  const communicationsInterface = new WebSerialCommunicationsInterface();
  await communicationsInterface.open(port);

  const device = new Device(communicationsInterface);

  await device.setSwitchMode(PulseWidthSwitch.Short, 1);

  expect(port.testBytesWritten).toEqual(MockSerialPort.ParseTestBytes([
    '1', 1, '\n',
  ]));
});

test('streaming variable changes', async () => {
  const mock = new MockDevice();
  await mock.setPulseRateKnob(10);

  const device = new Device(mock);

  await device.watchVariables(true);

  expect(await device.getPulseRateKnobValue()).toBe(10);

  await mock.setPulseRateKnob(20);

  expect(await device.getPulseRateKnobValue()).toBe(20);
});

test('streaming variable changes serial', async () => {
  const port = new MockSerialPort();

  const communicationsInterface = new WebSerialCommunicationsInterface();
  await communicationsInterface.open(port);

  const device = new Device(communicationsInterface);

  await device.watchVariables(true);

  // Send initial value
  await port.writeBytesForTest(['f', 0, '\n']);

  await port.writeBytesForTest(['f', 10, '\n']);
  expect(await device.getPulseRateKnobValue()).toBe(10);

  await port.writeBytesForTest(['f', 20, '\n']);
  expect(await device.getPulseRateKnobValue()).toBe(20);

  expect(port.testBytesWritten).toEqual(MockSerialPort.ParseTestBytes([
    'E+\n',
  ]));
});

test('can read non-streamed variable while streaming', async () => {
  const mock = new MockDevice();
  await mock.setOutputPercentage(0.2);

  const device = new Device(mock);
  await device.watchVariables(true);

  expect(await device.getOutputPercentage()).toBeCloseTo(0.2);
});

test('can read non-streamed variable while streaming serial', async () => {
  const port = new MockSerialPort();

  const communicationsInterface = new WebSerialCommunicationsInterface();
  await communicationsInterface.open(port);

  const device = new Device(communicationsInterface);
  await device.watchVariables(true);

  const outputPercentagePromise = device.getOutputPercentage();
  await port.writeBytesForTest(['v', 0.2 * 255, '\n']);
  expect(await outputPercentagePromise).toBeCloseTo(0.2);

  expect(port.testBytesWritten).toEqual(MockSerialPort.ParseTestBytes([
    'E+\n',
    'Gv\n',
  ]));
});
