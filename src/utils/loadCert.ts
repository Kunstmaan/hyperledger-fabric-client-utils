import fs from 'fs';
import getLogger  from './logger';

const logger = getLogger('fabric/loadCert');

interface CertOptions {

}

export default function loadCert(certPath: string, certOptions: CertOptions = {}) {
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
