interface CertOptions {
    'ssl-target-name-override'?: string;
}

interface Peer {
    url: string;
    mspid: string;
    certPath: string;
    certOptions: CertOptions;
    adminUserId: string;
}

interface Orderer {
    url: string;
    certPath: string;
    certOptions: CertOptions;
}

interface Chaincode {
    args: string[];
    fcn: string;
    id: string;
}
