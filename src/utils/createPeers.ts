import loadCert from './loadCert';
import isGrpcs  from './isGrpcs';

export default function createPeers(fabricClient, peers) {
    const createPeerPromises = [];
    if (Array.isArray(peers)) {
        peers.forEach((peer) => {
            const createPeerPromise = Promise.resolve()
                .then(() => {
                    if (!isGrpcs(peer.url)) {
                        return Promise.resolve();
                    }
                    return loadCert(peer.certPath, peer.certOptions);
                })
                .then((certOptions) => fabricClient.newPeer(peer.url, certOptions));
            createPeerPromises.push(createPeerPromise);
        });
    }

    return Promise.all(createPeerPromises);
};
