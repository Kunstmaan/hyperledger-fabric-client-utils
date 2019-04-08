import setUserContext  from '../utils/setUserContext';
import getLogger  from '../utils/getLogger';
import registerEventListener  from '../utils/registerEventListener';
import createChannel  from '../utils/createChannel';
import FabricClient from 'fabric-client';

interface Options<Payload>{
    fabricClient: FabricClient;
    peer: Peer;
    channelId: string;
    chaincode: string;
    eventId: string;
    onEvent: (eventId: string, payload?: Payload) => void;
    onDisconnect: (error: Error, eventId: string) => void;
    timeoutForReconnect?: number;
    maxReconnects?: number;
    fullBlock?: boolean;
    startBlock?: number;
    endBlock?: number;
    unregister?: boolean;
    disconnect?: boolean;
}

const logger = getLogger('libs/registerChaincodeEventListener');

export default async function registerChaincodeEventListener<Payload extends object = {}>({
    fabricClient,
    peer,
    channelId,
    chaincode,
    eventId,
    onEvent,
    onDisconnect,
    timeoutForReconnect,
    maxReconnects,
    fullBlock,
    startBlock,
    endBlock,
    unregister,
    disconnect
}: Options<Payload | string>) {
    await setUserContext(fabricClient, peer.adminUserId);

    const channel = await createChannel({
        fabricClient,
        channelId,
        peers: [peer]
    });

    const channelPeer = channel.getPeers()[0];

    return registerEventListener({
        channel,
        peer: channelPeer.getPeer(),
        type: 'Chaincode',
        args: [chaincode, eventId],
        onEvent: ({event}) => {
            if (event.event_name === eventId) {
                logger.info(`Event received for ${eventId}`);
                logger.debug(event);
                // filtered block events don't give the payload
                let {payload} = event;
                if (typeof payload !== 'undefined' && Buffer.isBuffer(payload)) {
                    let parsedPayload: Payload | string = null;
                    try {
                        parsedPayload = JSON.parse(payload.toString('utf8'));
                    } catch (e) {
                        // Not a json object
                        parsedPayload = payload.toString('utf8') as string;
                    }
                    logger.info(`Event payload ${JSON.stringify(payload)}`);
                    return  onEvent(eventId, parsedPayload);
                }
                onEvent(eventId);
            }
        },
        onDisconnect: (error) => {
            onDisconnect(error, eventId);
        },
        timeoutForReconnect,
        maxReconnects,
        fullBlock,
        startBlock,
        endBlock,
        unregister,
        disconnect
    });
};
