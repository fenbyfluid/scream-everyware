/** @var {?SerialPort} */
let port = null;

const knownVariables = {
    '63': 'Trigger Button ???', // 0x0F if trigger mode != manual, or trigger button pushed in manual mode
    '66': 'Pulse Rate', // 0x00 - 0xFF
    '6C': 'Input Voltage', // 0x7B = 123 = 12.3V
    '6D': 'Mode ???', // 0x0E Torment (LV), 0x00 Torment
    '70': 'Pulse Width', // 0x01 Short, 0x00 Normal, 0x03 Medium, 0x02 Long
    '72': 'Trigger Rate', // 0x00 - 0xFF
    '74': 'Trigger Mode', // 0x01 Cont, 0x00 Pulse, 0x03 Manual, 0x02 Mic
    '7A': 'Buzzer Mode', // 0x00 Always, 0x01 When Output
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
            let responseEnd = responseBuffer.indexOf(0x0A);
            if (responseEnd === -1) {
                break;
            }

            // 0x0A can appear in the response, if it's a 3-byte
            // (standard) response override the end position.
            if (responseBuffer[2] === 0x0A) {
                responseEnd = 2;
            }

            const response = responseBuffer.splice(0, responseEnd + 1);
            console.log('read ', formatBytes(response));
            // console.log('     ', response.map(b => (b >= 32 && b < 127) ? String.fromCharCode(b) : '.').join(''));

            const key = response[0].toString(16).padStart(2, '0').toUpperCase();
            let variable = document.querySelector(`#variables > dd[data-key="${key}"]`)

            if (!variable) {
                const variables = document.getElementById('variables');
                const variableKey = document.createElement('dt');
                variableKey.textContent = `0x${key} - ${knownVariables[key] || 'Unknown'}`;
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
