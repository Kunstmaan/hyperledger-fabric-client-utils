const invoke = require('./invoke');
const query = require('./query');
const logger = require('../logging/logger').getLogger('services/baseService');

module.exports = (
    chaincodeId,
    getServices = () => {},
    {
        channelId: defaultChannelId,
        peers: defaultPeers = [],
        orderer: defaultOrderer
    } = {}
) => {
    const setChaincodeOption = (chaincode) => {
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
        ({
            chaincode, channelId = defaultChannelId, peer = defaultPeers[0], userId
        }) => {
            const options = {
                chaincode: setChaincodeOption(chaincode),
                channelId,
                peer,
                userId
            };
            logger.info(`Query options: ${JSON.stringify(options)}`);
            return query(options);
        },
        ({
            chaincode, channelId = defaultChannelId, peers = defaultPeers, orderer = defaultOrderer, userId
        }) => {
            const options = {
                chaincode: setChaincodeOption(chaincode),
                channelId,
                peers,
                orderer,
                userId
            };
            logger.info(`Invoke options: ${JSON.stringify(options)}`);
            return invoke(options);
        }
    );

    return {
        getChaincodeId: () => chaincodeId,
        ...services
    };
};
