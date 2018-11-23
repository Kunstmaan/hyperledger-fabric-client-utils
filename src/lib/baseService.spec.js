const baseService = require('../../dist/lib/baseService').default;
const testSetup = require('../../test/testSetup');
const {
    keyStorePath, channelId, peer, chaincodeId, orderer, userId: defaultUserId
} = require('../../test/config');

beforeAll(testSetup);

test('Can create a car from the base Service', async () => {
    const service = baseService(
        keyStorePath,
        chaincodeId,
        (query, invoke) => {
            return {
                createCar: (userId, {
                    id, make, model, color, owner
                }) => {
                    return invoke({
                        chaincode: {
                            fcn: 'createCar',
                            args: [id, make, model, color, owner]
                        },
                        userId
                    });
                },
                queryCar: (userId, id) => {
                    return query({
                        chaincode: {
                            fcn: 'queryCar',
                            args: [id]
                        },
                        userId
                    });
                }
            };
        },
        {
            channelId,
            peers: [peer],
            orderer
        }
    );

    const randomId = `CAR${Math.floor(Math.random() * 1000000)}`;

    await service.createCar(defaultUserId, {
        id: randomId,
        color: 'Black',
        make: 'Porsche',
        model: 'Cayenne',
        owner: 'Ronny'
    });

    const newCar = await service.queryCar(defaultUserId, randomId);
    expect(newCar).toEqual({
        color: 'Black',
        make: 'Porsche',
        model: 'Cayenne',
        owner: 'Ronny'
    });
});
