// HTML consts
const AssemblyInput = document.getElementById('AssemblyInput');
const lineNumberDiv = document.getElementById('lineNumbers');
const AssemblyOutput = document.getElementById('AssemblyOutput');

// synchronize scrolling array
let syncScroll = [AssemblyInput, lineNumberDiv, AssemblyOutput];

class AssemblerError extends Error {
    constructor(message, token) {
        super(message);
        this.errToken = token;
    }
}

class InvalidOpcodeError extends AssemblerError {
    constructor(token) {
        super('Invalid Opcode!', token);
    }
}

class OperandSizeError extends AssemblerError {
    constructor(expectedNumOperands, receivedNumOperands,token) {
        if (receivedNumOperands > expectedNumOperands) {
            super(`Too many Operands!\nExpected ${expectedNumOperands} but read ${receivedNumOperands}`, token);
        }
        else if (receivedNumOperands < expectedNumOperands) {
            super(`Not enough Operands!\nExpected ${expectedNumOperands} but read ${receivedNumOperands}`, token);
        }
        else super('Unknown operand size error', token);
    }
}

class ImmOutRangeError extends AssemblerError {
    constructor(minVal, maxVal,token) {
        super(`Immediate Operand Invalid!\nValue must be between ${minVal} and ${maxVal}`,token);
    }
}

class RegOutRangeError extends AssemblerError {
    constructor(maxVal,token) {
        super(`Register Number Invalid!\nMaximum Value ${maxVal}`,token);
    }
}

class InvalidInputError extends AssemblerError {
    constructor(expectedFormat,token) {
        super(`Input invalid!\nExpected ${expectedFormat}`,token);
    }
}

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
    for(char of string_num){
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


// Globals
let Message = "";
let CurrentLine = "";
let outputEncoding = 2;
let numLines = 0;

function OpCodeResolver(Line){
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

        if(outputEncoding == 16){
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

function generatePopupHTML(error, id) {
    const popupSpan = document.createElement('span');
    popupSpan.setAttribute('id', id);
    popupSpan.setAttribute('class', 'popupError');
    popupSpan.innerHTML = error.message.replace(/\n/g,'<br>');
    return popupSpan;
}

function runAssembler(){
    Message = "";
    AssemblyOutput.style.color = "white";
    let InputText = AssemblyInput.value.toUpperCase();
    localStorage.setItem('input2', InputText);

    InputText = InputText.split('\n');

    let lineCounter = 0;
    for(i in InputText){
        if(InputText[i] != ""){
            try{
                Message += `${OpCodeResolver(InputText[i])}\n`;
            } catch(errs) {

                Message += `<span class="errorText">Error at address ${lineCounter}: </span>`;
                
                if(errs.length > 0) {
                    // copy current line in ouput as a bunch of spans with id same as posisiton and line                    
                    splitLine = InputText[i].replace(/,/g,"").trim().split(" "); // extracting tokens
                    splitLine.push(" "); // add trailing white space for any missing tokens
                    // [ "MOV", "R0", "#", " " ]
                    
                    for(let [i2, tok] of splitLine.entries()){
                        let pos = InputText[i].indexOf(tok) + 1; // so that if tok not in array (white space not found) pos is 0 rather than -1                   

                        let errorSpan = document.createElement('span');
                       
                        if(errs[0] && errs[0].errToken === tok) {
                            // strange solution to display white space in span
                            tok = (tok == " ") ? '&nbsp;' : tok;                            
                            errorSpan.setAttribute('class', 'highlightError');
                            errorSpan.setAttribute('id', `error${i}${pos}`);                  
                            errorSpan.appendChild(generatePopupHTML(errs.shift(), `popup${i}${pos}`)) // send first error object from array to function, then remove the element
                        } else {
                            errorSpan.setAttribute('id', `${i}${pos}`);
                        }
                                 
                        errorSpan.innerHTML += tok;
                        Message += errorSpan.outerHTML;
                        Message += i2 < splitLine.length - 1 ? ' ' : '';
                    }
                    Message += '\n';
                }
                else {
                    Message += `${errs.message}\n`;
                }
            }
            // separate counter to keep track of lines of actual code
            lineCounter++;
        } else {
            Message += '\n';
        }
    }
    Message = Message.replace(/\n/g, '<br>');
    localStorage.setItem('message2', Message);
    localStorage.setItem('encoding2', outputEncoding);
    localStorage.setItem('textcolor2', AssemblyOutput.style.color);
    AssemblyOutput.innerHTML = Message;
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
                let checkbox = document.getElementById('binhex');
                checkbox.checked = !checkbox.checked;
                switchModes();
                break;
        }
    }
});

// Add a function to load local storage
function LoadData(){
    if(localStorage.getItem('input') != null){
        document.getElementById('AssemblyInput').innerHTML = localStorage.getItem('input2');
        document.getElementById('AssemblyOutput').innerHTML = localStorage.getItem('message2');
        outputEncoding = localStorage.getItem('encoding2');
        document.getElementById('AssemblyOutput').style.color = localStorage.getItem('textcolor2');
        if (outputEncoding != 2){
            let checkbox = document.getElementById('binhex');
            checkbox.checked = !checkbox.checked;
            runAssembler();
        }
    }

    updateLines();
        
    // Action listener for text area
    AssemblyInput.addEventListener("input", updateLines);

    // add action listener for synchronized scrolling
    for(elem of syncScroll){
        elem.addEventListener("scroll",syncScrollFunc);
    }
}


// function that update the lines numbers
function updateLines(){
    let InputText = AssemblyInput.value.split('\n');
    let numNewlines = InputText.length;
    
    if (numNewlines > numLines){
        for(let i = numLines; i < numNewlines; i++){
            // add spans 
            let newSpan = document.createElement('span')
            newSpan.setAttribute('id',i); 
            lineNumberDiv.appendChild(newSpan);
        }
    } else if (numNewlines < numLines){
        for(let i = numLines - 1; i >= numNewlines; i--){
            document.getElementById(i).remove();
        }
    }

    // update global variable
    numLines = numNewlines;

    // set the innerHTML of the spans to allow for white spaces
    let lineCounter = 0;
    for(let i = 0; i < numLines; i++){
        if(InputText[i] == ""){
            document.getElementById(i).innerHTML = '|';
        } else {
            document.getElementById(i).innerHTML = lineCounter;
            lineCounter++;
        }
    }

    // Run assembler function could be run from here everytime the user inputs some new text
    runAssembler();
}

// synchronize scrolling
function syncScrollFunc(){
    let top = this.scrollTop;

    for(elem of syncScroll){
        elem.scrollTop = top;
    }
}
