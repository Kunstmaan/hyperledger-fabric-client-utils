const createFabricClient = require('./createFabricClient');
const setUserContext = require('./setUserContext');
const loadPeerCert = require('./loadPeerCert');
const logger = require('../logging/logger').getLogger('fabric/registerChaincodeEventListener');

function setupEventHub(peer, orderer, channelId, callback) {
    let fabricClient = null;

    return Promise.resolve()
        .then(() => createFabricClient({peers: [peer], orderer, channelId}))
        .then(({fabricClient: _fabricClient}) => {
            fabricClient = _fabricClient;
        })
        .then(() => loadPeerCert(peer))
        .then((peerCertOptions) => {
            const eventHub = fabricClient.newEventHub();
            eventHub.setPeerAddr(peer.broadcastUrl, peerCertOptions);

            return setUserContext(fabricClient, peer.adminUserId)
                .then(() => {
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
    peer,
    orderer,
    channel,
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
    const eventHubPromise = setupEventHub(peer, orderer, channel, (eventHub) => {
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
                }, (error) => {
                    logger.warn(`Private Eventhub disconnected, trying to reconnect ${error}`);
                    Promise.resolve().then(() => {
                        return typeof onDisconnect === 'function' ? onDisconnect(error, eventId) : undefined;
                    }).then(() => {
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
