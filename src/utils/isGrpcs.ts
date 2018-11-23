export default function isGrpcs(url: string) {
    if (url.toLowerCase().indexOf('grpc://') === 0) {
        return false;
    }
    return true;
};
