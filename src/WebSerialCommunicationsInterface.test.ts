import { VariableUpdate } from './X1';
import { WebSerialCommunicationsInterface } from './WebSerialCommunicationsInterface';
import { MockSerialPort } from './MockSerialPort';

test('write to serial port', async () => {
  const port = new MockSerialPort();

  const communicationsInterface = new WebSerialCommunicationsInterface();
  await communicationsInterface.open(port);

  await communicationsInterface.sendCommand(0x00, 0x00);
  expect(port.testBytesWritten).toEqual([
    0x00, 0x00, 0x0A,
  ]);
});

test('write to serial port twice', async () => {
  const port = new MockSerialPort();

  const communicationsInterface = new WebSerialCommunicationsInterface();
  await communicationsInterface.open(port);

  // We had an error where the first write wasn't unlocking, so the 2nd failed.
  await communicationsInterface.sendCommand(0x00, 0x01);
  await communicationsInterface.sendCommand(0x02, 0x03);
  expect(port.testBytesWritten).toEqual([
    0x00, 0x01, 0x0A,
    0x02, 0x03, 0x0A,
  ]);
});

test('read command from serial port', async () => {
  const port = new MockSerialPort();

  const communicationsInterface = new WebSerialCommunicationsInterface();
  await communicationsInterface.open(port);
  const messageGenerator = communicationsInterface.receiveMessages();

  await port.writeBytesForTest([0x01, 0x02, 0x0A]);
  let message = await messageGenerator.next();
  expect(message.value).toEqual<VariableUpdate>({ variable: 0x01, value: 0x02 });

  await port.close();
  message = await messageGenerator.next();
  expect(message.done).toBe(true);
});

test('read split command from serial port', async () => {
  const port = new MockSerialPort();

  const communicationsInterface = new WebSerialCommunicationsInterface();
  await communicationsInterface.open(port);
  const messageGenerator = communicationsInterface.receiveMessages();

  // ReadableStream isn't allowed to coalesce writes
  await port.writeBytesForTest([0x03]);
  await port.writeBytesForTest([0x04, 0x0A]);
  let message = await messageGenerator.next();
  expect(message.value).toEqual<VariableUpdate>({ variable: 0x03, value: 0x04 });

  await port.close();
  message = await messageGenerator.next();
  expect(message.done).toBe(true);
});

test('read string from serial port', async () => {
  const port = new MockSerialPort();

  const communicationsInterface = new WebSerialCommunicationsInterface();
  await communicationsInterface.open(port);
  const messageGenerator = communicationsInterface.receiveMessages();

  await port.writeBytesForTest(['hello\n']);
  let message = await messageGenerator.next();
  expect(message.value).toEqual('hello\n');

  await port.close();
  message = await messageGenerator.next();
  expect(message.done).toBe(true);
});

test('read split string from serial port', async () => {
  const port = new MockSerialPort();

  const communicationsInterface = new WebSerialCommunicationsInterface();
  await communicationsInterface.open(port);
  const messageGenerator = communicationsInterface.receiveMessages();

  await port.writeBytesForTest(['hello, ']);
  await port.writeBytesForTest(['world\n']);
  let message = await messageGenerator.next();
  expect(message.value).toEqual('hello, world\n');

  await port.close();
  message = await messageGenerator.next();
  expect(message.done).toBe(true);
});
