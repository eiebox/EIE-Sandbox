import { AssemblerError, MultipleErrors, InvalidInputError, InvalidOpcodeError, ImmOutRangeError, OperandSizeError, RegOutRangeError } from '../../js/errorClasses.js';


// HTML consts
const AssemblyInput = document.getElementById('AssemblyInput');
const lineNumberDiv = document.getElementById('lineNumbers');
const AssemblyOutput = document.getElementById('AssemblyOutput');
const downloadButton = document.getElementById('downloadBtn');
const binhexCheckbox = document.getElementById('binhex');
const assemblerBtn = document.getElementById('assemblerBtn');

// Synchronisse scrolling array (elems to sync)
const syncScroll = [AssemblyInput, lineNumberDiv, AssemblyOutput];

// Assembler versions
const assemblerVersions = ['EEP0', 'EEP1', 'EEP2'];

// Assembler Globals
let outputEncoding = 2;
let numLines = 0;
let currentCPU;
let currentAssembler; // global module that gets imported on load 

// Assign event listeners
window.addEventListener('load', initAssembler);
for(let elem of syncScroll)	elem.addEventListener('scroll', syncScrollFunc); // synchronised scrolling


// called by body on load
function initAssembler() {
	// returns object with all GET parameters in current url string
	const urlParams = new URLSearchParams(window.location.search);
	currentCPU = urlParams.get('cpu')?.toUpperCase();
	if (!assemblerVersions.includes(currentCPU)) alert('Invalid Assembler Version! Please select version from the drop-down above. Undefined behaviour.');

	import(`../../js/${currentCPU}.js`)
		.then(module => {
			// assign just loaded module to global variable
			currentAssembler = module;

			// assign these listeners that can only work after assembler initialisation
			binhexCheckbox.addEventListener('change', switchModes); // binhex selection, needs module loaded as runs assembler
			assemblerBtn.addEventListener('click', runAssembler)
			assemblerBtn.classList.remove('disabled'); 
			downloadButton.addEventListener('click', downloadFile); 
			AssemblyInput.addEventListener('input', updateLines); // text area
			updateLines();
		}, err => { 
			alert(`Assembler module import failed! Undefined behaviour.\nDetails: ${err.message}`);
			assemblerBtn.classList.add('disabled');
		});

	// while the file is loading, do all this stuff underneath (None of it depends on assembler functions)

	// Change HTML to match current CPU
	document.getElementById('HeadTitle').innerHTML = `${currentCPU} Assembler`;
	document.getElementById('MiddleBarTitle').innerHTML = `[${currentCPU} - ASSEMBLER]`;

	// Load Data from LocalStorage
	if (localStorage.getItem(`${currentCPU}input`) != null) {
		document.getElementById('AssemblyInput').innerHTML = localStorage.getItem(`${currentCPU}input`);
		document.getElementById('AssemblyOutput').innerHTML = localStorage.getItem(`${currentCPU}message`);
		outputEncoding = localStorage.getItem(`${currentCPU}encoding`);
		if (outputEncoding != 2) {
				let checkbox = document.getElementById('binhex');
				checkbox.checked = !checkbox.checked;
		}
	}
}

// returns array of lines, where any comments have been removed and all extra white spaces are removed
function getCleanText() {
	let inputText = AssemblyInput.value.toUpperCase().split('\n');

	// remove comments from cleaned text
	for (let i = 0; i < inputText.length; i++) {
		if (inputText[i].includes('//')) inputText[i] = inputText[i].substring(0, inputText[i].indexOf('//')); // works for inline comments as well

		inputText[i] = inputText[i].replace(/  +/g, ' ').replace(/,/g, '').trim();
	}

	return inputText;
}

function generatePopupHTML(error, id) {
	const popupSpan = document.createElement('span');
	popupSpan.setAttribute('id', id);
	popupSpan.setAttribute('class', 'popupError');
	popupSpan.innerHTML = error.message.replace(/\n/g,'<br>');

	return popupSpan;
}

