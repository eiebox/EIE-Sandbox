
var ConversionDictOpcode = {
    "MOV": "000",
    "ADD": "001",
    "SUB": "010",
    "ADC": "011",
    "LDR": "100",
    "STR": "101",
}

var ConversionDictOpcodeJMP = {
    "JMP": "1100", 
    "JNE": "1101", 
    "JCS": "1110", 
    "JMI": "1111", 
}

var ConversionDictRegister = {
    "R0": "00",
    "R1": "01",
    "R2": "10",
    "R3": "11"
}

var Message = "";
var CurrentLine = ""

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
                    if(Line[2] > 0 && Line[2] < 255){
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
                if(Line[1] >= 0 && Line[1] < 255){
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