const loadOrdererCert = require('./loadOrdererCert');
const loadPeerCert = require('./loadPeerCert');
const FabricClient = require('fabric-client');
const {WALLET_PATH} = require('../../constants/fabric');
const logger = require('../logging/logger').getLogger('fabric/createFabricClient');

module.exports = function createFabricClient({
    peers = [],
    orderer = undefined,
    channelId
}) {
    const options = {
        walletPath: WALLET_PATH,
        channelId,
        ordererUrl: orderer ? orderer.url : undefined
    };

    const fabricClient = new FabricClient();
    const channel = fabricClient.newChannel(channelId);

    const registerPeersCertOnChannel = () => Promise.all(peers.map((peer) => {
        return new Promise((resolve, reject) => {
            loadPeerCert(peer)
                .then((certOptions) => {
                    channel.addPeer(fabricClient.newPeer(peer.url, certOptions));
                    resolve();
                })
                .catch(reject);
        });
    }));

    const registerOrdererCertOnChannel = () => new Promise((resolve, reject) => {
        if (orderer) {
            loadOrdererCert(orderer)
                .then((certOptions) => {
                    channel.addOrderer(fabricClient.newOrderer(options.ordererUrl, certOptions));
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
                logger.info('Create a fabric client and set the wallet location');
                return FabricClient.newDefaultKeyValueStore({path: options.walletPath});
            })
            .then((stateStore) => {
                logger.info('Set fabric client crypto suite');

                // assign the store to the fabric client
                fabricClient.setStateStore(stateStore);
                const cryptoSuite = FabricClient.newCryptoSuite();
                // use the same location for the state store (where the users' certificate are kept)
                // and the crypto store (where the users' keys are kept)
                const cryptoStore = FabricClient.newCryptoKeyStore({path: options.walletPath});
                cryptoSuite.setCryptoKeyStore(cryptoStore);
                fabricClient.setCryptoSuite(cryptoSuite);

                logger.info('Fabric client initialized');
                resolve({fabricClient, channel});
            })
            .catch((err) => {
                logger.error(`Failed to initialize channel: ${err.message}`);
                reject(err);
            });
    });
};