function createSymbolTable(inputText, opcodes) {
	let errorArray = [];

	let symbolTable = new Map();

	let address = 0;

	for (let [i, line] of inputText.entries()) {		
		if (line !== '') {			
			line = line.split(' '); // split each line into array of tokens
			const FIRST_TOKEN = line[0];

			if (FIRST_TOKEN[FIRST_TOKEN.length - 1] === ':') { // last char of first token
				let valid = true;
				
				if (line.length < 2) {
					valid = false;
					let error = new AssemblerError('OPCODE required after label.', FIRST_TOKEN);

					error.lineNumber = i;
					errorArray.push(error);
				}

				if (opcodes.includes(FIRST_TOKEN.slice(0, -1))) { // label is an opcode
					valid = false;
					let error = new AssemblerError('Invalid label name!\nReserved for OPCODE.', FIRST_TOKEN);
	
					error.lineNumber = i;
					errorArray.push(error);
				}
	 
				if (symbolTable.get(FIRST_TOKEN.slice(0, -1))) { // entry already exists in symbol table
					valid = false;
					let error = new AssemblerError('Invalid label name!\nSymbol is a redefinition.', FIRST_TOKEN);
	
					error.lineNumber = i;
					errorArray.push(error);
				}

				if (valid) {
					symbolTable.set(FIRST_TOKEN.slice(0, -1), {address: address, used: false});
					inputText[i] = inputText[i].replace(`${FIRST_TOKEN}`,'').trim(); // remove symbol from line and extra whitespace
				}
			}
			

			address++;
		}
	}
	if (errorArray.length != 0) throw new MultipleErrors('Symbol Table errors detected!', errorArray);

	return symbolTable;
}

function attachErrorToDiv(tokenError, div, inputLine) {
	// copy current line in ouput as a bunch of spans with id same as posisiton and line                    
	let splitLine = inputLine.trim().split(' '); // extracting tokens
	splitLine.push(' '); // add trailing white space for any missing tokens
	// [ "MOV", "R0", "#", " " ]

	for(let [i, token] of splitLine.entries()){
		let pos = inputLine.indexOf(token) + 1; // so that if tok not in array (white space not found) pos is 0 rather than -1                   

		let errorSpan = document.createElement('span');
		
		if(tokenError[0] && tokenError[0].errToken === token) {
			
			token = (token == " ") ? '&nbsp;' : token; // strange solution to display white space in span

			errorSpan.setAttribute('class', 'highlightError');
			errorSpan.setAttribute('id', `error${i}${pos}`);   

			errorSpan.appendChild(generatePopupHTML(tokenError.shift(), `popup${i}${pos}`)) // send first error object from array to function, then remove the element
		
		} else { 
			errorSpan.setAttribute('id', `${i}${pos}`);
		}
						
		errorSpan.innerHTML += token;
		div.appendChild(errorSpan);
		div.innerHTML += i < splitLine.length - 1 ? ' ' : ''; // kind of a botch

	}
}

// expects list of errors by line 
function showErrors(errors){
	let inputText = getCleanText();

	for (let errorLine of errors.errorArray) {

		let lineDiv = document.getElementById(`line${errorLine.lineNumber}`); // div created in run assembler
		lineDiv.innerHTML = `<span class="errorText">Error: </span>`;

		if(errorLine instanceof MultipleErrors) { 
			// OpCodeResolver errors
			attachErrorToDiv(errorLine.errorArray, lineDiv, inputText[errorLine.lineNumber]);
		} else if (errorLine instanceof AssemblerError) { 
			// symbol table errors
			attachErrorToDiv([errorLine], lineDiv, inputText[errorLine.lineNumber]);
		} else { // unknown error throw unhandled
			throw errors;
		}
	}
}

