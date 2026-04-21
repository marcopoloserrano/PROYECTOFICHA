const http = require('http');

const endpoints = [
    '/api/pacientes',
    '/api/especialidades',
    '/api/medicos',
    '/api/horarios',
    '/api/ausencias'
];

async function test() {
    for (const ep of endpoints) {
        console.log(`Testing ${ep}...`);
        try {
            await new Promise((resolve, reject) => {
                const req = http.get(`http://localhost:3000${ep}`, (res) => {
                    console.log(`Response for ${ep}: ${res.statusCode}`);
                    resolve();
                });
                req.on('error', reject);
            });
        } catch (e) {
            console.error(`FAILED ${ep}: ${e.message}`);
        }
    }
}

setTimeout(test, 2000); // Wait for server to start
