const setUserContext = require('./fabric/setUserContext');
const createFabricClient = require('./fabric/createFabricClient');
const serializeArg = require('./utils/serializeArg');
const logger = require('./logging/logger').getLogger('query');
const dropRightWhile = require('lodash.droprightwhile');
const parseErrorMessage = require('./fabric/parseErrorMessage');

module.exports = function query({
    chaincode,
    channelId,
    peer,
    userId
}) {
    return new Promise((resolve, reject) => {
        let fabricClient = null;
        let channel = null;

        Promise.resolve()
            .then(() => createFabricClient({peers: [peer], channelId}))
            .then(({fabricClient: _fabricClient, channel: _channel}) => {
                fabricClient = _fabricClient;
                channel = _channel;
            })
            .then(() => setUserContext(fabricClient, userId))
            .then(() => {
                const request = {
                    chaincodeId: chaincode.id,
                    fcn: chaincode.fcn,
                    args: chaincode.args ? dropRightWhile(chaincode.args.map(serializeArg), (arg) => typeof arg === 'undefined') : []
                };

                // send the query proposal to the peer
                return channel.queryByChaincode(request);
            })
            .then((queryResponses) => {
                logger.info('Query has completed, checking results');
                // query_responses could have more than one  results if there multiple peers were used as targets
                if (queryResponses && queryResponses.length === 1) {
                    if (queryResponses[0] instanceof Error) {
                        logger.error('error from query = ', queryResponses[0]);
                        reject(parseErrorMessage(queryResponses[0].message));
                    } else {
                        logger.info('Response is ', queryResponses[0].toString());
                        const response = queryResponses[0].toString();
                        try {
                            resolve(JSON.parse(response));
                        } catch (e) {
                            // Not a json object
                            resolve(response);
                        }
                    }
                } else {
                    logger.info('No payloads were returned from query');
                    reject(new Error('No payloads were returned from query'));
                }
            })
            .catch((err) => {
                logger.error(`Failed to query successfully: ${err}`);
                reject(err);
            });
    });
};