function runAssembler(){
	let inputText = getCleanText(); // array of input lines with all extra stuff removed


	localStorage.setItem(`${currentCPU}input`, AssemblyInput.value); // update input text save
	
	// reset attribute value 
	downloadButton.setAttribute('downloadable', 'false');

	// remove all childs of div to clear the output (better than innerHtml = '' which causes memory leaks)
	while (AssemblyOutput.firstChild) {
		AssemblyOutput.removeChild(AssemblyOutput.firstChild);
	}
	// create new divs for every line
	for(let [i, _inputLine] of inputText.entries()){
		let lineDiv = document.createElement('div');
		lineDiv.setAttribute('id',`line${i}`)
		lineDiv.innerHTML = '<br>';
		AssemblyOutput.appendChild(lineDiv);
	}


	let symbolTable;
	
	try { // try to generate a symbol table, will throw errors by line if it fails
		// dictionary where key is the symbol string and the value is an array with address and boolean to keep track of its usage
		symbolTable = createSymbolTable(inputText, Object.keys(currentAssembler.OPCODES)); // function that finds all symbols in input text
	
		let assemblerErrors = [];

		for(let [i, inputLine] of inputText.entries()){
			let lineDiv = document.getElementById(`line${i}`);
			
			if(inputLine != ''){				
				try {

					let resolvedOpCode = currentAssembler.OpCodeResolver(inputLine, outputEncoding, symbolTable); // beacuse EEP1 will always have symbol table

					lineDiv.innerHTML = `${resolvedOpCode}<br>`;

				} catch(errs) {				
					//errors found therefore update the download div so it doesn't work
					downloadButton.setAttribute('downloadable', 'false');

					errs.lineNumber = i;

					assemblerErrors.push(errs);
				}

				
			} else {
				lineDiv.innerHTML = '<br>';
			}
			
		}
		if(assemblerErrors.length > 0) {
			throw new MultipleErrors('Multiple Assembler Errors detected!', assemblerErrors);
		}
		//finished going through input lines, check if all symbols have been used:

		let warningDiv = document.createElement('div');
		warningDiv.setAttribute('id', 'warnings');

		for(const [symbol, obj] of symbolTable){
			if(!obj.used){ // symbol hasn't been used:				
				warningDiv.innerHTML += `Warning: ${symbol} was never used<br>`;
			}
		}

		if (warningDiv.innerHTML != '') AssemblyOutput.appendChild(warningDiv);
	

		downloadButton.setAttribute('downloadable', 'true'); // is downloadable only if nothing thrown up to here

		//save new output to local stoage
		localStorage.setItem(`${currentCPU}message`, AssemblyOutput.innerHTML);
		localStorage.setItem(`${currentCPU}encoding`, outputEncoding);

	} catch(errs) {
		if(errs instanceof MultipleErrors){	

			showErrors(errs);
		} else {

			throw errs;
		}
	}
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

// function that update the lines numbers
function updateLines(){
	let inputText = getCleanText();
	let numNewlines = inputText.length;
	
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
		if(inputText[i] == ''){
			document.getElementById(i).innerHTML = '|';
		} else {
			document.getElementById(i).innerHTML = `0x${lineCounter.toString(16).toUpperCase()}`;
			lineCounter++;
		}
	}

	runAssembler();
}

// synchronize scrolling
function syncScrollFunc(){
	let top = this.scrollTop;

	for(let elem of syncScroll){
			elem.scrollTop = top;
	}
}

// download functions, when button is pressed .ram file is generated on the users computer
// could be implemented much better using File System Access API
// https://web.dev/file-system-access
function downloadFile() {
	// check if current assembly is actually downladable
	if(downloadButton.getAttribute('downloadable') == 'true'){
		//set encoding to Hex and re run the assembler:
		if (outputEncoding == 2) {
			let checkbox = document.getElementById('binhex');
			checkbox.checked = !checkbox.checked;
			switchModes();
		}
		
		// generate string of file to be downloaded
		let content = Array.from(AssemblyOutput.children);

		let outputFile = '';
		let addressCounter = 0;
		for(let i = 0; i < numLines; i++){
			let outputLine = content[i].innerHTML.replace('<br>','');
			if(outputLine != '') {
				outputFile += `0x${addressCounter.toString(16)}\t${outputLine}\n`;
				addressCounter += 1;
			}
		}

		// https://ourcodeworld.com/articles/read/189/how-to-create-a-file-and-generate-a-download-with-javascript-in-the-browser-without-a-server
		// actual downloading bit
		let element = document.createElement('a');
		element.setAttribute('href', `data:text/plain;charset=utf-8,${encodeURIComponent(outputFile)}`);
		element.setAttribute('download', `${currentCPU}_file.ram`);

		element.style.display = 'none';
		document.body.appendChild(element);
		element.click();

		document.body.removeChild(element);

	} else {
		//alert message that occours when trying to download with an error active
		alert('Fix errors in assembly');
	}
}