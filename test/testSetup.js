
const {
    keyStorePath, channelId, peer, orderer, adminUserId, chaincodeId
} = require('./config');
const {invoke, createFabricClient} = require('../src/index');

async function initLedger() {
    try {
        const fabricClient = await createFabricClient(keyStorePath);
        await invoke({
            fabricClient,
            channelId,
            chaincode: {
                id: chaincodeId,
                fcn: 'initLedger'
            },
            peers: [peer],
            orderer,
            userId: adminUserId
        });
        console.log('Init ledger succeeded');
    } catch (err) {
        console.log(`Init ledger failed ${JSON.stringify(err)}`);
        throw err;
    }
}

module.exports = async function setup(done) {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000; // 30sec

    await initLedger();
    done();
};
