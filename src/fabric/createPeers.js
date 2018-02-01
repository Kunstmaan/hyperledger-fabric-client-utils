const loadPeerCert = require('./loadPeerCert');

module.exports = function createPeers(fabricClient, peers) {
    const createPeerPromises = [];
    if (Array.isArray(peers)) {
        peers.forEach((peer) => {
            const createPeerPromise = Promise.resolve()
                .then(() => loadPeerCert(peer))
                .then((certOptions) => fabricClient.newPeer(peer.url, certOptions));
            createPeerPromises.push(createPeerPromise);
        });
    }

    return Promise.all(createPeerPromises);
};
