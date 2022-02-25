const ConversionDictOpcode = {
    'MOV': '000',
    'ADD': '001',
    'SUB': '010',
    'ADC': '011',
    'LDR': '100',
    'STR': '101',
}

const ConversionDictOpcodeJMP = {
    'JMP': '1100', 
    'JNE': '1101', 
    'JCS': '1110', 
    'JMI': '1111', 
}

const ConversionDictRegister = {
    'R0': '00',
    'R1': '01',
    'R2': '10',
    'R3': '11'
}

export function OpCodeResolver(Line, encoding) {
    let errorsEncountered = [];

    Line = Line
            .replace(/,/g,"")
            .trim()
            .split(" "); 
            // if replace pattern is of type string, only the first occurence is replaced, this REGEX replaces all occurences.

    if (ConversionDictOpcode[Line[0]] != undefined) {
        Line[0] = ConversionDictOpcode[Line[0]];
        if (Line.length != 3) {
            errorsEncountered.push(new InvalidInputError('2 operands', ' ')); // error is blank space since size is unknown
        }
        else{
            if(ConversionDictRegister[Line[1]] != undefined) {
                Line[1] = ConversionDictRegister[Line[1]];
                if(ConversionDictRegister[Line[2]] != undefined) {
                    Line[2] = `${ConversionDictRegister[Line[2]]}00000000`;
                    Line[0] = `${Line[0]}0`;
                }
                else if (Line[2][0] == '#') {
                    Line[2] = Line[2].replace('#','');
                    if(Line[2] >= 0 && Line[2] <= 255) {
                        Line[2] = Number(Line[2]);
                        Line[2] = Line[2].toString(2);
                        for(Line[2]; Line[2].length < 10; Line[2] = '0'.concat(Line[2]));
                        Line[1] = "1".concat(Line[1]);
                    }
                    else {
                        errorsEncountered.push(new ImmOutRangeError(0, 255, `#${Line[2]}`));
                    }
                }
                else {
                    errorsEncountered.push(new InvalidInputError('a register or an immediate', Line[2]));
                }
            } else {
                errorsEncountered.push(new RegOutRangeError(3, Line[1]));
            }
        }
    }
    else if(ConversionDictOpcodeJMP[Line[0]] != undefined) {
        Line[0] = ConversionDictOpcodeJMP[Line[0]];
        Line[0] = `${Line[0]}0000`;
        if (Line.length != 2) {
            errorsEncountered.push(new OperandSizeError(1, 1, ' '));
        }
        else {
            if(Line[1][0] == '#'){
                Line[1] = Line[1].replace('#','');
                if(Line[1] >= 0 && Line[1] <= 255){
                    Line[1] = Number(Line[1]);
                    Line[1] = Line[1].toString(2);
                    for(Line[1]; Line[1].length < 8; Line[1] = "0".concat(Line[1]));
                }
                else {
                    errorsEncountered.push(new ImmOutRangeError(0, 255, `#${Line[1]}`));
                }
            }
            else{
                errorsEncountered.push(new InvalidInputError('an immediate', Line[1]));
            }
        }
    }
    else {
        errorsEncountered.push(new InvalidOpcodeError(Line[0]));
    }

    if(errorsEncountered.length > 0) throw errorsEncountered;

    if(encoding == 16){
        // convert binary number back to int 
        // convert int to hex
        // make it uppercase and add leading 0s 
        return "0x" + parseInt(Line.join(''), 2).toString(16).toUpperCase().padStart(4, '0');
    }
    return "0b" + Line.join('');
}