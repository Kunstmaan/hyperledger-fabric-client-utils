import invoke from './invoke';
import query from './query';
import getLogger from '../utils/getLogger';
import createFabricClient from './createFabricClient';

interface Options {
    channelId?: string;
    peers?: Peer[];
    orderer?: Orderer;
}

interface QueryOptions {
    chaincode: Chaincode;
    userId: string;
    peer?: Peer;
    channelId?: string;
}

interface InvokeOptions {
    chaincode: Chaincode;
    userId: string;
    peers?: Peer[];
    channelId?: string;
    orderer?: Orderer;
}

type getServicesFunction<Services extends {[key: string]: Function}> = (
    query: (options: QueryOptions) => Promise<{} | string>,
    invoke: (options: InvokeOptions) => Promise<{} | string>
) => Services | {};

const logger = getLogger('lib/baseService');

export default function baseService<Services extends {[key: string]: Function}>(
    keyStorePath: string,
    chaincodeId: string,
    getServices: getServicesFunction<Services> = () => ({}),
    {
        channelId: defaultChannelId,
        peers: defaultPeers = [],
        orderer: defaultOrderer
    }: Options = {}
): {
    getChaincodeId: () => string;
} & Services {
    const setChaincodeOption = (chaincode: Chaincode) => {
        const updatedChaincode = {...chaincode};
        if (typeof chaincode.id !== 'string') {
            updatedChaincode.id = chaincodeId;
        }
        if (!Array.isArray(chaincode.args)) {
            updatedChaincode.args = [];
        }

        return updatedChaincode;
    };

    const services = getServices(
        async({
            chaincode, channelId = defaultChannelId, peer = defaultPeers[0], userId
        }: QueryOptions) => {
            const fabricClient = await createFabricClient(keyStorePath);
            const options = {
                chaincode: setChaincodeOption(chaincode),
                channelId,
                peer,
                userId
            };
            logger.info(`Query options: ${JSON.stringify(options)}`);
            return query({
                ...options,
                fabricClient
            });
        },
        async ({
            chaincode, channelId = defaultChannelId, peers = defaultPeers, orderer = defaultOrderer, userId
        }: InvokeOptions) => {
            const fabricClient = await createFabricClient(keyStorePath);
            const options = {
                chaincode: setChaincodeOption(chaincode),
                channelId,
                peers,
                orderer,
                userId
            };
            logger.info(`Invoke options: ${JSON.stringify(options)}`);
            return invoke({
                ...options,
                fabricClient
            });
        }
    );


    return {
        getChaincodeId: () => chaincodeId,
        ...(services as object),
    } as Services & { getChaincodeId: () => string };
};
