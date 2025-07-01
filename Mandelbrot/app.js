'use strict';

var canvas, gl;

function loadShaderAsync(shaderURL, callback) {
	var req = new XMLHttpRequest();
	req.open('GET', shaderURL, true);
	req.onload = function () {
		if (req.status < 200 || req.status >= 300) {
			callback('Could not load ' + shaderURL);
		} else {
			callback(null, req.responseText);
		}
	};
	req.send();
}

// Taken from http://stackoverflow.com/questions/641857/javascript-window-resize-event
//  Post by user Alex V
function AddEvent(object, type, callback) {
    if (object == null || typeof(object) == 'undefined') return;
    if (object.addEventListener) {
        object.addEventListener(type, callback, false);
    } else if (object.attachEvent) {
        object.attachEvent("on" + type, callback);
    } else {
        object["on"+type] = callback;
    }
};

function RemoveEvent(object, type, callback) {
    if (object == null || typeof(object) == 'undefined') return;
    if (object.removeEventListener) {
        object.removeEventListener(type, callback, false);
    } else if (object.detachEvent) {
        object.detachEvent("on" + type, callback);
    } else {
        object["on"+type] = callback;
    }
};

function Init() { 
    async.map({
        vsText: '/mandl.vs.glsl', //vertex shader
        fsText: '/mandl.fs.glsl'  //fragment shader
    }, loadShaderAsync, RunDemo);
}

function RunDemo(loadErrors, loadedShaders) {
    console.log(loadErrors);
    console.log(loadedShaders);

    // Attach callbacks
    AddEvent(window, 'resize', OnResizeWindow);

    canvas = document.getElementById('gl-surface');
    gl = canvas.getContext('webgl');
    if (!gl){
        console.log('WebGL context not available - falling back on experimental');
        gl = canvas.getContext('experimental-webgl');
    }
    if (!gl){
        alert('Cannot get WebGL context - browser does not support WebL');
        return;
    }

    OnResizeWindow();

   // Create shader program
	var vs = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vs, loadedShaders.vsText);
	gl.compileShader(vs);
	if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
		console.error(
			'Vertex shader compile error:',
			gl.getShaderInfoLog(vs)
		);
	}

	var fs = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fs, loadedShaders.fsText);
	gl.compileShader(fs);
	if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
		console.error(
			'Fragment shader compile error:',
			gl.getShaderInfoLog(fs)
		);
	}

    // Create buffers


    var loop = function () {
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
        requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
}

function OnResizeWindow() {
    if (!canvas){
        return;
    }

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    gl.viewport(0,0, canvas.width, canvas.height);

}