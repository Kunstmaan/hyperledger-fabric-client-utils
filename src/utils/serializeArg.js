
module.exports = function serializeArg(arg) {
    if (arg instanceof Date) {
        return `${arg.getTime()}`;
    }
    if (typeof arg !== 'string') {
        return JSON.stringify(arg);
    }
    return arg;
};
