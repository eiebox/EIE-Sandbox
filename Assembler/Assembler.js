// HTML consts
const AssemblyInput = document.getElementById('AssemblyInput');
const lineNumberDiv = document.getElementById('lineNumbers');
const AssemblyOutput = document.getElementById('AssemblyOutput');
const downloadButton = document.getElementById('downloadBttn');

// Synchronisse scrolling array
const syncScroll = [AssemblyInput, lineNumberDiv, AssemblyOutput];

// Assembler versions
const assemblerVersions = ['EEP0', 'EEP1'];

// Assembler Globals
let outputEncoding = 2;
let numLines = 0;
let currentCPU;
let currentAssembler; // global module that gets imported on load 

// Assign event listeners
window.addEventListener('load', initAssembler);
for(elem of syncScroll)	elem.addEventListener('scroll', syncScrollFunc); // synchronised scrolling


// called by body on load
function initAssembler() {
	// returns object with all GET parameters in current url string
	const urlParams = new URLSearchParams(window.location.search);
	currentCPU = urlParams.get('cpu');
	if (!assemblerVersions.includes(currentCPU)) alert('Invalid Assembler Version! Undefined behaviour.');

	import(`../js/${currentCPU}.js`).then(module => {
		// assign just loaded module to global variable
		currentAssembler = module;

		// assign these listeners that can only work after assembler initialisation
		downloadButton.addEventListener('click', downloadFile); // download button
		AssemblyInput.addEventListener('input', updateLines); // text area
		updateLines();
	}, err => { throw err; });

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

		inputText[i] = inputText[i].replace(/  +/g, ' ').trim();
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
	let symbolTable = new Map();

	let lineNumber = 0;

	for (line of inputText) {
		if (line !== '') {
			line = line.replace(/  +/g, ' ').split(' ');
			
			if (line[0][line[0].length - 1] === ':' && !opcodes.includes(line[0])) {
				symbolTable.set(line[0].slice(0, -1), {address: lineNumber, used: false});
			}
			lineNumber++;
		}
	}

	return symbolTable;
}

function runAssembler(){
	
	localStorage.setItem(`${currentCPU}input`, AssemblyInput.value);
	let inputText = getCleanText();
	
	// reset attribute value 
	downloadButton.setAttribute('downloadable', 'true');
	
	let symbolTable;
	
	if (currentCPU == 'EEP1') {
		// dictionary where key is the symbol string and the value is an array with address and boolean to keep track of its usage
		let symbolTable = createSymbolTable(inputText, Object.keys(currentAssembler.OPCODES)); // function that finds all symbols in input text
		console.log(symbolTable);
	}
	
	let Message = "";
	let lineCounter = 0;
	for(i in inputText){
		if(inputText[i] != ''){
			try {
				if (currentCPU == 'EEP1') {

					let resolvedOpCode = currentAssembler.OpCodeResolver(inputText[i], outputEncoding, symbolTable); // beacuse EEP1 will always have symbol table

					if (resolvedOpCode.length > 1) {
						// if there was a new symbol found, update the table with the line value
						symbolTable[resolvedOpCode[1]][0] = lineCounter;
					}

					//console.log(symbolTable);
					Message += `${resolvedOpCode[0]}\n`;

				} else {
					Message += `${currentAssembler.OpCodeResolver(inputText[i], outputEncoding)}\n`;
				}
			} catch(errs) {				
				//errors found therefore update the download div so it doesn't work
				downloadButton.setAttribute('downloadable','false');

				Message += `<span class="errorText">Error: </span>`;

				if(errs.length > 0){	

					// copy current line in ouput as a bunch of spans with id same as posisiton and line                    
						// copy current line in ouput as a bunch of spans with id same as posisiton and line                    
					// copy current line in ouput as a bunch of spans with id same as posisiton and line                    
					splitLine = inputText[i].replace(/,/g,"").trim().split(" "); // extracting tokens
					splitLine.push(" "); // add trailing white space for any missing tokens
					// [ "MOV", "R0", "#", " " ]
				
					for(let [i2, tok] of splitLine.entries()){
						let pos = inputText[i].indexOf(tok) + 1; // so that if tok not in array (white space not found) pos is 0 rather than -1                   

						let errorSpan = document.createElement('span');
						
						if(errs[0] && errs[0].errToken === tok) {
							// strange solution to display white space in span
							tok = (tok == " ") ? '&nbsp;' : tok;                            
								tok = (tok == " ") ? '&nbsp;' : tok;                            
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

	//finished going through input lines, check if all symbols have been used:
	// if (currentCPU == 'EEP1') {
	// 	for(let symbol in symbolTable){
	// 		//console.log(symbolArr);
	// 		if(!symbolTable[symbol][1]){
	// 			//symbol hasn't been used:
	// 			Message += `Warning: ${symbol} was never used\n`;
	// 		}
	// 	}
	// }

	Message = Message.replace(/\n/g, '<br>');

	//save data to local stoage
	localStorage.setItem(`${currentCPU}message`, Message);
	localStorage.setItem(`${currentCPU}encoding`, outputEncoding);
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
					document.getElementById(i).innerHTML = `0x${lineCounter.toString(16)}`;
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

// download functions, when button is pressed .ram file is generated on the users computer
// could be implemented much better using File System Access API
// https://web.dev/file-system-access
function downloadFile() {
	// check if current assembly is actually downladable
	if(downloadButton.getAttribute('downloadable') == 'true'){
		console.log('downloading file');
		
		// generate string of file to be downloaded
		let content = AssemblyOutput.innerHTML;

		content = content.split('<br>');

		let outputFile = '';

		for(let i = 0; i < numLines; i++){
			if(content[i] == ''){
				// skip line and keep counter the same
				i--;
			} else {
				outputFile += `0x${i.toString(16)}\t${content[i]}\n`;
			}
		}

		// https://ourcodeworld.com/articles/read/189/how-to-create-a-file-and-generate-a-download-with-javascript-in-the-browser-without-a-server
		// actual downloading bit
		let element = document.createElement('a');
		console.log(outputFile);
		element.setAttribute('href', `data:text/plain;charset=utf-8,${outputFile}`);
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