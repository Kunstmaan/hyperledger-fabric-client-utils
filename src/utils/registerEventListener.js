const logger = require('./logger').getLogger('utils/registerEventListener');

module.exports = function registerEventListener({
    channel,
    peer,
    type,
    args,
    onEvent,
    onDisconnect,
    timeoutForReconnect = 10 * 1000, // every 10 seconds
    maxReconnects = undefined,
    fullBlock = true,
    startBlock,
    endBlock,
    unregister,
    disconnect
}) {
    let regId = null;
    // Listening for requests and keep requests in sync
    logger.info(`Setting up event hub for ${type} with arguments ${JSON.stringify(args)}`);

    try {
        const eventHub = channel.newChannelEventHub(peer);
        let reconnects = 0;

        const startListening = () => {
            eventHub.connect({
                full_block: fullBlock
            });
            regId = eventHub[`register${type}Event`].apply(eventHub, [
                ...args,
                ...[
                    onEvent,
                    async (error) => {
                        logger.warn(`Private Eventhub disconnected, trying to reconnect ${error}`);

                        const willReconnect = (typeof maxReconnects === 'undefined' || reconnects <= maxReconnects);

                        if (typeof onDisconnect === 'function') {
                            await onDisconnect(error, willReconnect);
                        }

                        // this is the callback if something goes wrong with the event registration or processing
                        if (willReconnect) {
                            logger.info(`The event hub was disconnected, retrying (attempt: ${reconnects})`);
                            setTimeout(startListening, timeoutForReconnect);
                        }

                        reconnects += 1;
                    },
                    {
                        startBlock, endBlock, unregister, disconnect
                    }
                ]
            ]);

            logger.info(`Start listening for ${type} with arguments ${JSON.stringify(args)}, regId = ${regId}`);
        };

        startListening();

        return {
            disconnect: eventHub.disconnect.bind(eventHub),
            // @deprecated, renamed to disconnect to be consistent with HFL API
            stopListening: eventHub.disconnect.bind(eventHub)
        };
    } catch (err) {
        logger.error(err);
        throw new Error(`Failed to initialize event listener for event ${type} with arguments ${JSON.stringify(args)}`);
    }
};
