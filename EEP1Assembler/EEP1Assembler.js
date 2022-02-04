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

//maps opcode to I[15:8], for JMP instrunction I[13:12] are don't cares so they are set to 0
const OPCJMP = {
    "JMP": 0xC0,
    "JNE": 0xC2,
    "JEQ": 0xC3,
    "JCS": 0xC4,
    "JCC": 0xC5,
    "JMI": 0xC6,
    "JPL": 0xC7,
    "JGE": 0xC8,
    "JLT": 0xC9,
    "JGT": 0xCA,
    "JLE": 0xCB,
    "JHI": 0xCC,
    "JLS": 0xCD,
    "JSR": 0xCE,
    "RET": 0xCF,
}

const OPCALU = {
    "MOV":,
    "ADD":,
    "SUB":,
    "ADC":,
    "SBC":,
    "AND":,
    "XOR":,
    "LSL":,
}

var Message = "";
var CurrentLine = "";
var outputEncoding = 2;

function OpCodeResolver(Line){
    Line = Line.replace(",","");
    Line = Line.trim();
    Line = Line.split(" ");
    if (ConversionDictOpcode[Line[0]] != undefined){
        Line[0] = ConversionDictOpcode[Line[0]];
        if (Line.length != 3){
            throw("Incorrect Operand Size")
        }
        else{
            if(ConversionDictRegister[Line[1]] != undefined){
                Line[1] = ConversionDictRegister[Line[1]];
                if(ConversionDictRegister[Line[2]] != undefined){
                    Line[2] = ConversionDictRegister[Line[2]] + "00000000";
                    Line[0] = Line[0] + "0";
                }
                else if (Line[2][0] == "#"){
                    Line[2] = Line[2].replace("#",'');
                    if(Line[2] >= 0 && Line[2] <= 255){
                        Line[2] = Number(Line[2]);
                        Line[2] = Line[2].toString(2);
                        for(Line[2]; Line[2].length < 10; Line[2] = "0".concat(Line[2]));
                        Line[1] = "1".concat(Line[1]);
                    }
                    else{
                        throw("Immediate Operand Too large or Small")
                    }
                }
                else{
                    throw("Invalid Input Value")
                }
            }else{
                throw("Register Error (Position or Immediate Operand)")
            }
        }
    }
    else if(ConversionDictOpcodeJMP[Line[0]] != undefined){
        Line[0] = ConversionDictOpcodeJMP[Line[0]];
        Line[0] = Line[0] + "0000";
        if (Line.length != 2){
            throw("Incorrect Operand Size")
        }
        else{
            if(Line[1][0] == "#"){
                Line[1] = Line[1].replace("#",'');
                if(Line[1] >= 0 && Line[1] <= 255){
                    Line[1] = Number(Line[1]);
                    Line[1] = Line[1].toString(2);
                    for(Line[1]; Line[1].length < 8; Line[1] = "0".concat(Line[1]));
                }
                else{
                    throw("Immediate Operand Too large or small")
                }
            }
            else{
                throw("Incorrect operand")
            }
        }
    }
    else{
        throw("Incorrect opcode");
    }
    if(outputEncoding == 16){
        // convert binary number back to int 
        // convert int to hex
        // make it uppercase and add leading 0s 
        return parseInt(Line.join(''), 2).toString(16).toUpperCase().padStart(4, '0');
    }
    return Line.join('');
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
