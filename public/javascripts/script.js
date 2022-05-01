/** @var {?SerialPort} */
let port = null;

const modes = {
    0x00: 'Torment',
    0x01: 'Smooth Suffering',
    0x02: 'Bitch Training',
    0x03: 'Turbo Thruster',
    0x04: 'Random',
    0x05: 'Random Bitch',
    0x06: 'Purgatory',
    0x07: 'Purgatory Chaos',
    0x08: 'Persistent Pain',
    0x09: 'Pulse',
    0x0A: 'Ramp Pulse',
    0x0B: 'Ramp Repeat',
    0x0C: 'Ramp Intensity',
    0x0D: 'Audio Attack',
    0x0E: 'Torment (LV)',
    0x0F: 'Power Waves (LV)',
    0x10: 'Speed Waves',
    0x11: 'Demon Play',
    0x80: 'Extreme Torment',
    0x81: 'Extreme Bitch Training',
};

const knownVariables = {
    '1': 'Switch Mode Short',
    '2': 'Switch Mode Normal',
    '3': 'Switch Mode Medium',
    '4': 'Switch Mode Long',
    'c': 'Enabled Channels', // 0x01 Channel 1, 0x02 Channel 2, 0x04 Channel 3, 0x08 Channel 4
    'd': 'Count Down Timer', // Seconds Remaining
    'f': 'Pulse Rate', // 0x00 - 0xFF
    'i': 'Mode Info', // Purgatory Level
    'l': 'Input Voltage', // 0x7B = 123 = 12.3V
    'm': 'Mode',
    'p': 'Pulse Width', // 0x01 Short, 0x00 Normal, 0x03 Medium, 0x02 Long
    'r': 'Trigger Rate', // 0x00 - 0xFF
    's': 'Firmware Version', // Queried at connect, 0x14 = 20 = 2.0
    't': 'Trigger Mode', // 0x01 Cont, 0x00 Pulse, 0x03 Manual, 0x02 Mic
    'u': 'Unit Mode', // 0x00 Normal, 0x01 Extreme (Double Voltage)
    'v': 'Output Level', // Not sent automatically, can be queried
    'z': 'Buzzer Mode', // 0x00 Always, 0x01 When Output
};

/**
 * @param {ArrayLike<number>} bytes
 * @return {string}
 */
function formatBytes(bytes) {
    return Array.from(bytes)
        .map(byte => '0x' + byte.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');
}

for (const child of document.getElementById('commands').children) {
    if (child.tagName.toLowerCase() !== 'dd') {
        continue;
    }

    child.addEventListener('click', () => {
        document.getElementById('command').value = child.textContent;
    });
}

document.getElementById('start').addEventListener('click', async () => {
    const ports = await navigator.serial.getPorts();

    if (ports.length >= 1) {
        port = ports[0];
    } else {
        port = await navigator.serial.requestPort();
    }

    await port.open({
        baudRate: 115200,
    });

    console.log('serial port open');

    const reader = port.readable.getReader();

    /** @var {number[]} */
    const responseBuffer = [];

    const readAndPrint = async () => {
        const buffer = await reader.read();
        if (buffer.done) {
            console.log('read stream done');
            return;
        }

        responseBuffer.push(...buffer.value);

        for (;;) {
            if (responseBuffer.length < 3) {
                break;
            }

            // Messages are always >= 3 bytes, 0x0A can appear as the 2nd byte so skip it.
            let responseEnd = responseBuffer.indexOf(0x0A, 2);
            if (responseEnd === -1) {
                break;
            }

            const response = responseBuffer.splice(0, responseEnd + 1);
            console.log('read ', formatBytes(response));

            // Responses > 3 bytes are string messages.
            if (response.length > 3) {
                console.log('     ', response.map(b => (b >= 32 && b < 127) ? String.fromCharCode(b) : '.').join(''));
                break;
            }

            const key = String.fromCharCode(response[0]);
            let variable = document.querySelector(`#variables > dd[data-key="${key}"]`)

            if (!variable) {
                const variables = document.getElementById('variables');
                const variableKey = document.createElement('dt');
                variableKey.textContent = `${key} - ${knownVariables[key] || 'Unknown'}`;
                variables.appendChild(variableKey);
                variable = document.createElement('dd');
                variable.setAttribute('data-key', key);
                variables.appendChild(variable);
            }

            variable.textContent = formatBytes(response.slice(1, -1));
        }

        return readAndPrint();
    };

    return readAndPrint();
});

document.getElementById('send').addEventListener('click', async () => {
    if (!port || !port.writable) {
        return;
    }

    const command = document.getElementById('command').value
        .split(' ').map(byte => Number.parseInt(byte, 16));

    const writer = port.writable.getWriter();

    const buffer = new Uint8Array([...command, 0x0A]);
    console.log('write', formatBytes(buffer));
    await writer.write(buffer);

    await writer.close();
});
