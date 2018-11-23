import loadCert from './loadCert';
import isGrpcs  from './isGrpcs';
import FabricClient from 'fabric-client';

export default function createPeers(fabricClient: FabricClient, peers: Peer[]) {
    const createPeerPromises: Promise<FabricClient.Peer>[] = [];
    if (Array.isArray(peers)) {
        peers.forEach((peer) => {
            const createPeerPromise = Promise.resolve()
                .then(() => {
                    if (!isGrpcs(peer.url)) {
                        return Promise.resolve(null);
                    }
                    return loadCert(peer.certPath, peer.certOptions);
                })
                .then((certOptions) => fabricClient.newPeer(peer.url, certOptions));
            createPeerPromises.push(createPeerPromise);
        });
    }

    return Promise.all(createPeerPromises);
};
