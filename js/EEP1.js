import { AssemblerError, MultipleErrors, InvalidInputError, InvalidOpcodeError, ImmOutRangeError, OperandSizeError, RegOutRangeError } from '../js/errorClasses.js';

const REGISTER_COUNT = 8;
const REGISTER_BITS = Math.log2(REGISTER_COUNT);

//maps opcode to I, for JMP instrunction I[13:12] are don't cares so they are set to 0
export const OPCODES = { // OPCODE structure is [ OPCODE, MAX_OPERANDS, OPERAND_FORMAT... ]
// JMP
    "JMP": [0xC0, 1, '#Imm8'],
    "JNE": [0xC2, 1, '#Imm8'],
    "JEQ": [0xC3, 1, '#Imm8'],
    "JCS": [0xC4, 1, '#Imm8'],
    "JCC": [0xC5, 1, '#Imm8'],
    "JMI": [0xC6, 1, '#Imm8'],
    "JPL": [0xC7, 1, '#Imm8'],
    "JGE": [0xC8, 1, '#Imm8'],
    "JLT": [0xC9, 1, '#Imm8'],
    "JGT": [0xCA, 1, '#Imm8'],
    "JLE": [0xCB, 1, '#Imm8'],
    "JHI": [0xCC, 1, '#Imm8'],
    "JLS": [0xCD, 1, '#Imm8'],
    "JSR": [0xCE, 1, '#Imm8'],
    "RET": [0xCF00, 0],
// ALU
    "MOV": [0x0, 3, "Ra", "Op"],
    "ADD": [0x1, 3, 'Ra', 'Op'],
    "SUB": [0x2, 3, 'Ra', 'Op'],
    "ADC": [0x3, 3, 'Ra', 'Op'],
    "SBC": [0x4, 3, 'Ra', 'Op'],
    "AND": [0x5, 3, 'Ra', 'Op'],
    "XOR": [0x6, 3, 'Ra', 'Op'],    
    "LSR": [0x7, 3, 'Ra', '0', 'Rb', '#Imms5'],
// LDR / STR
    "LDR": [0b1000, 'Ra', 'Op'],
    "STR": [0b1010, 'Ra', 'Op'],
}

/* Define functions to interpret different parts of the instructions */

//function to convert negative numbers into twos complement form
function twosComplementConversion(negative_num){
    return (negative_num >>> 0).toString(2).substring(27, 32); //More effecient negative -> twos complement
}


// function Register takes in input register string in form "Rnum" and return corresponding binary representation
function Register(token){    

    // check if token is actually defined
    if(token) {

        // Check it is in correct format
        if(token.length > 1 && token[0] == "R") {
            let regNum = Number(token.replace("R",""));

            if (regNum < REGISTER_COUNT && regNum >= 0) { //check register size
                return regNum.toString(2).padStart(REGISTER_BITS, "0");//pad with zeros to make it 3bit long
            } else {
                errors.push(new RegOutRangeError(REGISTER_COUNT - 1, token)); 
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
    if (token && token.length > 1 && token[0] == "#"){
        if (format == 5) {
            let immOut = Number(token.replace("#",""));
            if (immOut <= 15 && immOut >= 0) {
                // positive number, no need to convert to twos complement
                return immOut.toString(2).padStart(format, '0');
            } else if (immOut >= -16 && immOut < 0) {
                return twosComplementConversion(immOut);
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
        throw new InvalidInputError(`#Imm${format == 5 ? 's5' : '8'}`, (token ? token : ' ')); //throw whitespace if not defined
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
            throw new InvalidInputError('Rb or #Imm8',token[0]);
        }
    } else if (token.length == 2) {
        // register and Imms5
        return '0' + Register(token[0]) + Immediate(token[1], 5);
    } else if (token.length == 0) {
        throw new InvalidInputError('Rb or Rb, #Imms5', ' ');
    }
    // else throw new AssemblerError('Too many inputs',token[0]);
}


export function OpCodeResolver(Line, encoding = 2, symbolTable){
    // formatting line to extract individual tokens
    let tokens = Line.replace(/,/g,'').trim().split(' ');
    let output = '';
    let errors = [];

    // check whether first token is symbol token (identified by : at the end)
    // if (tokens[0][tokens[0].length - 1] == ':') {
    //     tokens[0] = tokens[0].replace(':','');

    //     // check whether symbol has already been used        
    //     if(symbolTable[tokens[0]]){
    //         errors.push(new AssemblerError('Symbol has already been used', tokens[0]));
    //         throw errors;
    //     } 

    //     newSymbol = tokens[0];

    //     // use shift so the rest of the program can continue to work properly
    //     symbolTable[tokens.shift()] = [0, false];
        
    // }

    // if (Object.keys(symbolTable).includes(tokens[0])) {
    //     tokens.shift();
    // }

    if (Object.keys(OPCODES).includes(tokens[0])){        
        let instruction = OPCODES[tokens[0]];

        if (tokens.length - 1 > instruction[1]) {
            errors.push(new OperandSizeError(instruction[1], tokens.length - 1, tokens[0])); // error operand size limit exceeded, opcode highlighted
        }
        
        // append opcode conversion to output
        output += instruction[0].toString(2).padStart(4, '0');
        // needed for instructions which have arbitrary 0s and 1s
        let tokensCounter = 1;
        for (let i = 2; i < instruction.length; i++) {
            // if a token matches with a symbol from the symbol table then it is converted
            
            if(symbolTable && Object.keys(symbolTable).includes(tokens[tokensCounter])) { //check if symbol table is defined and if symbol table is defined for current token
                // symbol has been used therefore it's set to true
                symbolTable[tokens[tokensCounter]][1] = true;
                
                tokens[tokensCounter] = `#${symbolTable[tokens[tokensCounter]][0]}`;
            }

            if (instruction[i] == "#Imm8"){
                try {
                    output += Immediate(tokens[tokensCounter], 8);                    
                } catch (error) {
                    errors.push(error);
                }
            } else if (instruction[i] == "Op") {
                let operand = tokens.filter(function(_value, index, _arr){
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

        if (errors.length != 0) throw new MultipleErrors('Assembler errors detected!', errors);

        if(encoding == 16){
            // convert binary number back to int 
            // convert int to hex
            // make it uppercase and add leading 0s 
            output =  "0x" + parseInt(output, 2).toString(16).toUpperCase().padStart(4, '0');
        } else {
            output = "0b" + output;
        }
        
        if (symbolTable && newSymbol) {
            return [output, newSymbol];
        } else {
            return [output];
        }
    } else {
        // catch in runAssembler expecting error array
        errors.push(new InvalidOpcodeError((tokens[0] ? tokens[0] : ' '))); // trick to show whitespace in output
        throw new MultipleErrors('Assembler errors detected!', errors);
    }
}