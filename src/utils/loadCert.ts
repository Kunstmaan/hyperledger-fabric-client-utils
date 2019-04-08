import fs from 'fs';
import getLogger  from './getLogger';

const logger = getLogger('fabric/loadCert');

// TODO: Why pass cert options? furnction serves only as a proxy...
export default function loadCert(certPath: string, certOptions: CertOptions = {}): Promise<CertOptions & { pem: string}> {
    return new Promise((resolve, reject) => {
        logger.info(`Loading certificate for path: ${certPath}`);
        fs.readFile(certPath, 'utf8', (err, certContent) => {
            if (err) {
                reject(err);
                return;
            }
            resolve({
                ...certOptions,
                pem: certContent,
            });
        });
    });
};
