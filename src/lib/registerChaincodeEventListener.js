const setUserContext = require('../utils/setUserContext');
const logger = require('../utils/logger').getLogger('libs/registerChaincodeEventListener');
const registerEventListener = require('../utils/registerEventListener');
const createChannel = require('../utils/createChannel');

module.exports = async function registerChaincodeEventListener({
    fabricClient,
    peer,
    channelId,
    chaincode,
    eventId,
    onEvent,
    onDisconnect,
    timeoutForReconnect,
    maxReconnects,
    startBlock,
    endBlock,
    unregister,
    disconnect
}) {
    await setUserContext(fabricClient, peer.adminUserId);

    const channel = await createChannel({
        fabricClient,
        channelId,
        peers: [peer]
    });

    return registerEventListener({
        channel,
        peer: channel.getPeers()[0],
        type: 'Chaincode',
        args: [chaincode, eventId],
        onEvent: (event) => {
            if (event.event_name === eventId) {
                logger.info(`Event received for ${eventId}`);
                logger.debug(event);
                const payload = JSON.parse(event.payload.toString('utf8'));
                logger.info(`Event payload ${JSON.stringify(payload)}`);
                onEvent(payload, eventId);
            }
        },
        onDisconnect: (error) => {
            onDisconnect(error, eventId);
        },
        timeoutForReconnect,
        maxReconnects,
        startBlock,
        endBlock,
        unregister,
        disconnect
    });
};
