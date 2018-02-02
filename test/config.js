const path = require('path');

const keyStorePath = path.resolve(
    __dirname,
    '../node_modules/@kunstmaan/hyperledger-fabric-chaincode-dev-setup/dev-network/generated/hfc-key-store'
);

module.exports = {
    keyStorePath,
    chaincodeId: 'fabcar1',
    channelId: 'defaultchannel',
    peer: {
        url: 'grpc://localhost:7051',
        broadcastUrl: 'grpc://localhost:7053',
        adminUserId: 'admin'
    },
    orderer: {
        url: 'grpc://localhost:7050'
    },
    adminUserId: 'admin',
    userId: 'user-1'
};
