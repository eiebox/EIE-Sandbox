// HTML consts
const AssemblyInput = document.getElementById('AssemblyInput');
const lineNumberDiv = document.getElementById('lineNumbers');
const AssemblyOutput = document.getElementById('AssemblyOutput');
const downloadButton = document.getElementById('downloadBttn');

// synchronize scrolling array
let syncScroll = [AssemblyInput, lineNumberDiv, AssemblyOutput];

//Assembler Globals
let outputEncoding = 2;
let numLines = 0;
let currentCPU;


function onLoadFunc(){
	// returns object with all GET parameters in current url string
	const urlParams = new URLSearchParams(window.location.search);
	currentCPU = urlParams.get('cpu');
	console.log(currentCPU);

	// Change HTML to match current CPU
	document.getElementById('HeadTitle').innerHTML = `${currentCPU} Assembler`;
	document.getElementById('MiddleBarTitle').innerHTML = `[${currentCPU} - ASSEMBLER]`;

	// Load Data from LocalStorage
	if(localStorage.getItem(`${currentCPU}input`) != null){
		document.getElementById('AssemblyInput').innerHTML = localStorage.getItem(`${currentCPU}input`);
		document.getElementById('AssemblyOutput').innerHTML = localStorage.getItem(`${currentCPU}message`);
		outputEncoding = localStorage.getItem(`${currentCPU}encoding`);
		if (outputEncoding != 2){
				let checkbox = document.getElementById('binhex');
				checkbox.checked = !checkbox.checked;
				runAssembler();
		}
	}

	updateLines();

	// ACTION LISTENERS

	// action listener for downlaod button
	downloadButton.addEventListener('click',downloadFile);
			
	// Action listener for text area
	AssemblyInput.addEventListener("input", updateLines);

	// add action listener for synchronized scrolling
	for(elem of syncScroll){
			elem.addEventListener("scroll",syncScrollFunc);
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
	let Message = "";
	AssemblyOutput.style.color = "white";
	let InputText = AssemblyInput.value.toUpperCase();
	localStorage.setItem(`${currentCPU}input`, InputText);

	InputText = InputText.split('\n');

	// Diego I'm sure you can find a better solution to this 
	//importing the correct js file for this CPU
	import(`../js/${currentCPU}.js`)
		.then(module => {	

		// reset attribute value 
		downloadButton.setAttribute('downloadable','true');

    // dictionary where key is the symbol string and the value is an array with address and boolean to keep track of its usage
    let symbolTable = new Array();
		let lineCounter = 0;
		for(i in InputText){
			if(InputText[i] != ""){
					try{
            if (currentCPU == 'EEP1') {
              let resolvedOpCode = module.OpCodeResolver(InputText[i], outputEncoding, symbolTable);
              if (resolvedOpCode.length > 1) {
                // if there was a new symbol found, update the table with the line value
                symbolTable[resolvedOpCode[1]][0] = lineCounter;
              }
              //console.log(symbolTable);
              Message += `${resolvedOpCode[0]}\n`;
            } else {
              Message += `${module.OpCodeResolver(InputText[i], outputEncoding)}\n`;
            }
								
					} catch(errs) {
							// console.log(errs);

							//errors found therefore update the download div so it doens't work
							downloadButton.setAttribute('downloadable','false');

							Message += `<span class="errorText">Error: </span>`;
							
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

    //finished going through input lines, check if all symbols have been used:
    if (currentCPU == 'EEP1') {
      for(let symbol in symbolTable){
        //console.log(symbolArr);
        if(!symbolTable[symbol][1]){
          //symbol hasn't been used:
          Message += `Warning: ${symbol} was never used\n`;
        }
      }
    }

		Message = Message.replace(/\n/g, '<br>');

		//save data to local stoage
		localStorage.setItem(`${currentCPU}message`, Message);
		localStorage.setItem(`${currentCPU}encoding`, outputEncoding);

		AssemblyOutput.innerHTML = Message;
	})
	.catch(err => {
		console.log(err);
	});	
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
		alert('Fix errors in assembly');
	}
}