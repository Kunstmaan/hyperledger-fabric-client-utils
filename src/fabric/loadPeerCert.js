const fs = require('fs');
const {CRYPTO_PATH} = require('../../constants/fabric');
const logger = require('../logging/logger').getLogger('fabric/loadPeerCert');

module.exports = function loadPeerCert(peer) {
    return new Promise((resolve, reject) => {
        logger.info(`Loading peer certificate for ${peer.cn}`);
        if (peer.url.indexOf('grpc://') === 0) {
            logger.info('Peer is running without TLS');
            resolve();
            return;
        }
        fs.readFile(`${CRYPTO_PATH}/${peer.org}/peers/${peer.cn}/tlsca.combined.${peer.cn}-cert.pem`, 'utf8', (err, peerCert) => {
            if (err) {
                reject(err);
                return;
            }
            resolve({
                pem: peerCert,
                'ssl-target-name-override': peer.cn
            });
        });
    });
};
