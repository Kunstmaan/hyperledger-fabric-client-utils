module.exports = function isGrpcs(url) {
    if (url.toLowerCase().indexOf('grpc://') === 0) {
        return false;
    }
    return true;
};
