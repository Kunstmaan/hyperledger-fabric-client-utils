const loadCert = require('../utils/loadCert');
const logger = require('../logging/logger').getLogger('utils/createChannel');
const isGrpcs = require('../utils/isGrpcs');

module.exports = function createChannel({
    fabricClient,
    channelId,
    peers = [],
    orderer = undefined
}) {
    const ordererUrl = orderer ? orderer.url : undefined;

    const channel = fabricClient.newChannel(channelId);

    const registerPeersCertOnChannel = () => Promise.all(peers.map((peer) => {
        return new Promise((resolve, reject) => {
            if (!isGrpcs(peer.url)) {
                channel.addPeer(fabricClient.newPeer(peer.url));
                resolve();
                return;
            }
            loadCert(peer.certPath, peer.certOptions)
                .then((certOptions) => {
                    channel.addPeer(fabricClient.newPeer(peer.url, certOptions));
                    resolve();
                })
                .catch(reject);
        });
    }));

    const registerOrdererCertOnChannel = () => new Promise((resolve, reject) => {
        if (orderer) {
            if (!isGrpcs(orderer.url)) {
                channel.addOrderer(fabricClient.newOrderer(ordererUrl));
                resolve();
                return;
            }
            loadCert(orderer.certPath, orderer.certOptions)
                .then((certOptions) => {
                    channel.addOrderer(fabricClient.newOrderer(ordererUrl, certOptions));
                    resolve();
                })
                .catch(reject);
        } else {
            resolve();
        }
    });

    return new Promise((resolve, reject) => {
        Promise.resolve()
            .then(registerPeersCertOnChannel)
            .then(registerOrdererCertOnChannel)
            .then(() => {
                logger.info(`Channel ${channelId} initialized`);
                resolve(channel);
            })
            .catch((err) => {
                logger.error(`Failed to initialize channel ${channelId}: ${err.message}`);
                reject(err);
            });
    });
};
