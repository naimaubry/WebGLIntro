'use strict';

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

	const vsText= `precision highp float;

attribute vec2 vPos;

void main() {
    gl_Position = vec4(vPos, 0.0, 1.0);
}`;
	const fsText= `precision highp float;

uniform vec2 viewportDimensions;
uniform float minI;
uniform float maxI;
uniform float minR;
uniform float maxR;

void main()
{
	// [0, 1080] -> [-2.0, 2.0] (1): Multiply by (2.0 - -2.0) / (1080 - 0)
	// [0, 4.0] -> [-2.0, 2.0]  (2): Subtracting 2.0 from result
	// [-2.0, 2.0]
	// 
	vec2 c = vec2(
		gl_FragCoord.x * (maxR - minR) / viewportDimensions.x + minR,
		gl_FragCoord.y * (maxI - minI) / viewportDimensions.y + minI
	);

	// Mandelbrot formula
	vec2 z = c;
	float iterations = 0.0;
	float maxIterations = 4000.0;
	const int imaxIterations = 4000;

	for (int i = 0; i < imaxIterations; i++) {
		float t = 2.0 * z.x * z.y + c.y;      //z^2 = x^2 - y^2 + 2ixy for complex
		z.x = z.x * z.x - z.y * z.y + c.x;
		z.y = t;

		if (z.x * z.x + z.y * z.y > 4.0) {
			break;
		}

		iterations += 1.0;
	}

	if (iterations < maxIterations) {
		discard;
	} else {
		gl_FragColor = vec4(0.0, 0.0, 1.0, 1.0);
	}
}`;

 RunDemo(vsText,fsText);
 
}

function RunDemo(vsText,fsText) {
	// Attach callbacks
	AddEvent(window, 'resize', OnResizeWindow);
	AddEvent(window, 'wheel', OnZoom);
	AddEvent(window, 'mousemove', OnMouseMove);

	var canvas = document.getElementById('gl-surface');
	var gl = canvas.getContext('webgl');
	if (!gl) {
		console.log('Webgl context not available - falling back on experimental');
		gl = canvas.getContext('experimental-webgl');
	}
	if (!gl) {
		alert('Cannot get WebGL context - browser does not support WebGL');
		return;
	}

	// Create shader program
	var vs = gl.createShader(gl.VERTEX_SHADER);
    console.log(vsText)
	gl.shaderSource(vs, vsText);
	gl.compileShader(vs);
	if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
		console.error(
			'Vertex shader compile error:',
			gl.getShaderInfoLog(vs)
		);
	}

	var fs = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fs, fsText);
	gl.compileShader(fs);
	if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
		console.error(
			'Fragment shader compile error:',
			gl.getShaderInfoLog(fs)
		);
	}

	var program = gl.createProgram();
	gl.attachShader(program, vs);
	gl.attachShader(program, fs);
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		console.error(
			'Shader program link error:',
			gl.getShaderInfoLog(program)
		);
	}

	gl.validateProgram(program);
	if (!gl.getProgramParameter(program, gl.VALIDATE_STATUS)) {
		console.error(
			'Shader program validate error:',
			gl.getShaderInfoLog(program)
		);
	}

	gl.useProgram(program);

	// Get uniform locations
	var uniforms = {
		viewportDimensions: gl.getUniformLocation(program, 'viewportDimensions'),
		minI: gl.getUniformLocation(program, 'minI'),
		maxI: gl.getUniformLocation(program, 'maxI'),
		minR: gl.getUniformLocation(program, 'minR'),
		maxR: gl.getUniformLocation(program, 'maxR')
	};

	// Set CPU-side variables for all of our shader variables
	var vpDimensions = [canvas.clientWidth, canvas.clientHeight];
	var minI = -2.0;
	var maxI = 2.0;
	var minR = -2.0;
	var maxR = 2.0;

	// Create buffers
	var vertexBuffer = gl.createBuffer();
	var vertices = [
		-1, 1,
		-1, -1,
		1, -1,
		
		-1, 1,
		1, 1,
		1, -1
	];
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

	var vPosAttrib = gl.getAttribLocation(program, 'vPos');
	gl.vertexAttribPointer(
		vPosAttrib,
		2, gl.FLOAT,
		gl.FALSE,
		2 * Float32Array.BYTES_PER_ELEMENT,
		0
	);
	gl.enableVertexAttribArray(vPosAttrib);

	var thisframetime;
	var lastframetime = performance.now();
	var dt;
	var frames = [];
	var lastPrintTime = performance.now();
	var loop = function () {
		// FPS information
		thisframetime = performance.now();
		dt = thisframetime - lastframetime;
		lastframetime = thisframetime;
		frames.push(dt);
		if (lastPrintTime + 750 < thisframetime) {
			lastPrintTime = thisframetime;
			var average = 0;
			for (var i = 0; i < frames.length; i++) {
				average += frames[i];
			}
			average /= frames.length;
			document.title = 1000 / average + ' fps';
		}
		frames = frames.slice(0, 250);
		 
		// Draw
		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);

		gl.uniform2fv(uniforms.viewportDimensions, vpDimensions);
		gl.uniform1f(uniforms.minI, minI);
		gl.uniform1f(uniforms.maxI, maxI);
		gl.uniform1f(uniforms.minR, minR);
		gl.uniform1f(uniforms.maxR, maxR);

		gl.drawArrays(gl.TRIANGLES, 0, 6);

		requestAnimationFrame(loop);
	};
	requestAnimationFrame(loop);

	OnResizeWindow();

	//
	// Event Listeners
	//
	function OnResizeWindow() {
		if (!canvas) {
			return;
		}

		// This maybe not a good idear, just do it for convenient.
		// See more at https://webglfundamentals.org/webgl/lessons/webgl-anti-patterns.html
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		vpDimensions = [canvas.clientWidth, canvas.clientHeight];

		var oldRealRange = maxR - minR;
		maxR = (maxI - minI) * (canvas.clientWidth / canvas.clientHeight) / 1.4 + minR;
		var newRealRange = maxR - minR;

		minR -= (newRealRange - oldRealRange) / 2;
		maxR = (maxI - minI) * (canvas.clientWidth / canvas.clientHeight) / 1.4 + minR;

		gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
	}

	function OnZoom(e) {
		var imaginaryRange = maxI - minI;
		var newRange;
		if (e.deltaY < 0) {
			newRange = imaginaryRange * 0.95;
		} else {
			newRange = imaginaryRange * 1.05;
		}

		var delta = newRange - imaginaryRange;

		minI -= delta / 2;
		maxI = minI + newRange;

		OnResizeWindow();
	}

	function OnMouseMove(e) {
		if (e.buttons === 1) {
			var iRange = maxI - minI;
			var rRange = maxR - minR;

			var iDelta = (e.movementY / canvas.clientHeight) * iRange;
			var rDelta = (e.movementX / canvas.clientWidth) * rRange;

			minI += iDelta;
			maxI += iDelta;
			minR -= rDelta;
			maxR -= rDelta;
		}
	}
}