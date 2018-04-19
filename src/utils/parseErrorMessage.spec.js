const parseErrorMessage = require('./parseErrorMessage');

test('Parses an error string with a custom error object correctly', () => {
    const message =
        'error executing chaincode: transaction returned with failure: ' +
        '[clientchannel-797e3444]Calling chaincode Invoke() returned error response ' +
        '[{"message":"Invalid data!","key":"invalid_data","data":{"property":"objectData"}}]. ' +
        'Sending ERROR message back to peer';
    const error = parseErrorMessage(message);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Invalid data!');
    expect(error.key).toBe('invalid_data');
    expect(error.data).toEqual({property: 'objectData'});
});

test('Parses an error string with a custom error object and no message correctly (invoke)', () => {
    const message =
        'error executing chaincode: transaction returned with failure: ' +
        '[clientchannel-797e3444]Calling chaincode Invoke() returned error response ' +
        '[{"key":"invalid_data","data":{"property":"objectData"}}]. Sending ERROR message back to peer';
    const error = parseErrorMessage(message);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Unknown error');
    expect(error.key).toBe('invalid_data');
    expect(error.data).toEqual({property: 'objectData'});
});

test('Parses an error string with a custom error object and no message correctly (query)', () => {
    const message =
        '2 UNKNOWN: error executing chaincode: transaction returned with failure: ' +
        '{"key":"unknown_entity","data":{"property":"id","value":"my-id"},' +
        '"stack":"Error: unknown_entity\n    at getId (/opt/gopath/src/chaincode/fabcar/chaincode.js:32:85)\n' +
        '    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)"}';
    const error = parseErrorMessage(message);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Unknown error');
    expect(error.key).toBe('unknown_entity');
    expect(error.data).toEqual({property: 'id', value: 'my-id'});
});

test('Parses an error string with a default error object correctly', () => {
    const message =
        '2 UNKNOWN: error executing chaincode: transaction returned with failure: ' +
        '[defaultchannel-f68ded46]Calling chaincode Invoke() returned error response ' +
        '[Error: Incorrect number of arguments. Expecting 5]. Sending ERROR message back to peer';
    const error = parseErrorMessage(message);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Incorrect number of arguments. Expecting 5');
});

test('Parses an error string with an error string correctly', () => {
    const message =
        '2 UNKNOWN: error executing chaincode: transaction returned with failure: ' +
        '[defaultchannel-f68ded46]Calling chaincode Invoke() returned error response ' +
        'It failed!. Sending ERROR message back to peer';
    const error = parseErrorMessage(message);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('It failed!');
});

test('Uses incoming message when parsing fails', () => {
    const error = parseErrorMessage('Wrong format');
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Wrong format');
});
