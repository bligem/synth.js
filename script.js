var AudioContext = window.AudioContext || window.webkitAudioContext;
const keyMappings = {
    'A': { note: 'C4', frequency: 261.63 },
    'W': { note: 'Db4', frequency: 277.18 },
    'S': { note: 'D4', frequency: 293.66 },
    'E': { note: 'Eb4', frequency: 311.13 },
    'D': { note: 'E4', frequency: 329.63 },
    'F': { note: 'F4', frequency: 349.23 },
    'T': { note: 'Gb4', frequency: 369.99 },
    'G': { note: 'G4', frequency: 392.00 },
    'Y': { note: 'Ab4', frequency: 415.30 },
    'H': { note: 'A4', frequency: 440 },
    'U': { note: 'Bb4', frequency: 466.16 },
    'J': { note: 'B4', frequency: 493.88 },
    'K': { note: 'C5', frequency: 523.25 },
    'O': { note: 'Db5', frequency: 554.37 },
    'L': { note: 'D5', frequency: 587.33 },
    'P': { note: 'Eb5', frequency: 622.25 },
    ';': { note: 'E5', frequency: 659.25 },
    "'": { note: 'F5', frequency: 698.46 },
};


const context = new AudioContext();
const volumeGain = context.createGain();
const analyser = context.createAnalyser();
analyser.fftSize = 4096;
const bufferLength = analyser.frequencyBinCount;
const dataArray = new Uint8Array(bufferLength);

const canvas = document.getElementById('visualizer');
const canvasCtx = canvas.getContext('2d');
const WIDTH = canvas.width;
const HEIGHT = canvas.height;

const analyzerCanvas = document.getElementById('analyzer');
const analyzerCtx = analyzerCanvas.getContext('2d');
const ANALYZER_WIDTH = analyzerCanvas.width;
const ANALYZER_HEIGHT = analyzerCanvas.height;

canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

function drawAnalyzers() {
    const drawVisual = requestAnimationFrame(drawAnalyzers);

    analyser.getByteTimeDomainData(dataArray);

    canvasCtx.fillStyle = "rgb(200 200 200)";
    canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = "rgb(0 0 0)";
    canvasCtx.beginPath();
    const sliceWidth = WIDTH / bufferLength;
    let x = 0;
    for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * (HEIGHT / 2);

        if (i === 0) {
            canvasCtx.moveTo(x, y);
        } else {
            canvasCtx.lineTo(x, y);
        }

        x += sliceWidth;
    }
    canvasCtx.lineTo(WIDTH, HEIGHT / 2);
    canvasCtx.stroke();

    analyser.getByteFrequencyData(dataArray);

    analyzerCtx.fillStyle = "rgb(0 0 0)";
    analyzerCtx.fillRect(0, 0, ANALYZER_WIDTH, ANALYZER_HEIGHT);
    const barWidth = (ANALYZER_WIDTH / bufferLength) * 2.5;
    let barHeight;
    x = 0;
    for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;

        analyzerCtx.fillStyle = `rgb(${barHeight + 100}, 255, 255)`;
        analyzerCtx.fillRect(x, ANALYZER_HEIGHT - barHeight / 2, barWidth, barHeight);

        x += barWidth + 1;
    }
}


volumeGain.connect(context.destination);
volumeGain.gain.value = 0.1;

let attackTime = 0.3;
let sustainLevel = 1;
let releaseTime = 0.3;

let modFreq = 100;
let modDepth = 50;

const volumeControl = document.querySelector('#volume-control');
const attackControl = document.querySelector('#attack-control');
const sustainControl = document.querySelector('#sustain-control');
const releaseControl = document.querySelector('#release-control');

const modFrequencyInput = document.querySelector('#mod-frequency');
const modDepthInput = document.querySelector('#mod-depth');

volumeControl.addEventListener('input', function () {
    volumeGain.gain.value = this.value;
});

attackControl.addEventListener('input', function () {
    attackTime = parseFloat(this.value);
});

sustainControl.addEventListener('input', function () {
    sustainLevel = parseFloat(this.value);
});

releaseControl.addEventListener('input', function () {
    releaseTime = parseFloat(this.value);
});

modFrequencyInput.addEventListener('input', function () {
    modFreq = parseInt(this.value);
});

modDepthInput.addEventListener('input', function () {
    modDepth = parseFloat(this.value);
});

