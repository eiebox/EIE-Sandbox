import { AssemblerError, InvalidOpcodeError, OperandSizeError, ImmOutRangeError, InvalidInputError} from "../js/errorClasses.js";

const REGISTER_COUNT = 8;
const REGISTER_BITS = 3;

//maps opcode to I, for JMP instrunction I[13:12] are don't cares so they are set to 0
const OPCODES = {
// JMP
    "JMP": [0xC0, '#Imm8'],
    "JNE": [0xC2, '#Imm8'],
    "JEQ": [0xC3, '#Imm8'],
    "JCS": [0xC4, '#Imm8'],
    "JCC": [0xC5, '#Imm8'],
    "JMI": [0xC6, '#Imm8'],
    "JPL": [0xC7, '#Imm8'],
    "JGE": [0xC8, '#Imm8'],
    "JLT": [0xC9, '#Imm8'],
    "JGT": [0xCA, '#Imm8'],
    "JLE": [0xCB, '#Imm8'],
    "JHI": [0xCC, '#Imm8'],
    "JLS": [0xCD, '#Imm8'],
    "JSR": [0xCE, '#Imm8'],
    "RET": [0xCF, '#Imm8'],
// ALU
    "MOV": [0x0, "Ra", "Op"],
    "ADD": [0x1, 'Ra', 'Op'],
    "SUB": [0x2, 'Ra', 'Op'],
    "ADC": [0x3, 'Ra', 'Op'],
    "SBC": [0x4, 'Ra', 'Op'],
    "AND": [0x5, 'Ra', 'Op'],
    "XOR": [0x6, 'Ra', 'Op'],    
    "LSL": [0x7, 'Ra', '0', 'Rb', '#Imms5'],
// LDR / STR
    "LDR": [0b1000, 'Ra', 'Op'],
    "STR": [0b1010, 'Ra', 'Op'],
}

/* Define functions to interpret different parts of the instructions */

function twosComplementConversion(negative_num){
    let string_num = (Math.abs(negative_num)-1).toString(2);

    // extend zeros
    if(string_num[0] == 1){
        string_num = '0' + string_num;
    } 

    let result = "";
    for(let char of string_num){
        result += (char == '1' ? '0' : '1'); //invert all the digits
    }
    return result;
}


// function Register takes in input register string in form "Rnum" and return corresponding binary representation
function Register(token){    
    // check if token is actually defined
    if(token) {
        // Check it is in correct formst
        if(token.length > 1 && token[0] == "R") {
            let regNum = Number(token.replace("R",""));
            // check register is correct size
            if (regNum < REGISTER_COUNT && regNum >= 0) {
                return regNum.toString(2).padStart(REGISTER_BITS, "0");
            } else {
                throw new RegOutRangeError(REGISTER_COUNT - 1, token);
            }
        } else {
            throw new InvalidInputError('a register', token);
        }
    } else {
        throw new InvalidInputError('a register', ' ');
    }
}

// function Immediates convert #Imms5 and #Imm8 to binary representation, 
function Immediate(token, format){
    if (token.length > 1 && token[0] == "#"){
        if (format == 5) {
            let immOut = Number(token.replace("#",""));
            if (immOut <= 15 && immOut >= 0) {
                // positive number, no need to convert to twos complement
                return immOut.toString(2).padStart(format, '0');
            } else if (immOut >= -16 && immOut < 0) {
                return twosComplementConversion(immOut).padStart(format, '1');
            } else {
                throw new ImmOutRangeError(-16, 15,token);
            }
        } else if (format == 8) {
            let immOut = Number(token.replace("#",""));
            if (immOut >= 0 && immOut <= 255) {
                return immOut.toString(2).padStart(format, '0');
            } else {
                throw new ImmOutRangeError(0, 255,token);
            }   
        } else {
            throw new AssemblerError('Programmer made a mistake!',token);
        }
    } else {
        throw new InvalidInputError('an immediate (with #)',token);
    }
}

//function Op convert token
function Operand(token){
    if (token.length == 1) {
        if (token[0][0] == "#") {
            // Imm8
            return "1" + Immediate(token[0], 8);
        } else if (token[0][0] == "R") {
            // Register 
            return "0" + Register(token[0]).padEnd(8,"0"); 
        } else {
            throw new InvalidInputError('a register or an immediate',token[0]);
        }
    } else if (token.length == 2) {
        // register and Imms5
        return "0" + Register(token[0]) + Immediate(token[1], 5);
    } else if (token.length == 0) {
        throw new AssemblerError('Missing operand'," ");
    }
    else throw new AssemblerError('Too many inputs',token[0]);
}


export function OpCodeResolver(Line, encoding = 2){
    // formatting line to extract individual tokens
    let tokens = Line.replace(/,/g,"").trim().split(" ");
    let output = "";

    //console.log(tokens);

    if (Object.keys(OPCODES).includes(tokens[0])){
        let errors = [];

        let instruction = OPCODES[tokens[0]];

        // append opcode conversion to output
        output += instruction[0].toString(2).padStart(4, '0');
        // needed for instructions which have arbitrary 0s and 1s
        let tokensCounter = 1;
        for (let i = 1; i < instruction.length; i++) {
            if (instruction[i] == "#Imm8"){
                try {
                    output += Immediate(tokens[tokensCounter], 8);                    
                } catch (error) {
                    errors.push(error);
                }
            } else if (instruction[i] == "Op") {
                let operand = tokens.filter(function(value, index, arr){
                    return index > 1;
                });
                try {
                    output += Operand(operand);
                } catch (error) {
                    errors.push(error);
                }
            } else if (instruction[i] == "Ra" || instruction[i] == "Rb") {
                try {
                    output += Register(tokens[tokensCounter]);
                } catch (error) {
                    errors.push(error);
                }
            } else if (instruction[i] == "#Imms5") {
                try {
                    output += Immediate(tokens[tokensCounter], 5);
                } catch (error) {
                    errors.push(error);
                }
            } else if (instruction[i] == "1") {
                output += "1";
                // tokensCounter doesn't increment in this case since since this doens't correspond to a token
                tokensCounter -= 1;
            } else if (instruction[i] == "0") {
                output += "0";
                // tokensCounter doesn't increment in this case since since this doens't correspond to a token
                tokensCounter -= 1;
            }
            tokensCounter++;
        }

        if (errors.length != 0) throw errors;

        if(encoding == 16){
            // convert binary number back to int 
            // convert int to hex
            // make it uppercase and add leading 0s 
            return "0x" + parseInt(output, 2).toString(16).toUpperCase().padStart(4, '0');
        }
        
        return "0b" + output;
    } else {
        throw new InvalidOpcodeError(tokens[0]); // catch in runAssembler expecting error array.
    }
}


