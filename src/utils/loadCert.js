const fs = require('fs');
const logger = require('./logger').getLogger('fabric/loadCert');

module.exports = function loadCert(certPath, certOptions = {}) {
    return new Promise((resolve, reject) => {
        logger.info(`Loading certificate for path: ${certPath}`);
        fs.readFile(certPath, 'utf8', (err, ordererCert) => {
            if (err) {
                reject(err);
                return;
            }
            resolve({
                ...certOptions,
                pem: ordererCert
            });
        });
    });
};
