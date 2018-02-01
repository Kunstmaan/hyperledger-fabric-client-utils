const fs = require('fs');
const {CRYPTO_PATH} = require('../../constants/fabric');
const logger = require('../logging/logger').getLogger('fabric/loadOrdererCert');

module.exports = function loadOrdererCert(orderer) {
    return new Promise((resolve, reject) => {
        logger.info(`Loading orderer certificate for ${orderer.cn}`);
        if (orderer.url.indexOf('grpc://') === 0) {
            logger.info('Oderer is running without TLS');
            resolve();
            return;
        }
        fs.readFile(`${CRYPTO_PATH}/${orderer.org}/orderers/${orderer.cn}/tlsca.combined.${orderer.cn}-cert.pem`, 'utf8', (err, ordererCert) => {
            if (err) {
                reject(err);
                return;
            }
            resolve({
                pem: ordererCert,
                'ssl-target-name-override': orderer.cn
            });
        });
    });
};
