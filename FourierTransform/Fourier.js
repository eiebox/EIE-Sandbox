var canvas = document.getElementById("FourierCanvas");
var ctx = canvas.getContext("2d");
ctx.canvas.width  = window.innerWidth;
ctx.canvas.height = window.innerHeight;
var mousedown;

function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top
    };
  }

function writeMessage(canvas, message) {
    var context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.font = '18pt Calibri';
    context.fillStyle = 'black';
    context.fillText(message, 1, 25);
}

function SetMouseDown() {
    mousedown = true;
}

function SetMouseUp() {
    mousedown = false;
}

canvas.addEventListener('mouseup', function(evt){
    ctx.beginPath();
    SetMouseUp();
})

canvas.addEventListener('mousemove', function(evt){
    if(!mousedown){
        console.log("MousenotDown");
        return;
    }
    var mousePos = getMousePos(canvas, evt);
    var message = 'Mouse Position Drag: ' + mousePos.x + ',' + mousePos.y;
    writeMessage(canvas, message);
    ctx.lineTo(mousePos.x, mousePos.y);
    ctx.stroke();
})

canvas.addEventListener('touchstart', function(evt){
    SetMouseDown();
})


canvas.addEventListener('touchend', function(evt){
    ctx.beginPath();
    SetMouseUp();
})

canvas.addEventListener('touchmove', function(evt){
    if(!mousedown){
        console.log("MousenotDown");
        return;
    }
    var mousePos = getMousePos(canvas, evt);
    var message = 'Mouse Position Drag: ' + mousePos.x + ',' + mousePos.y;
    writeMessage(canvas, message);
    ctx.lineTo(mousePos.x, mousePos.y);
    ctx.stroke();
})

canvas.addEventListener('mousedown', function(evt){
    SetMouseDown();
})