import FabricClient from 'fabric-client';
import dropRightWhileType from 'lodash.droprightwhile';
import setUserContext from '../utils/setUserContext';
import createChannel from '../utils/createChannel';
import serializeArg from '../utils/serializeArg';
import getLogger from '../utils/getLogger';
import parseErrorMessage from '../utils/parseErrorMessage';
const dropRightWhile = require('lodash.droprightwhile') as typeof dropRightWhileType;

interface Options {
    fabricClient: FabricClient;
    chaincode: Chaincode;
    channelId: string;
    peer: Peer;
    userId: string;
}

const logger = getLogger('lib/query');

export default function query<Response extends Object>({
    fabricClient, chaincode, channelId, peer, userId
}: Options): Promise<Response | string> {
    return new Promise((resolve, reject) => {
        let channel: FabricClient.Channel = null;

        Promise.resolve()
            .then(() =>
                createChannel({
                    fabricClient,
                    channelId,
                    peers: [peer]
                }))
            .then((_channel) => {
                channel = _channel;
            })
            .then(() => setUserContext(fabricClient, userId))
            .then(() => {
                const chaincodeArgs = chaincode.args
                    ? dropRightWhile(chaincode.args.map(serializeArg), (arg) => typeof arg === 'undefined')
                    : [];

                const request = {
                    chaincodeId: chaincode.id,
                    fcn: chaincode.fcn,
                    args: chaincodeArgs
                };

                logger.info(`Querying ${chaincode.fcn} on chaincode ${chaincode.id}/${channelId}`);
                logger.info(`- arguments: ${JSON.stringify(chaincodeArgs)}`);

                // send the query proposal to the peer
                return channel.queryByChaincode(request);
            })
            .then((queryResponses) => {
                logger.info('Query has completed, checking results');
                // query_responses could have more than one  results if there multiple peers were used as targets
                if (queryResponses && queryResponses.length === 1) {

                    if (queryResponses[0] instanceof Error) {
                        // TODO: not possible following typings?
                        const errorResponse = queryResponses[0] as Object as Error;
                        logger.error('error from query = ', errorResponse);
                        reject(parseErrorMessage(errorResponse.message));
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
