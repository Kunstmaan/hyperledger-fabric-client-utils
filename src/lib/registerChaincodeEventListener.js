const setUserContext = require('../utils/setUserContext');
const loadCert = require('../utils/loadCert');
const logger = require('../logging/logger').getLogger('lib/registerChaincodeEventListener');
const isGrpcs = require('../utils/isGrpcs');
const createChannel = require('../utils/createChannel');

function setupEventHub(fabricClient, peer, channelId) {
    return new Promise((resolve, reject) => {
        createChannel({
            fabricClient,
            channelId,
            peers: [peer]
        })
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
            .then((eventHub) => resolve(eventHub))
            .catch((error) => {
                logger.error(error);
                reject(error);
            });
    });
}

module.exports = async function registerChaincodeEventListener({
    fabricClient,
    peer,
    channelId,
    chaincode,
    eventId,
    onEvent,
    onDisconnect,
    timeoutForReconnect = 10 * 1000 // every 10 seconds
}) {
    let regId = null;
    // Listening for requests and keep requests in sync
    logger.info(`Setting up event hub for ${eventId} on ${chaincode}`);

    try {
        const eventHub = await setupEventHub(fabricClient, peer, channelId);
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

        const stopListening = function() {
            eventHub.unregisterChaincodeEvent(regId);
        };

        return {
            stopListening
        };
    } catch (err) {
        throw new Error(`Failed to initialize event listener for event ${eventId}`);
    }
};
