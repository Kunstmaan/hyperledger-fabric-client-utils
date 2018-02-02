# Hyperledger Fabric Client utils

This repository consists out of a set of utility functions which can be used to interact with chaincode on a Hyperledger Fabric blockchain network.

1. [API](#api)
    + [createFabricClient](#createfabricclient)
    + [baseService](#baseservice)
    + [query](#query)
    + [invoke](#invoke)
    + [registerChaincodeEventListener](#registerchaincodeeventlistener)
2. [Run tests](#run-tests)

## API

### createFabricClient

Utility function to create an instance of a fabric client.

```javascript
const {createFabricClient} = require('@kunstmaan/hyperledger-fabric-client-utils');

/**
 * The hfc-key-story path
 * Contains public / private keys of the users
 */ 
const keyStorePath = './node_modules/@kunstmaan/hyperledger-fabric-chaincode-dev-setup/dev-network/generated/hfc-key-store';
const fabricClient = await createFabricClient(keyStorePath);
```

### baseService

A wrapper around the query and invoke logic. Allows you to easily setup a service with default values for a peer, orderer and channel id.

```javascript
const {baseService} = require('@kunstmaan/hyperledger-fabric-client-utils');

const keyStorePath = './node_modules/@kunstmaan/hyperledger-fabric-chaincode-dev-setup/dev-network/generated/hfc-key-store';

const service = baseService(
    keyStorePath,
    'fabcar1',
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
        channelId: 'defaultchannel',
        peers: [{
            url: 'grpc://localhost:7051',
            /**
             * The url which is used to subscribe to the event hub to wait for the transaction to be completed
             */
            broadcastUrl: 'grpc://localhost:7053',
            /**
             * Id of the user which can listen to the event hub, not all users can do this by default
             */
            adminUserId: 'admin'
            /**
             * Path to the certificate, you only need to specify this when using the grpcs protocol
             */
            certPath: './node_modules/@kunstmaan/hyperledger-fabric-chaincode-dev-setup/dev-network/generated/crypto-config/org1.example.be/peers/peer.org1.example.be/tlsca.combined.peer.org1.example.be-cert.pem',
            /**
             * Extra options to pass to the grpc module, you only need to specify this when using the grpcs protocol
             */
            certOptions: {
                'ssl-target-name-override': "peer.org1.example.be"
            }
        }],
        orderer: {
            url: 'grpc://localhost:7050',
            /**
             * Path to the certificate, you only need to specify this when using the grpcs protocol
             */
            certPath: './node_modules/@kunstmaan/hyperledger-fabric-chaincode-dev-setup/dev-network/generated/crypto-config/org1.example.be/orderers/orderer.org1.example.be/tlsca.combined.orderer.org1.example.be-cert.pem',
            /**
             * Extra options to pass to the grpc module, you only need to specify this when using the grpcs protocol
             */
            certOptions: {
                'ssl-target-name-override': "peer.org1.example.be"
            }
        }
    }
);

await service.createCar(defaultUserId, {
    id: 'CAR1000',
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
```

### query

Query the chaincode on the network.

```javascript
const {query, createFabricClient} = require('@kunstmaan/hyperledger-fabric-client-utils');

const keyStorePath = './node_modules/@kunstmaan/hyperledger-fabric-chaincode-dev-setup/dev-network/generated/hfc-key-store';

/**
 * Always create a new instance of the fabric client when executing a query
 */
const fabricClient = await createFabricClient(keyStorePath);

const result = await query({
    fabricClient,
    channelId: 'defaultchannel',
    chaincode: {
        /**
         * Id
         */
        id: 'fabcar1',
        /**
         * Function
         */
        fcn: 'queryCar',
        /**
         * Arguments
         * Can be of any type, internally everything will be converted to a string
         */
        args: ['CAR0']
    },
    peer: {
        url: 'grpc://localhost:7051',
        /**
         * Path to the certificate, you only need to specify this when using the grpcs protocol
         */
        certPath: './node_modules/@kunstmaan/hyperledger-fabric-chaincode-dev-setup/dev-network/generated/crypto-config/org1.example.be/peers/peer.org1.example.be/tlsca.combined.peer.org1.example.be-cert.pem',
        /**
         * Extra options to pass to the grpc module, you only need to specify this when using the grpcs protocol
         */
        certOptions: {
            'ssl-target-name-override': "peer.org1.example.be"
        }
    },
    /**
     * User which is doing the transaction (used for loading the correct public/private key inside the keystore path)
     */
    userId: 'user-1'
});
```

### invoke

Invoke chaincode on the network (create a new block).

```javascript
const {invoke, createFabricClient} = require('@kunstmaan/hyperledger-fabric-client-utils');

const keyStorePath = './node_modules/@kunstmaan/hyperledger-fabric-chaincode-dev-setup/dev-network/generated/hfc-key-store';

/**
 * Always create a new instance of the fabric client when executing an invoke
 */
const fabricClient = await createFabricClient(keyStorePath);

const result = await invoke({
    fabricClient,
    channelId: 'defaultchannel',
    chaincode: {
        /**
         * Id
         */
        id: 'fabcar1',
        /**
         * Function
         */
        fcn: 'createCar',
        /**
         * Arguments
         * Can be of any type, internally everything will be converted to a string
         */
        args: ['CAR1000', 'Porsche', 'Cayenne', 'Black', 'Ronny']
    },
    peer: {
        url: 'grpc://localhost:7051',
        /**
         * The url which is used to subscribe to the event hub to wait for the transaction to be completed
         */
        broadcastUrl: 'grpc://localhost:7053',
        /**
         * Id of the user which can listen to the event hub, not all users can do this by default
         */
        adminUserId: 'admin'
        /**
         * Path to the certificate, you only need to specify this when using the grpcs protocol
         */
        certPath: './node_modules/@kunstmaan/hyperledger-fabric-chaincode-dev-setup/dev-network/generated/crypto-config/org1.example.be/peers/peer.org1.example.be/tlsca.combined.peer.org1.example.be-cert.pem',
        /**
         * Extra options to pass to the grpc module, you only need to specify this when using the grpcs protocol
         */
        certOptions: {
            'ssl-target-name-override': "peer.org1.example.be"
        }
    },
    orderer: {
        url: 'grpc://localhost:7050',
        /**
         * Path to the certificate, you only need to specify this when using the grpcs protocol
         */
        certPath: './node_modules/@kunstmaan/hyperledger-fabric-chaincode-dev-setup/dev-network/generated/crypto-config/org1.example.be/orderers/orderer.org1.example.be/tlsca.combined.orderer.org1.example.be-cert.pem',
        /**
         * Extra options to pass to the grpc module, you only need to specify this when using the grpcs protocol
         */
        certOptions: {
            'ssl-target-name-override': "peer.org1.example.be"
        }
    },
    /**
     * User which is doing the transaction (used for loading the correct public/private key inside the keystore path)
     */
    userId: 'user-1',
    /**
     * [optional = defaults to 30s] Maximum time to wait before an invoke is fully processed / persisted on the blockchain
     */
    maxTimeout: 30000
});
```

### registerChaincodeEventListener

Listen to events on the network

```javascript
const {registerChaincodeEventListener, createFabricClient} = require('@kunstmaan/hyperledger-fabric-client-utils');

const keyStorePath = './node_modules/@kunstmaan/hyperledger-fabric-chaincode-dev-setup/dev-network/generated/hfc-key-store';

/**
 * Always create a new instance of the fabric client when creating an event listener
 */
const fabricClient = await createFabricClient(keyStorePath);

await registerChaincodeEventListener({
    fabricClient,
    chaincode: 'fabcar1',
    channelId: 'defaultchannel',
    peer: {
        url: 'grpc://localhost:7051',
        /**
         * The url which is used to subscribe to the event hub to wait for the transaction to be completed
         */
        broadcastUrl: 'grpc://localhost:7053',
        /**
         * Id of the user which can listen to the event hub, not all users can do this by default
         */
        adminUserId: 'admin'
        /**
         * Path to the certificate, you only need to specify this when using the grpcs protocol
         */
        certPath: './node_modules/@kunstmaan/hyperledger-fabric-chaincode-dev-setup/dev-network/generated/crypto-config/org1.example.be/peers/peer.org1.example.be/tlsca.combined.peer.org1.example.be-cert.pem',
        /**
         * Extra options to pass to the grpc module, you only need to specify this when using the grpcs protocol
         */
        certOptions: {
            'ssl-target-name-override': "peer.org1.example.be"
        }
    },
    orderer: {
        url: 'grpc://localhost:7050',
        /**
         * Path to the certificate, you only need to specify this when using the grpcs protocol
         */
        certPath: './node_modules/@kunstmaan/hyperledger-fabric-chaincode-dev-setup/dev-network/generated/crypto-config/org1.example.be/orderers/orderer.org1.example.be/tlsca.combined.orderer.org1.example.be-cert.pem',
        /**
         * Extra options to pass to the grpc module, you only need to specify this when using the grpcs protocol
         */
        certOptions: {
            'ssl-target-name-override': "peer.org1.example.be"
        }
    },
    /**
     * User which is doing the transaction (used for loading the correct public/private key inside the keystore path)
     */
    userId: 'user-1',
    /**
     * Event id to listen to
     */
    eventId: 'event-id',
    /**
     * Callback when the event is triggered. Returns a payload which has the event data.
     */
    onEvent: (payload) => {
        console.log(payload);
    },
    /**
     * Called when the listener gets disconnected
     */
    onDisconnect: () => {
        console.log('disconnected');
    }
});
```

## Run tests

1. Make sure you have installed Docker and Python
2. Make sure you have added the path of the repo to the Docker file sharing preferences
3. Run `npm install`
3. Run `npm start-dev-network` and wait for all chaincode to be instantiated
4. Open a new terminal and run `npm test`
