const setUserContext = require('../utils/setUserContext');
const loadCert = require('../utils/loadCert');
const logger = require('../logging/logger').getLogger('lib/registerChaincodeEventListener');
const isGrpcs = require('../utils/isGrpcs');
const createChannel = require('../utils/createChannel');

function setupEventHub(fabricClient, peer, orderer, channelId, callback) {
    return Promise.resolve()
        .then(() =>
            createChannel({
                fabricClient,
                channelId,
                peers: [peer],
                orderer
            }))
        .then(() => {
            if (!isGrpcs(peer.url)) {
                return Promise.resolve();
            }
            return loadCert(peer.certPath, peer.certOptions);
        })
        .then((peerCertOptions) => {
            const eventHub = fabricClient.newEventHub();
            eventHub.setPeerAddr(peer.broadcastUrl, peerCertOptions);

            return setUserContext(fabricClient, peer.adminUserId).then(() => {
                return eventHub;
            });
        })
        .then(callback)
        .catch((error) => {
            logger.error(error);
            process.exit(1);
        });
}

module.exports = function registerChaincodeEventListener({
    fabricClient,
    peer,
    orderer,
    channelId,
    chaincode,
    eventId,
    onEvent,
    onDisconnect,
    timeoutForReconnect = 10 * 1000 // every 10 seconds
}) {
    let regId = null;
    let eventHubMaster = null;
    // Listening for requests and keep requests in sync
    logger.info(`Setting up event hub for ${eventId} on ${chaincode}`);
    const eventHubPromise = setupEventHub(fabricClient, peer, orderer, channelId, (eventHub) => {
        eventHubMaster = eventHub;
        const startListening = () => {
            logger.info(`Start listening for ${eventId} on ${chaincode}`);
            eventHub.connect();
            regId = eventHub.registerChaincodeEvent(
                chaincode,
                eventId,
                (event) => {
                    if (event.event_name === eventId) {
                        logger.info(`Event received for ${eventId}`);
                        logger.debug(event);
                        const payload = JSON.parse(event.payload.toString('utf8'));
                        logger.info(`Event payload ${JSON.stringify(payload)}`);
                        onEvent(payload, eventId);
                    }
                },
                (error) => {
                    logger.warn(`Private Eventhub disconnected, trying to reconnect ${error}`);
                    Promise.resolve()
                        .then(() => {
                            return typeof onDisconnect === 'function' ? onDisconnect(error, eventId) : undefined;
                        })
                        .then(() => {
                            setTimeout(startListening, timeoutForReconnect);
                        });
                }
            );
        };

        startListening();
    });

    eventHubPromise.stopListening = function() {
        eventHubMaster.unregisterChaincodeEvent(regId);
    };

    return eventHubPromise;
};
