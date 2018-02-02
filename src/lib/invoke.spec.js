const createFabricClient = require('./createFabricClient');
const invoke = require('./invoke');
const query = require('./query');
const testSetup = require('../../test/testSetup');
const {
    keyStorePath, channelId, peer, chaincodeId, userId, orderer
} = require('../../test/config');

beforeAll(testSetup);

test('Can create a car', async () => {
    const randomId = `CAR${Math.floor(Math.random() * 1000000)}`;
    const fabricClient = await createFabricClient(keyStorePath);
    await invoke({
        fabricClient,
        channelId,
        chaincode: {
            id: chaincodeId,
            fcn: 'createCar',
            args: [randomId, 'Porsche', 'Cayenne', 'Black', 'Ronny']
        },
        peers: [peer],
        orderer,
        userId
    });
    const fabricClientQuery = await createFabricClient(keyStorePath);
    const newCar = await query({
        fabricClient: fabricClientQuery,
        channelId,
        chaincode: {
            id: chaincodeId,
            fcn: 'queryCar',
            args: [randomId]
        },
        peer,
        userId
    });
    expect(newCar).toEqual({
        color: 'Black', make: 'Porsche', model: 'Cayenne', owner: 'Ronny'
    });
});
