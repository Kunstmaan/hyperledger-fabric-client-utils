import getLogger  from './getLogger';

const logger = getLogger('fabric/parseErrorMessage');

const ERROR_REGEX_COLLECTION = [
    /^.*?Calling\s+chaincode\s+Invoke\(\)\s+returned\s+error\s+response\s+(.*)\..*?$/i, // Invoke
    /^.*?transaction\s+returned\s+with\s+failure:\s+(.*?)$/i // Query
];
const DEFAULT_ERROR_REGEX = /^\[Error:\s+(.*?)\]$/i;

export default function parseErrorMessage(message: string): Error {
    try {
        const errorMessageMatches = ERROR_REGEX_COLLECTION.map((ERROR_REGEX) => {
            const normalizedMessage = message.replace(/\n/gm, ' ');
            if (ERROR_REGEX.test(normalizedMessage)) {
                return normalizedMessage.match(ERROR_REGEX)[1];
            }
            return undefined;
        }).filter((item) => !!item);


        if (errorMessageMatches.length > 0) {
            const errorMessageMatch = errorMessageMatches[0];
            try {
                const errorResponse = JSON.parse(errorMessageMatch);
                const errorObject = Array.isArray(errorResponse) ? errorResponse[0] : errorResponse;
                const error = new Error(errorObject.message || 'Unknown error') as Error & {[key: string]: any};
                Object.keys(errorObject).forEach((key) => {
                    error[key] = errorObject[key];
                });
                return error;
            } catch (err) {
                // Not an object, default Error object is thrown
                if (DEFAULT_ERROR_REGEX.test(errorMessageMatch)) {
                    const defaultErrorMatch = errorMessageMatch.match(DEFAULT_ERROR_REGEX)[1];
                    return new Error(defaultErrorMatch);
                }
                return new Error(errorMessageMatch);
            }
        }
    } catch (e) {
        logger.info(`Unable to parse error details from error: ${message}.`);
    }

    return new Error(message);
};
