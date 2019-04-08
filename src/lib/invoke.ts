import * as util from 'util';
import dropRightWhileType from 'lodash.droprightwhile';
import {URL} from 'url';
import loadCert from '../utils/loadCert';
import setUserContext from '../utils/setUserContext';
import serializeArg from '../utils/serializeArg';
import parseErrorMessage from '../utils/parseErrorMessage';
import getLogger from '../utils/getLogger';
import isGrpcs from '../utils/isGrpcs';
import createChannel from '../utils/createChannel';
import registerEventListener from '../utils/registerEventListener';
import FabricClient from 'fabric-client';
const dropRightWhile = require('lodash.droprightwhile') as typeof dropRightWhileType;

interface Options {
    fabricClient: FabricClient;
    chaincode: Chaincode;
    channelId: string;
    peers?: Peer[];
    orderer: Orderer;
    userId: string;
    maxTimeout?: number;
}

interface EndorsmentResult {
    event_status: string;
    tx_id: string;
}

const logger = getLogger('lib/invoke');

const MAX_RETRIES_EVENT_HUB = 5;
const MAX_TIMEOUT = 30000;

export default function invoke({
    fabricClient,
    chaincode,
    channelId,
    peers = [],
    orderer,
    userId,
    maxTimeout = MAX_TIMEOUT
}: Options) {
    const peersMap: {[key: string]: Peer} = {};
    (peers || []).forEach((peer) => {
        const peerUrl = new URL(peer.url);
        peersMap[peerUrl.host.toLowerCase()] = peer;
    });
    const uniquePeers = Object.values(peersMap);

    if (uniquePeers.length === 0) {
        return Promise.reject(new Error('No endorser peers provided.'));
    }

    return new Promise((resolve, reject) => {
        let txId: FabricClient.TransactionId = null;
        let channel: FabricClient.Channel = null;
        Promise.resolve()
            .then(() => createChannel({
                fabricClient,
                channelId,
                peers: uniquePeers,
                orderer
            }))
            .then((_channel) => {
                channel = _channel;
            })
            .then(() => setUserContext(fabricClient, userId))
            .then(() => {
                // get a transaction id object based on the current user assigned to fabric client
                txId = fabricClient.newTransactionID();

                const chaincodeArgs = chaincode.args
                    ? dropRightWhile(chaincode.args.map(serializeArg), (arg) => typeof arg === 'undefined')
                    : [];

                const request = {
                    chaincodeId: chaincode.id,
                    fcn: chaincode.fcn,
                    args: chaincodeArgs,
                    txId
                };

                logger.info(`Invoking ${chaincode.fcn} on chaincode ${chaincode.id}/${channelId}`);
                logger.info(`- transaction id: ${txId.getTransactionID()}`);
                logger.debug(`- arguments: ${JSON.stringify(chaincodeArgs)}`); // only print this when debugging ... can be large
                if (uniquePeers && uniquePeers.length > 0) {
                    logger.info(`- endorsed by: ${uniquePeers.map((peer) => peer.url).join(', ')}`);
                }

                // send the transaction proposal to the peers
                return channel.sendTransactionProposal(request);
            })
            .then((results) => {
                let transactionProposalResponse: string | object = null;
                const proposalResponses = results[0];
                const proposal = results[1];

                // validate each proposal response separatly
                proposalResponses.forEach((proposalResponse: FabricClient.ProposalResponse & {message?: string}, index) => {
                    let error;
                    if (proposalResponse.response) {
                        const payload = proposalResponse.response.payload.toString();

                        try {
                            transactionProposalResponse = JSON.parse(payload);
                        } catch (e) {
                            // Not a json object
                            transactionProposalResponse = payload;
                        }

                        if (proposalResponse.response.status === 200) {
                            logger.info(`Transaction proposal ${index} was good`);

                            return;
                        }

                        error = new Error(`status: ${proposalResponse.response.status}, payload: "${payload}"`);
                    } else if (proposalResponse.message) {
                        error = parseErrorMessage(proposalResponse.message);
                    } else {
                        error = new Error('invalid response');
                    }

                    logger.error(`Transaction proposal ${index} was bad, ${error.message}`);
                    throw error;
                });

                // check if proposal responses are equal
                if (!channel.compareProposalResponseResults(proposalResponses)) {
                    const errorMessage = 'Proposal responses are not equal';
                    logger.error(errorMessage);

                    proposalResponses.forEach((proposalResponse, index) => {
                        const proposalPayload = proposalResponse.payload.toString();
                        logger.info(`Proposal response ${index}:`);
                        logger.info(proposalPayload);
                    });

                    throw new Error(errorMessage);
                }

                const peerForListening = uniquePeers[0];
                const waitForTransactionCompleted = (): Promise<{
                    transactionProposalResponse: string | object,
                    results: [FabricClient.BroadcastResponse, EndorsmentResult]
                }> => {
                    logger.info(util.format(
                        'Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s"',
                        proposalResponses[0].response.status,
                        proposalResponses[0].response.message
                    ));

                    // build up the request for the orderer to have the transaction committed
                    const request = {
                        proposalResponses,
                        proposal
                    };

                    // set the transaction listener and set a timeout
                    // if the transaction did not get committed within the timeout period,
                    // report a TIMEOUT status
                    const transactionIdString = txId.getTransactionID(); // Get the transaction ID string to be used by the event processing

                    const sendPromise = channel.sendTransaction(request);

                    // using resolve the promise so that result status may be processed
                    // under the then clause rather than having the catch clause process
                    // the status
                    const txPromise: Promise<EndorsmentResult> = new Promise((txPromiseResolve, txPromiseReject) => {
                        // In the next step we will setup an event listener to the network
                        // For this we need to use the admin user instead of the incoming user
                        // Otherwise we'll get a mismatch on the certificate
                        // See https://jira.hyperledger.org/browse/FAB-6101
                        setUserContext(fabricClient, peerForListening.adminUserId)
                            .then(() => {
                                let handle: NodeJS.Timer = null;

                                const peerForListeningInstance = channel.getPeers().find((item) => item.getUrl() === uniquePeers[0].url);
                                const eventListener = registerEventListener({
                                    channel,
                                    type: 'Tx',
                                    args: [transactionIdString],
                                    peer: peerForListeningInstance && peerForListeningInstance.getPeer(),
                                    onEvent: ({code}) => {
                                        // this is the callback for transaction event status
                                        // first some clean up of event listener
                                        if (handle) {
                                            clearTimeout(handle);
                                        }

                                        // now let the application know what happened
                                        const returnStatus: EndorsmentResult = {event_status: code, tx_id: transactionIdString};
                                        if (code !== 'VALID') {
                                            const errorMessage = `The transaction was invalid, code = ${code}`;
                                            logger.error(errorMessage);
                                            txPromiseReject(new Error(errorMessage));
                                        } else {
                                            logger.info('The transaction has been committed on peer');
                                            txPromiseResolve(returnStatus);
                                        }
                                    },
                                    onDisconnect: (err, willReconnect) => {
                                        if (!willReconnect) {
                                            txPromiseReject(new Error(`There was a problem with the eventhub: ${err} `));
                                        }
                                    },
                                    timeoutForReconnect: 0,
                                    maxReconnects: MAX_RETRIES_EVENT_HUB,
                                    fullBlock: true,
                                    disconnect: true
                                });

                                handle = setTimeout(() => {
                                    eventListener.disconnect();
                                    const err = new Error('Transaction did not complete within the allowed time');
                                    txPromiseReject(err);
                                }, maxTimeout);
                            })
                            .catch((err) => txPromiseReject(err));
                    });

                    const promises: [Promise<FabricClient.BroadcastResponse>, Promise<EndorsmentResult>]  = [
                        sendPromise,
                        txPromise,
                    ];

                    return Promise.all(promises).then((endorsementResults) => {
                        return {
                            transactionProposalResponse,
                            results: endorsementResults
                        };
                    });
                };

                if (!isGrpcs(peerForListening.url)) {
                    return waitForTransactionCompleted();
                }
                const {certPath, certOptions} = peerForListening;

                return loadCert(certPath, certOptions).then(waitForTransactionCompleted);
            })
            .then(({transactionProposalResponse, results}) => {
                logger.info('Send transaction promise and event listener promise have completed');
                const errors = [];
                let transactionSucceeded = false;
                let commitSucceeded = false;
                // check the results in the order the promises were added to the promise all list
                if (results && results[0] && results[0].status === 'SUCCESS') {
                    logger.info('Successfully sent transaction to the orderer.');
                    transactionSucceeded = true;
                } else {
                    const message = `Failed to order the transaction. Error code: ${results[0].status}`;
                    logger.error(message);
                    errors.push(message);
                }

                // TODO: this logic can be removed? already handled inside the previous step (txPromise)
                if (results && results[1] && results[1].event_status === 'VALID') {
                    logger.info('Successfully committed the change to the ledger by the peer');
                    commitSucceeded = true;
                } else {
                    const message = `Transaction failed to be committed to the ledger due to: ${results[1].event_status}`;
                    logger.info(message);
                    errors.push(message);
                }

                if (transactionSucceeded && commitSucceeded) {
                    resolve(transactionProposalResponse);
                } else {
                    reject(new Error(errors.join('\n')));
                }
            })
            .catch((err) => {
                logger.error(`Failed to invoke successfully: ${err}`);
                reject(err);
            });
    });
};
