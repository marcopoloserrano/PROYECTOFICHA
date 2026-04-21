const fs = require('fs');
const path = require('path');
const logFile = path.join(__dirname, 'crash_log.txt');

function log(msg) {
    fs.appendFileSync(logFile, msg + '\n');
    console.log(msg);
}

process.on('uncaughtException', (err) => {
    log('UNCAUGHT EXCEPTION: ' + err.stack);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    log('UNHANDLED REJECTION: ' + (reason.stack || reason));
    process.exit(1);
});

log('Starting server.js...');
require('./server.js');
