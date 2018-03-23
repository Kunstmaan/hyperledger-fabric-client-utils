const logger = require('../logging/logger').getLogger('fabric/parseErrorMessage');

const INVOKE_REGEX = /^.*?Calling\s+chaincode\s+Invoke\(\)\s+returned\s+error\s+response\s+(.*)\..*?$/i;
const DEFAULT_ERROR_REGEX = /^\[Error:\s+(.*?)\]$/i;

module.exports = function parseErrorMessage(message) {
    try {
        if (INVOKE_REGEX.test(message)) {
            const errorMessageMatch = message.match(INVOKE_REGEX)[1];

            try {
                const errorResponse = JSON.parse(errorMessageMatch);
                const errorObject = Array.isArray(errorResponse) ? errorResponse[0] : errorResponse;
                const error = new Error(errorObject.message || 'Unknown error');
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
