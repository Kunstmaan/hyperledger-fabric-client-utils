const createFabricClient = require('./createFabricClient');
const query = require('./query');
const testSetup = require('../../test/testSetup');
const {
    keyStorePath, channelId, peer, chaincodeId, userId
} = require('../../test/config');

beforeAll(testSetup);

test('Can query a car', async () => {
    const fabricClient = await createFabricClient(keyStorePath);
    const result = await query({
        fabricClient,
        channelId,
        chaincode: {
            id: chaincodeId,
            fcn: 'queryCar',
            args: ['CAR0']
        },
        peer,
        userId
    });
    expect(result).toEqual({
        color: 'brown', make: 'Holden', model: 'Barina', owner: 'Shotaro'
    });
});
