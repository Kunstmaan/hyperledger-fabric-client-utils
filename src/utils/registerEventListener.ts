import getLogger from './getLogger';
import FabricClient from 'fabric-client';

const logger = getLogger('utils/registerEventListener');

type EventData = {
    event?: FabricClient.ChaincodeEvent;
    blockNumber?: number;
    txId?: string;
    txStatus?: string;
    code?: string;
}

interface Options {
    channel: FabricClient.Channel;
    peer: FabricClient.Peer;
    type: 'Chaincode' | 'Tx';
    args: string[];
    onEvent: (data: EventData) => void;
    onDisconnect: (error: Error, willReconnect: boolean) => void;
    timeoutForReconnect?: number;
    maxReconnects?: number;
    fullBlock?: boolean;
    startBlock?: number;
    endBlock?: number;
    unregister?: boolean;
    disconnect?: boolean;
}

export default function registerEventListener({
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
}: Options) {
    let regId: string  = null;
    // Listening for requests and keep requests in sync
    logger.info(`Setting up event hub for ${type} with arguments ${JSON.stringify(args)}`);

    try {
        const eventHub = channel.newChannelEventHub(peer);
        let reconnects = 0;

        const startListening = () => {
            eventHub.connect(fullBlock);

            const onError = async (error: Error) => {
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
            };
            const options = {
                startBlock, endBlock, unregister, disconnect
            };

            switch (type) {
                case 'Chaincode':
                    eventHub.registerChaincodeEvent(
                        args[0], args[1],
                        (event, blockNumber, txId, txStatus) => onEvent({
                            event,
                            blockNumber,
                            txId,
                            txStatus,
                        }),
                        onError, options
                    );
                    break;
                case 'Tx':
                    regId = eventHub.registerTxEvent(args[0], (txId, code) => onEvent({
                        txId,
                        code,
                    }), onError, options);
            }

            logger.info(`Start listening for ${type} with arguments ${JSON.stringify(args)}, regId = ${regId}`);
        };

        startListening();

        const disconnectEventHub = eventHub.disconnect.bind(eventHub) as typeof eventHub.disconnect;
        return {
            disconnect: disconnectEventHub,
            // @deprecated, renamed to disconnect to be consistent with HFL API
            stopListening: disconnectEventHub
        };
    } catch (err) {
        logger.error(err);
        throw new Error(`Failed to initialize event listener for event ${type} with arguments ${JSON.stringify(args)}`);
    }
};
