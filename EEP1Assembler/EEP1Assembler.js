/*
potential approach:
split line into arrays of tokens
separate functions to assemble different ALU, JMP and LDR/STR instructions
ALU:
    check whether there is 1 or 2 registers to determine whether to use Imm8 or Imm5
    for Imm5 deal with 2's complement

    make dict to map opcodes to binary values 

JMP:
    use dict mapping
    deal with OP and Ra??

Other possible improvement is to encode values to be accepted in the opcodes

Convert registers by chopping R off and converting number to binary


*/

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
    "LSL": [0x7, 'Ra', "0", 'Rb', '#Imms5'],
// LDR / STR
    "LDR": [0b1000, 'Ra', 'Op'],
    "STR": [0b1010, 'Ra', 'Op'],
}

/* Define functions to interpret different parts of the instructions */

// function Register takes in input register string in form "Rnum" and return corresponding binary representation
function Register(token){    
    // Check it is in correct formst
    if(token[0] == "R"){
        let regNum = Number(token.replace("R",""));
        // check register is correct size
        if (regNum < REGISTER_COUNT || regNum >= 0){
            return regNum.toString(2).padStart(REGISTER_BITS, "0");
        } else {
            throw("Register value out of bounds");
        }
    } else {
        throw("Register format incorrect");
    }
}

// function Immediates convert #Imms5 and #Imm8 to binary representation, 
function Immediate(token, format){
    if (token[0] == "#"){
        if (format == 5) {
            let immOut = Number(token.replace("#",""));
            if (immOut <= 15 && immOut >= 0) {
                // poisitive number, no need to convert to twos complement
                return immOut.toString(2).padStart(format, '0');
            } else if (immOut >= -16 && immOut < 0) {
                // ~ flips the bits of the number, therefore number is made positive, bits are flipped, number becomes negative therefore it is made positive again, then 1 is added
                immOut = Math.abs(immOut);
                return (Math.abs(~immOut) + 1).toString(2).padStart(format, '1');
            } else {
                throw("Immediate out of range");
            }
        } else if (format == 8) {
            let immOut = Number(token.replace("#",""));
            if (immOut >= 0 || immOut <= 255) {
                return immOut.toString(2).padStart(format, '0');
            } else {
                throw("Immediate out of range");
            }   
        } else {
            throw("Immediate format incorrect");
        }
    } else {
        throw("Missing # on Immediate");
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
            throw("Invalid token")
        }
    } else if (token.length == 2) {
        // register and Imms5
        return "0" + Register(token[0]) + Immediate(token[1], 5);
    }
}

var Message = "";
var CurrentLine = "";
var outputEncoding = 2;

function OpCodeResolver(Line){
    Line = Line.replace(",","");
    Line = Line.trim();
    let tokens = Line.split(" ");
    let output = "";
    console.log(tokens);
    console.log(Object.keys(OPCODES));
    if (Object.keys(OPCODES).includes(tokens[0])){
        let instruction = OPCODES[tokens[0]];
        console.log(instruction);
        // append opcode conversion to output
        output += instruction[0].toString(2).padStart(4, '0');

        for (let i = 1; i < instruction.length; i++){
            if (instruction[i] == "#Imm8"){
                output += Immediate(tokens[i], 8);
            } else if (instruction[i] == "Op") {
                let operand = tokens.filter(function(value, index, arr){
                    return index > 1;
                });
                output += Operand(operand);
            } else if (instruction[i] == "Ra" || instruction[i] == "Rb") {
                output += Register(tokens[i]);
            } else if (instruction[i] == "#Imms5") {
                output += Immediate(tokens[i], 5);
            } else if (instruction[i] == "1") {
                output += "1";
            } else if (instruction[i] == "0") {
                output += "0";
            }
            console.log(output + " " + i);
        }

        if(outputEncoding == 16){
            // convert binary number back to int 
            // convert int to hex
            // make it uppercase and add leading 0s 
            return parseInt(output, 2).toString(16).toUpperCase().padStart(4, '0');
        }
        return output;
    } else {
        throw("Incorrect OPCODE");
    }
}


function runAssembler(){
    Message = "";
    document.getElementById("AssemblyOutput").style.color = "white";
    var InputText = document.getElementById("AssemblyInput");
    InputText = InputText.value.split("\n");
    for(var i in InputText){
        if(InputText[i] != ""){
            try{
                Message += OpCodeResolver(InputText[i]) + "\n";
            }catch(err){
                Message += err + " on line: " + (Number(i)+1) + "\n";
                document.getElementById("AssemblyOutput").style.color = "red";
            }
        }
    }
    document.getElementById("AssemblyOutput").innerHTML = Message;
}

//function that is run when toggle is clicked
function switchModes(){
    outputEncoding = (outputEncoding == 2) ? 16 : 2;
    runAssembler();
}

// action listener for running assembler
document.addEventListener('keydown', (event) => {
    if (event.ctrlKey) {
        switch (event.key) {
            case 'Enter':
                runAssembler();
                break;
            case ' ':
                switchModes();
                break;
        }
    }
});
