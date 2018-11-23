const createFabricClient = require('../../dist/lib/createFabricClient').default;
const query = require('../../dist/lib/query').default;
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
        color: 'brown',
        make: 'Holden',
        model: 'Barina',
        owner: 'Shotaro'
    });
});

test('Querying a car that does not exists fails', async () => {
    const fabricClient = await createFabricClient(keyStorePath);

    try {
        await query({
            fabricClient,
            channelId,
            chaincode: {
                id: chaincodeId,
                fcn: 'queryCar',
                args: ['DOES_NOT_EXIST']
            },
            peer,
            userId
        });
        expect('Should have thrown an error').toBeFalsy();
    } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Error: DOES_NOT_EXIST does not exist: ');
    }
});