let amFreq = 100;
let amDepth = 0;

const amFrequencyInput = document.querySelector('#am-frequency');
const amDepthInput = document.querySelector('#am-depth');

amFrequencyInput.addEventListener('input', function () {
    amFreq = parseInt(this.value);
    updateAmplitudeModulation();
});

amDepthInput.addEventListener('input', function () {
    amDepth = parseFloat(this.value);
    updateAmplitudeModulation();
});

function updateAmplitudeModulation() {
    Object.values(activeOscillators).forEach(({ amGain }) => {
        amGain.gain.setValueAtTime(amDepth, context.currentTime);
    });
}


function updateModulatorFrequency() {
    Object.values(activeOscillators).forEach(({ lfo }) => {
        lfo.frequency.setValueAtTime(modFreq, context.currentTime);
    });
}

function updateModulatorDepth() {
    Object.values(activeOscillators).forEach(({ lfoGain }) => {
        lfoGain.gain.setValueAtTime(modDepth, context.currentTime);
    });
}

const waveforms = document.getElementsByName('waveform');
const FMwaveforms = document.getElementsByName('FMwaveform');
let waveform = "sine";
let FMwaveform = "sine";

function setWaveform() {
    for (let i = 0; i < waveforms.length; i++) {
        if (waveforms[i].checked) {
            waveform = waveforms[i].value;
        }
    }

    for (let i = 0; i < FMwaveforms.length; i++) {
        if (FMwaveforms[i].checked) {
            FMwaveform = FMwaveforms[i].value;
        }
    }
}

waveforms.forEach((waveformInput) => {
    waveformInput.addEventListener('change', function () {
        setWaveform();
    });
});

FMwaveforms.forEach((waveformInput) => {
    waveformInput.addEventListener('change', function () {
        setWaveform();
    });
});


const activeOscillators = {}; // To store active oscillators for each key

document.addEventListener('keydown', function (event) {

    const key = event.key.toUpperCase();
    const mapping = keyMappings[key];
    if (mapping && !activeOscillators[key]) {
        const { note, frequency } = mapping;
        const osc = context.createOscillator();
        const noteGain = context.createGain();
        noteGain.connect(analyser);

        const lfo = context.createOscillator();
        const lfoGain = context.createGain();

        const amGain = context.createGain();
        const amOsc = context.createOscillator();

        // amOsc.type = 'sine';
        // amOsc.frequency.setValueAtTime(amFreq, 0);
        // amOsc.connect(amGain);
        // amGain.gain.setValueAtTime(amDepth, context.currentTime);
        // amGain.connect(osc.gain); 
        // amOsc.start(0);

        lfo.type = FMwaveform;
        lfo.frequency.setValueAtTime(modFreq, 0);
        lfo.connect(lfoGain);
        lfo.start(0);
        lfoGain.gain.setValueAtTime(modDepth, 0)
        lfoGain.connect(osc.frequency)

        noteGain.gain.setValueAtTime(0, context.currentTime);
        noteGain.gain.linearRampToValueAtTime(sustainLevel, context.currentTime + attackTime);

        osc.type = waveform;
        osc.frequency.setValueAtTime(frequency, context.currentTime);
        osc.start(context.currentTime);
        osc.connect(noteGain);
        noteGain.connect(volumeGain);
        activeOscillators[key] = { osc, noteGain, lfo, lfoGain, amGain }; // Store the active oscillator for the key
    }
});


document.addEventListener('keyup', function (event) {
    const key = event.key.toUpperCase();
    if (activeOscillators[key]) {
        const { osc, noteGain } = activeOscillators[key];
        noteGain.gain.setValueAtTime(noteGain.gain.value, context.currentTime); // Fix sustain point
        noteGain.gain.linearRampToValueAtTime(0, context.currentTime + releaseTime);
        osc.stop(context.currentTime + releaseTime);
        delete activeOscillators[key]; // Remove the oscillator from the active list
    }
});

window.addEventListener('blur', function () {
    Object.keys(activeOscillators).forEach(key => {
        const { osc, noteGain } = activeOscillators[key];
        noteGain.gain.setValueAtTime(noteGain.gain.value, context.currentTime); // Fix sustain point
        noteGain.gain.linearRampToValueAtTime(0, context.currentTime + releaseTime);
        osc.stop(context.currentTime + releaseTime);
        delete activeOscillators[key];
    });
});
drawAnalyzers()
