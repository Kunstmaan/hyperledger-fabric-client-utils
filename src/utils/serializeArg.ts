
type ArgType = Date | object | string | number | boolean;

export default function serializeArg(arg: ArgType | ArgType[]) {
    if (arg instanceof Date) {
        return `${arg.getTime()}`;
    }
    // TODO: what about nested dates? eg in an object, array of dates
    if (typeof arg !== 'string') {
        return JSON.stringify(arg);
    }
    return arg;
};
