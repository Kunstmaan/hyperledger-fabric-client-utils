const setupDevEnv = require('@kunstmaan/hyperledger-fabric-chaincode-dev-setup');
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
        return true;
    } catch (err) {
        console.log(`Init ledger failed ${JSON.stringify(err)}`);
        return false;
    }
}

module.exports = async function setup(done) {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 5 * 60000; // 5min

    try {
        const initLedgerSucceeded = await initLedger();
        if (!initLedgerSucceeded) {
            // Suppose it's not running yet
            await setupDevEnv({});
            if (!await initLedger()) {
                console.error('Failed to initialize the ledger');
                process.exit(1);
            }
        }
        console.log('Dev env started');
        done();
    } catch (err) {
        console.error(`Dev env failed to start ${err.message}`);
        throw err;
    }
};
