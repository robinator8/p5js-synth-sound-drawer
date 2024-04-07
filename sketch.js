/***********************
 *       SETTINGS       *
 ************************/

// How sensitive is the brush size to the pressure of the pen?
var pressureMultiplier = 10;

// What is the smallest size for the brush?
var minBrushSize = 1;

// Higher numbers give a smoother stroke
var brushDensity = 10;

var showDebug = true;

// Jitter smoothing parameters
// See: http://cristal.univ-lille.fr/~casiez/1euro/
var minCutoff = 0.0001; // decrease this to get rid of slow speed jitter but increase lag (must be > 0)
var beta = 1.0; // increase this to get rid of high speed lag

const SECONDS = 8;

/***********************
 *       GLOBALS        *
 ************************/
var xFilter, yFilter, pFilter;
var inBetween;
var amt, x, y, s, d;
var pressure = -2;
var waveCanvas,
  pitchCanvas,
  pitchUI,
  waveUI,
  waveSelector,
  piano1,
  piano2,
  canvas,
  controlPanel;
var isPressureInit = false;
var isDrawing = false;
var globalIsDrawingJustStarted = false;
var selectedWave = 0;
var audioPlayer;
var audioStarted = false;
var audioContext;
var startupSound;
var defaultWave;
var sampleRate;

var waves = [
  {
    name: "0",
    color: "#DA0E32",
  },
  {
    name: "1",
    color: "#F56B14",
  },
  {
    name: "2",
    color: "#F5AE01",
  },
  {
    name: "3",
    color: "#E2D700",
  },
  {
    name: "4",
    color: "#78D100",
  },
  {
    name: "5",
    color: "#1DAD8E",
  },
  {
    name: "6",
    color: "#3FB2F1",
  },
  {
    name: "7",
    color: "#3F4FE0",
  },
  {
    name: "8",
    color: "#9733F6",
  },
  {
    name: "9",
    color: "#C315B2",
  },
];

/***********************
 *       P5 FUNCS       *
 ************************/

function setupAudio() {
  audioContext = new AudioContext();
  audioContext.onstatechange = (event) => {
    const state = event.target.state;
    sampleRate = event.target.sampleRate;
    console.log("state", state);
    if (state == "running") {
      audioStarted = true;
    } else {
      audioStarted = false;
    }
  };
  document.body.onclick = () => {
    if (audioContext.state == "running") {
      return;
    }

    audioContext.resume().then(() => {
      audioStarted = true;
    });
    startupSound = document.getElementById("init-audio");
    startupSound.play();
  };
}

function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  canvas.id("canvas");
  // Wave windows
  {
    let x = windowWidth * 0.25;
    let y = 0;
    let w = windowWidth * 0.25;
    let h = windowHeight / 4;
    waves.forEach((wave) => {
      wave.canvas = new WaveCanvas(x, y, w, h, wave.color);
    });
    waveUI = new WaveUI(x, y, w, h);
  }
  {
    let x = windowWidth * 0.25;
    let y = windowHeight * 0.25;
    let w = windowWidth * 0.75;
    let h = windowHeight * 0.75 - 100;
    pitchCanvas = new PitchCanvas(x, y, w, h);
    pitchUI = new PitchUI(x, y, w, h);
  }
  waveSelector = new WaveSelector(0, 0, windowWidth * 0.25, windowHeight);
  piano1 = new Piano(
    windowWidth * 0.5,
    0,
    windowWidth * 0.25,
    windowHeight / 4,
    4,
  );
  piano2 = new Piano(
    windowWidth * 0.75,
    0,
    windowWidth * 0.25,
    windowHeight / 4,
    5,
  );
  controlPanel = new ControlPanel(
    windowWidth * 0.25,
    windowHeight - 100,
    windowWidth * 0.75,
    100,
  );
  canvas.background(245, 245, 245);
  audioPlayer = new AudioPlayer();
  setupAudio();
}

function draw() {
  waves[selectedWave].canvas.draw();
  waveUI.draw();
  pitchCanvas.draw();
  pitchUI.draw();
  waveSelector.draw();
  piano1.draw();
  piano2.draw();
  controlPanel.draw();
  if (
    !mouseIsPressed &&
    audioStarted &&
    audioPlayer.sound &&
    audioPlayer.sound.isPlaying
  ) {
    console.log("pause");
    audioPlayer.pause();
  }
  if (!audioStarted) {
    fill(0, 0, 0, 210);
    rect(0, 0, windowWidth, windowHeight);
    noStroke();
    fill(255, 255, 255);
    textAlign("center");
    textSize(50);
    text("Click To Start", windowWidth / 2, windowHeight / 2);
  }
}

function touchStarted() {
  interactionDown();
}

function mousePressed() {
  interactionDown();
}

function mouseClicked() {
  interactionUp();
}

function interactionDown() {
  if (!audioStarted) {
    console.log("not started");
    return;
  }

  piano1.mouseClicked();
  piano2.mouseClicked();
}

function interactionUp() {
  waveSelector.mouseClicked();
  controlPanel.mouseClicked();
}

function touchMoved() {}

function touchEnded() {
  interactionUp();
}

/***********************
 *       AUDIO PLAYER       *
 ************************/

class AudioPlayer {
  constructor() {
    this.initialized = false;
  }

  playNote(freq, periodicWave) {
    if (audioContext.state !== "running") {
      console.log("not running!");
      audioContext.resume().then(() => {
        console.log("Audio Context resumed!");
        this.loadAndPlay(freq, periodicWave);
      });
    } else {
      this.loadAndPlay(freq, periodicWave);
    }
  }

  loadAndPlay(freq, periodicWave) {
    console.log("play note", freq);
    if (
      this.sound &&
      this.sound.freq == freq &&
      this.sound.periodicWave == periodicWave
    ) {
      console.log("freq + wave match");
      if (!this.sound.isPlaying) {
        console.log("not playing");
        this.sound.osc.connect(audioContext.destination);
        this.sound.isPlaying = true;
      }
    } else {
      if (this.sound && this.sound.isPlaying) {
        this.pause();
      }

      var osc;
      if (!periodicWave) {
        if (!defaultWave) {
          defaultWave = timeDomainToPeriodicWave([0], -2);
        }
        console.log("no wave");
        periodicWave = defaultWave;
      } else {
        console.log("yes wave");
      }
      osc = new OscillatorNode(audioContext, {
        frequency: freq,
        type: "custom",
        periodicWave: periodicWave,
      });
      this.sound = {
        freq: freq,
        periodicWave: periodicWave,
        osc: osc,
        isPlaying: true,
      };
      osc.start();
      osc.connect(audioContext.destination);
      console.log("starting", this.sound);
    }
  }

  pause() {
    if (this.sound.isPlaying) {
      console.log("stoping");
      this.sound.osc.disconnect(audioContext.destination);
      this.sound.isPlaying = false;
    }
  }
}

/***********************
 *       PIANO          *
 ************************/

const WHITE_NOTES = [
  {
    note: "C",
    freq: [16.35, 32.7, 65.41, 130.81, 261.63, 523.25, 1046.5, 2093.0, 4186.01],
  },
  {
    note: "D",
    freq: [
      18.35, 36.71, 73.42, 146.83, 293.66, 587.33, 1174.66, 2349.32, 4698.63,
    ],
  },
  {
    note: "E",
    freq: [
      20.6, 41.2, 82.41, 164.81, 329.63, 659.25, 1318.51, 2637.02, 5274.04,
    ],
  },
  {
    note: "F",
    freq: [
      21.83, 43.65, 87.31, 174.61, 349.23, 698.46, 1396.91, 2793.83, 5587.65,
    ],
  },
  {
    note: "G",
    freq: [24.5, 49.0, 98.0, 196.0, 392.0, 783.99, 1567.98, 3135.96, 6271.93],
  },
  {
    note: "A",
    freq: [27.5, 55.0, 110.0, 220.0, 440.0, 880.0, 1760.0, 3520.0, 7040.0],
  },
  {
    note: "B",
    freq: [
      30.87, 61.74, 123.47, 246.94, 493.88, 987.77, 1975.53, 3951.07, 7902.13,
    ],
  },
];

const BLACK_NOTES = [
  {
    note: "C#",
    freq: [
      17.32, 34.65, 69.3, 138.59, 277.18, 554.37, 1108.73, 2217.46, 4434.92,
    ],
  },
  {
    note: "D#",
    freq: [
      19.45, 38.89, 77.78, 155.56, 311.13, 622.25, 1244.51, 2489.02, 4978.03,
    ],
  },
  null,
  {
    note: "F#",
    freq: [
      23.12, 46.25, 92.5, 185.0, 369.99, 739.99, 1479.98, 2959.96, 5919.91,
    ],
  },
  {
    note: "G#",
    freq: [
      25.96, 51.91, 103.83, 207.65, 415.3, 830.61, 1661.22, 3322.44, 6644.88,
    ],
  },
  {
    note: "A#",
    freq: [
      29.14, 58.27, 116.54, 233.08, 466.16, 932.33, 1864.66, 3729.31, 7458.62,
    ],
  },
];

class Piano {
  constructor(x, y, w, h, octave) {
    this.graphic = createGraphics(w, h);
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.octave = octave;

    this.graphic.stroke(100, 100, 100);
    this.graphic.fill(100, 100, 100);

    this.graphic.fill("white");
    this.graphic.stroke("black");
    WHITE_NOTES.forEach((note, i) => {
      note.x = (i * this.w) / WHITE_NOTES.length;
      note.y = 0;
      note.w = this.w / WHITE_NOTES.length;
      note.h = this.h;
      this.graphic.rect(note.x, note.y, note.w, note.h);
    });
    this.graphic.fill("black");
    this.graphic.stroke("black");
    BLACK_NOTES.forEach((note, i) => {
      if (!note) {
        return;
      }
      note.x = ((i + 2 / 3) * this.w) / WHITE_NOTES.length;
      note.y = 0;
      note.w = ((2 / 3) * this.w) / WHITE_NOTES.length;
      note.h = this.h / 2;
      this.graphic.rect(note.x, note.y, note.w, note.h);
    });
  }

  draw() {
    if (mouseIsPressed && audioStarted) {
      let note = this.mouseInside();
      if (note && note != this.playingNote) {
        audioPlayer.playNote(
          note.freq[this.octave],
          waves[selectedWave].canvas.periodicWave,
        );
        this.playingNote = note;
      } else if (!note && note != this.playingNote) {
        this.playingNote = undefined;
      }
    } else {
      this.playingNote = undefined;
    }

    image(this.graphic, this.x, this.y);
  }

  mouseInside() {
    const mx = this.rmouseX();
    const my = this.rmouseY();
    if (mx >= 0 && mx <= this.w && my >= 0 && my <= this.h) {
      let ret = null;
      BLACK_NOTES.forEach((note, i) => {
        if (
          note &&
          mx >= note.x &&
          mx <= note.x + note.w &&
          my >= note.y &&
          my <= note.y + note.h
        ) {
          ret = note;
        }
      });
      if (ret) {
        return ret;
      }
      WHITE_NOTES.forEach((note, i) => {
        if (
          mx >= note.x &&
          mx <= note.x + note.w &&
          my >= note.y &&
          my <= note.y + note.h
        ) {
          ret = note;
        }
      });
      return ret;
    }
    return null;
  }

  rmouseX() {
    return mouseX - this.x;
  }

  rmouseY() {
    return mouseY - this.y;
  }

  mouseClicked() {
    let note = this.mouseInside();
    if (note) {
      console.log(note);
      audioPlayer.playNote(
        note.freq[this.octave],
        waves[selectedWave].canvas.periodicWave,
      );
      this.playingNote = note;
    } else {
      this.playingNote = undefined;
    }
  }
}

/***********************
 *       WAVE SELECTOR *
 ************************/

class WaveSelector {
  constructor(x, y, w, h) {
    this.graphic = createGraphics(w, h);
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }

  draw() {
    if (this.lastWave != selectedWave) {
      this.lastWave = selectedWave;
      this.graphic.noStroke();
      this.graphic.fill(100, 100, 100);
      waves.forEach((wave, i) => {
        if (i == selectedWave) {
          this.graphic.fill(wave.color);
          this.graphic.stroke(0, 0, 0);
          this.graphic.rect(0, (this.h / 10) * i, this.w, this.h / 10);
          this.graphic.fill(0, 0, 0);
        } else {
          this.graphic.fill(0, 0, 0);
          this.graphic.stroke(0, 0, 0);
          this.graphic.rect(0, (this.h / 10) * i, this.w, this.h / 10);
          this.graphic.fill(wave.color);
        }
        this.graphic.noStroke();
        this.graphic.textSize(50);
        this.graphic.textAlign("center", "center");
        this.graphic.text(
          wave.name,
          this.w / 2,
          (this.h / 10) * i + this.h / 20,
        );
      });
    }

    image(this.graphic, this.x, this.y);
  }

  mouseInside() {
    if (
      this.rmouseX() >= 0 &&
      this.rmouseX() <= this.w &&
      this.rmouseY() >= 0 &&
      this.rmouseY() <= this.h
    ) {
      let i = floor((this.rmouseY() * 10) / this.h);
      return i;
    }
    return -1;
  }

  rmouseX() {
    return mouseX - this.x;
  }

  rmouseY() {
    return mouseY - this.y;
  }

  mouseClicked() {
    let i = this.mouseInside();
    if (i != -1) {
      selectedWave = i;
      console.log(i);
    }
  }
}

/***********************
 *       Control Panel *
 ************************/

class ControlPanel {
  constructor(x, y, w, h) {
    this.graphic = createGraphics(w, h);
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.graphic.noStroke();
    this.graphic.fill(0, 0, 0);
    this.graphic.noStroke();
    this.graphic.rect(0, 0, this.w, this.h);
    this.graphic.noStroke();
    this.graphic.fill(255, 255, 255);
    this.graphic.textAlign("center", "center");
    this.graphic.textSize(50);
    this.graphic.text("PLAY", (this.w * 0) / 4 + this.w / 8, this.h / 2);
    this.graphic.text("UNDO", (this.w * 1) / 4 + this.w / 8, this.h / 2);
    this.graphic.text("CLEAR", (this.w * 2) / 4 + this.w / 8, this.h / 2);
    this.graphic.text("SAVE", (this.w * 3) / 4 + this.w / 8, this.h / 2);
  }

  draw() {
    image(this.graphic, this.x, this.y);
  }

  mouseInside() {
    if (
      this.rmouseX() >= 0 &&
      this.rmouseX() <= this.w &&
      this.rmouseY() >= 0 &&
      this.rmouseY() <= this.h
    ) {
      if (this.rmouseX() / this.w < 1 / 4) {
        return "play";
      } else if (this.rmouseX() / this.w < 2 / 4) {
        return "undo";
      } else if (this.rmouseX() / this.w < 3 / 4) {
        return "clear";
      } else {
        return "save";
      }
    }
    return false;
  }

  rmouseX() {
    return mouseX - this.x;
  }

  rmouseY() {
    return mouseY - this.y;
  }

  mouseClicked() {
    let action = this.mouseInside();
    if (action && action == "play") {
      pitchCanvas.play();
    } else if (action && action == "undo") {
      pitchCanvas.undo();
    } else if (action && action == "clear") {
      pitchCanvas.clear();
    } else if (action && action == "save") {
      pitchCanvas.save();
    }
  }
}

/***********************
 *    WAVE DRAWING    *
 ************************/

class WaveCanvas {
  constructor(x, y, w, h, hex = "#000000") {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.color = color(hex);
    this.changed = false;
    noStroke();
    this.graphic = createGraphics(w, h);
    this.graphic.fill(255, 255, 255, 255);
    this.graphic.noStroke();
    this.graphic.rect(0, 0, w, h);
    this.graphic.strokeWeight(5);
    this.graphic.stroke(this.color);
    this.graphic.line(0, this.h / 2, this.w, this.h / 2);
    // this.demoGraphic = createGraphics(w, h);
    this.d = this.graphic.pixelDensity();

    console.log("draw canvas setup");
    // Filters used to smooth position and pressure jitter
    xFilter = new OneEuroFilter(60, minCutoff, beta, 1.0);
    yFilter = new OneEuroFilter(60, minCutoff, beta, 1.0);
    pFilter = new OneEuroFilter(60, minCutoff, beta, 1.0);

    // prevent scrolling on iOS Safari
    disableScroll();
  }

  mouseInside() {
    return (
      this.rmouseX() >= 0 &&
      this.rmouseX() <= this.w &&
      this.rmouseY() >= 0 &&
      this.rmouseY() <= this.h
    );
  }

  rmouseX() {
    return mouseX - this.x;
  }

  rmouseY() {
    return mouseY - this.y;
  }

  draw() {
    // Start Pressure.js if it hasn't started already
    if (isPressureInit == false) {
      initPressure();
    }
    if (isDrawing && this.mouseInside() && mouseIsPressed && audioStarted) {
      // console.log("inside draw", isDrawing)
      // Smooth out the position of the pointer
      let penX = xFilter.filter(this.rmouseX(), millis());
      let penY = yFilter.filter(this.rmouseY(), millis());

      // What to do on the first frame of the stroke
      if (this.isDrawingJustStarted || this.globalIsDrawingJustStarted) {
        this.prevPenX = penX;
        this.prevPenY = penY;
      }

      // Smooth out the pressure
      pressure = pFilter.filter(pressure, millis());

      // Define the current brush size based on the pressure
      let brushSize = 5; // minBrushSize + pressure * pressureMultiplier;

      // Calculate the distance between previous and current position
      let d = dist(this.prevPenX, this.prevPenY, penX, penY);

      // The bigger the distance the more ellipses
      // will be drawn to fill in the empty space
      let inBetween = (d / brushSize) * brushDensity;

      // fill white around
      {
        this.graphic.noStroke();
        this.graphic.fill(255, 255, 255, 255);
        this.graphic.rect(
          min(this.prevPenX, penX) - 1,
          0,
          abs(penX - this.prevPenX) + 1,
          this.h,
        );
      }

      // Add ellipses to fill in the space
      // between samples of the pen position
      for (let i = 1; i <= inBetween; i++) {
        let amt = i / inBetween;
        let s = lerp(this.prevBrushSize, brushSize, amt);
        let x = lerp(this.prevPenX, penX, amt);
        let y = lerp(this.prevPenY, penY, amt);
        this.graphic.noStroke();
        this.graphic.fill(this.color);
        this.graphic.ellipse(x, y, s);
      }

      // Draw an ellipse at the latest position
      this.graphic.noStroke();
      this.graphic.fill(this.color);
      this.graphic.ellipse(penX, penY, brushSize);

      // Save the latest brush values for next frame
      this.prevBrushSize = brushSize;
      this.prevPenX = penX;
      this.prevPenY = penY;

      this.isDrawingJustStarted = false;
      this.globalIsDrawingJustStarted = false;
      this.changed = true;
    } else {
      this.isDrawingJustStarted = true;
      if (this.changed) {
        this.doStuff();
      }
      this.changed = false;
    }
    image(this.graphic, this.x, this.y);
    // image(this.demoGraphic, this.x, this.y);
  }

  doStuff() {
    this.graphic.loadPixels();
    console.log("do stuff", this.w, this.d);

    let arr = new Array(floor(this.w)).fill(-2);
    for (let x = 0; x < this.w; ++x) {
      let count = 0;
      let indexSum = 0;
      for (let y = 0; y < this.h; ++y) {
        const pixel = this.getPixel(x, y);
        if (isNaN(red(pixel)) || isNaN(green(pixel)) || isNaN(blue(pixel))) {
          // do nothing
        } else if (
          red(pixel) != 255 ||
          green(pixel) != 255 ||
          blue(pixel) != 255
        ) {
          count += 1;
          indexSum += y;
        }
      }
      if (count > 0) {
        arr[x] = ((2 * indexSum) / count / this.h - 1) * -1;
      }
    }

    // fixes a bug where the pixel array in the original graphic no longer updates if the pixelDensity is 1
    const newGraphic = createGraphics(this.w, this.h);
    newGraphic.noStroke();
    newGraphic.fill(this.color);
    newGraphic.image(this.graphic, 0, 0);
    this.graphic = newGraphic;

    // this.graphic.updatePixels();
    // this.graphic.clear();
    // this.graphic.updatePixels();

    // this.graphic.updatePixels();
    arr = upsampleArray(arr, 4096, -2);
    this.timeDomain = arr;
    this.periodicWave = timeDomainToPeriodicWave(arr, -2);
    // console.log(this.timeDomain);
    // console.log(this.periodicWave);
    // this.graphic.updatePixels();
    // this.demoGraphic.clear();
    // this.demoGraphic.noStroke();
    // this.demoGraphic.fill(this.color, 50);
    for (let i = 0; i < arr.length; i += 4) {
      let j = arr[i];
      if (j != -2) {
        let y = ((j * -1 + 1) * this.h) / 2;
        const x = (this.w * i) / arr.length;
        this.graphic.ellipse(x, y, 5);
      }
    }
    // this.graphic.updatePixels();
  }

  setPixel(x, y, col) {
    const d = this.d;
    const graphics = this.graphic;
    for (let i = 0; i < d; i++) {
      for (let j = 0; j < d; j++) {
        let index = (x * d + i + (y * d + j) * graphics.width * d) * 4;
        graphics.pixels[index] = red(col);
        graphics.pixels[index + 1] = green(col);
        graphics.pixels[index + 2] = blue(col);
        graphics.pixels[index + 3] = alpha(col);
      }
    }
  }

  getPixel(x, y) {
    const d = this.d;
    const graphics = this.graphic;
    let r = 0,
      g = 0,
      b = 0,
      a = 0;
    for (let i = 0; i < d; i++) {
      for (let j = 0; j < d; j++) {
        let index = (x * d + i + (y * d + j) * graphics.width * d) * 4;
        r += graphics.pixels[index];
        g += graphics.pixels[index + 1];
        b += graphics.pixels[index + 2];
        a += graphics.pixels[index + 3];
      }
    }
    return color(r / (d * d), g / (d * d), b / (d * d), a / (d * d));
  }
}

/***********************
 *    WAVE UI          *
 ************************/

class WaveUI {
  constructor(x, y, w, h) {
    this.graphic = createGraphics(w, h);
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.graphic.fill(150, 150, 150);
    this.graphic.stroke(150, 150, 150);
    this.graphic.line(0, this.h / 2, this.w, this.h / 2);
    this.graphic.line(this.w / 2, 0, this.w / 2, this.h);
    this.graphic.noStroke();
    this.graphic.textSize(14);
    this.graphic.textAlign("left", "top");
    this.graphic.text("1", this.w / 2 + 5, 0 + 5);
    this.graphic.textAlign("left", "bottom");
    this.graphic.text("-1", this.w / 2 + 5, this.h - 5);
    this.graphic.textAlign("left", "bottom");
    this.graphic.text("t = 0", 0 + 5, this.h / 2 - 5);
    this.graphic.textAlign("right", "bottom");
    this.graphic.text("t = λ", this.w - 5, this.h / 2 - 5);
  }

  draw() {
    image(this.graphic, this.x, this.y);
  }
}

/***********************
 *    PITCH DRAWING    *
 ************************/

class PitchCanvas {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.changed = false;
    this.lines = [];
    this.background = createGraphics(w, h);
    this.background.fill(255, 255, 255, 255);
    this.background.noStroke();
    this.background.rect(0, 0, w, h);

    this.d = pixelDensity();

    // Filters used to smooth position and pressure jitter
    xFilter = new OneEuroFilter(60, minCutoff, beta, 1.0);
    yFilter = new OneEuroFilter(60, minCutoff, beta, 1.0);
    pFilter = new OneEuroFilter(60, minCutoff, beta, 1.0);

    // prevent scrolling on iOS Safari
    disableScroll();
  }

  mouseInside() {
    return (
      this.rmouseX() >= 0 &&
      this.rmouseX() <= this.w &&
      this.rmouseY() >= 0 &&
      this.rmouseY() <= this.h
    );
  }

  rmouseX() {
    return mouseX - this.x;
  }

  rmouseY() {
    return mouseY - this.y;
  }

  newLine(x, y) {
    const graphic = createGraphics(this.w, this.h);
    this.line = {
      graphic: graphic,
      wave: selectedWave,
      dir: undefined,
      width: 0,
      height: 0,
      minX: x,
      maxX: x,
      minY: y,
      maxY: y,
    };
    this.lines.push(this.line);
  }

  clear() {
    this.lines = [];
  }

  undo() {
    if (!this.isUndoing) {
      this.isUndoing = true;
      this.lines.pop();
      setTimeout(() => {
        this.isUndoing = false;
      }, 100);
    }
  }

  draw() {
    // Start Pressure.js if it hasn't started already
    if (isPressureInit == false) {
      initPressure();
    }
    if (isDrawing && this.mouseInside() && mouseIsPressed && audioStarted) {
      // Smooth out the position of the pointer
      let penX = xFilter.filter(this.rmouseX(), millis());
      let penY = yFilter.filter(this.rmouseY(), millis());

      if (!this.line) {
        this.newLine(penX, penY);
      }

      if (
        (penX > this.prevPenX && this.line.dir == -1) ||
        (penX < this.prevPenX && this.line.dir == 1)
      ) {
        if (this.line.width < 5 && this.line.height < 5) {
          this.undo();
        }
        this.newLine(penX, penY);
      }

      // What to do on the first frame of the stroke
      if (this.isDrawingJustStarted || this.globalIsDrawingJustStarted) {
        this.prevPenX = penX;
        this.prevPenY = penY;
      } else if (this.line.dir == undefined) {
        if (penX > this.prevPenX) {
          this.line.dir = 1;
        } else if (penX < this.prevPenX) {
          this.line.dir = -1;
        }
      }

      this.line.width += abs(penX - this.prevPenX);
      this.line.minX = min(penX, this.line.minX);
      this.line.maxX = max(penX, this.line.maxX);
      this.line.minY = min(penY, this.line.minY);
      this.line.maxY = max(penY, this.line.maxY);
      this.line.height += this.line.maxY - this.line.minY;

      // Smooth out the pressure
      pressure = pFilter.filter(pressure, millis());

      // Define the current brush size based on the pressure
      let brushSize = minBrushSize + pressure * pressureMultiplier;

      // Calculate the distance between previous and current position
      let d = dist(this.prevPenX, this.prevPenY, penX, penY);

      // The bigger the distance the more ellipses
      // will be drawn to fill in the empty space
      let inBetween = (d / min(brushSize, this.prevBrushSize)) * brushDensity;

      // Add ellipses to fill in the space
      // between samples of the pen position
      for (let i = 1; i <= inBetween; i++) {
        let amt = i / inBetween;
        let s = lerp(this.prevBrushSize, brushSize, amt);
        let x = lerp(this.prevPenX, penX, amt);
        let y = lerp(this.prevPenY, penY, amt);
        this.line.graphic.noStroke();
        this.line.graphic.fill(waves[selectedWave].color);
        this.line.graphic.ellipse(x, y, s);
      }

      // Draw an ellipse at the latest position
      this.line.graphic.noStroke();
      this.line.graphic.fill(waves[selectedWave].color);
      this.line.graphic.ellipse(penX, penY, brushSize);

      // Save the latest brush values for next frame
      this.prevBrushSize = brushSize;
      this.prevPenX = penX;
      this.prevPenY = penY;

      this.isDrawingJustStarted = false;
      this.globalIsDrawingJustStarted = false;
      this.changed = true;
    } else {
      this.isDrawingJustStarted = true;
      if (this.changed) {
        this.doStuff();
        this.line = undefined;
      }
      this.changed = false;
    }
    image(this.background, this.x, this.y);
    for (let i = 0; i < this.lines.length; ++i) {
      image(this.lines[i].graphic, this.x, this.y);
    }
  }

  createLineAudio(line) {
    console.log("createLineAudio", line, waves[line.wave]);
    line.graphic.loadPixels();
    let arr = new Array(floor(this.w)).fill(0);
    const minX = floor(max(0, line.minX));
    const maxX = floor(min(line.maxX, this.w - 1));
    const minY = floor(max(0, line.minY - 10));
    const maxY = floor(min(line.maxY + 10, this.h - 1));
    console.log(minX, maxX, minY, maxY);
    for (let x = minX; x <= maxX; ++x) {
      let count = 0;
      let indexSum = 0;
      for (let y = minY; y <= maxY; ++y) {
        const pixel = this.getPixel(x, y, line.graphic);
        if (
          isNaN(red(pixel)) ||
          isNaN(green(pixel)) ||
          isNaN(blue(pixel)) ||
          alpha(pixel) == 0
        ) {
          // do nothing
        } else if (
          red(pixel) != 255 ||
          green(pixel) != 255 ||
          blue(pixel) != 255
        ) {
          count += 1;
          indexSum += y;
        }
      }
      if (count > 0) {
        arr[x] = 1 - indexSum / count / this.h;
      }
    }
    line.graphic.updatePixels();
    for (let i = 0; i < arr.length; ++i) {
      let j = arr[i];
      if (j != 0) {
        let y = (1 - j) * this.h;
        const x = (this.w * i) / arr.length;
        line.graphic.ellipse(x, y, 5);
      }
    }

    for (let i = 0; i < arr.length; ++i) {
      arr[i] = pctToHz(arr[i], 0);
    }

    // console.log("post-scaled-arr", arr);
    line.freqArray = upsampleArray(arr, SECONDS * sampleRate, 0);
  }

  doStuff() {
    console.log("lines", this.lines);
    console.log(this.line);

    for (let i = 0; i < this.lines.length; ++i) {
      const line = this.lines[i];
      if (!line.freqArray) {
        this.createLineAudio(line);
      }
    }
  }

  // ALTERNATIVE MIXING - AVERAGE
  // getSoundBuffer() {
  //   const buffer = new Float32Array(sampleRate * SECONDS).fill(0);
  //   const lineBuffers = this.lines
  //     .map((line) => {
  //       const freqArray = line.freqArray;
  //       const wave = waves[line.wave].canvas.timeDomain;
  //       if (!wave) {
  //         return undefined;
  //       }
  //       const lineBuffer = generateVariableWave(freqArray, wave, sampleRate);
  //       return lineBuffer;
  //     })
  //     .filter((lineBuffer) => lineBuffer);

  //   for (let i = 0; i < buffer.length; ++i) {
  //     let active = 0;
  //     for (let j = 0; j < lineBuffers.length; ++j) {
  //       if (lineBuffers[j][i] > 0) {
  //         active += 1;
  //       }
  //       buffer[i] += lineBuffers[j][i];
  //     }

  //     if (active > 1) {
  //       buffer[i] /= active;
  //     }

  //     if (buffer[i] > 1) {
  //       console.log("buffer[i]", buffer[i]);
  //     }
  //   }

  //   return buffer;
  // }

  // ALTERNATIVE MIXING - SUM
  getSoundBuffer() {
    const buffer = new Float32Array(sampleRate * SECONDS).fill(0);

    for (let i = 0; i < this.lines.length; ++i) {
      const freqArray = this.lines[i].freqArray;
      const wave = waves[this.lines[i].wave].canvas.timeDomain;
      if (!wave) {
        return undefined;
      }
      const lineBuffer = generateVariableWave(freqArray, wave, sampleRate);

      for (let j = 0; j < buffer.length; ++j) {
        buffer[j] += lineBuffer[j];
      }
    }

    return buffer;
  }

  play() {
    if (!this.isPlaying) {
      this.isPlaying = true;
      const buffer = new AudioBuffer({
        length: sampleRate * SECONDS,
        sampleRate: sampleRate,
        channelCount: 1,
      });
      const soundBuffer = this.getSoundBuffer();
      const nowBuffering = buffer.getChannelData(0);
      for (let i = 0; i < soundBuffer.length; ++i) {
        nowBuffering[i] = soundBuffer[i];
      }

      const source = new AudioBufferSourceNode(audioContext);
      source.buffer = buffer;
      source.connect(audioContext.destination);
      this.startTime = audioContext.currentTime;
      source.start();
      source.onended = (event) => {
        console.log(event);
        source.disconnect(audioContext.destination);
        this.isPlaying = false;
      };
    }
  }

  save() {
    if (!this.isSaving) {
      console.log("save");
      this.isSaving = true;
      const buffer = this.getSoundBuffer();
      const wavBlob = arrayToWAV(buffer, sampleRate);
      downloadWAV(wavBlob, "audio.wav", () => {
        console.log("done saving");
        this.isSaving = false;
      });
    }
  }

  getCurrentTime() {
    if (this.isPlaying) {
      return audioContext.currentTime - this.startTime;
    }
  }

  setPixel(x, y, col, graphics) {
    const d = this.d;
    for (let i = 0; i < d; i++) {
      for (let j = 0; j < d; j++) {
        let index = (x * d + i + (y * d + j) * graphics.width * d) * 4;
        graphics.pixels[index] = red(col);
        graphics.pixels[index + 1] = green(col);
        graphics.pixels[index + 2] = blue(col);
        graphics.pixels[index + 3] = alpha(col);
      }
    }
  }

  getPixel(x, y, graphics) {
    const d = this.d;
    let r = 0,
      g = 0,
      b = 0,
      a = 0;
    for (let i = 0; i < d; i++) {
      for (let j = 0; j < d; j++) {
        let index = (x * d + i + (y * d + j) * graphics.width * d) * 4;
        r += graphics.pixels[index];
        g += graphics.pixels[index + 1];
        b += graphics.pixels[index + 2];
        a += graphics.pixels[index + 3];
      }
    }
    return color(r / (d * d), g / (d * d), b / (d * d), a / (d * d));
  }
}

/***********************
 *    PITCH UI          *
 ************************/

class PitchUI {
  constructor(x, y, w, h) {
    this.graphic = createGraphics(w, h);
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.lastNote = 0; // so it will init
  }

  drawFreqLine(freq, color, text) {
    this.graphic.stroke(color);
    const y = (1 - hzToPct(freq)) * this.h;
    this.graphic.line(0, y, this.w, y);
    if (text) {
      this.graphic.noStroke();
      this.graphic.fill(color);
      this.graphic.textSize(8);
      this.graphic.textAlign("left", "bottom");
      this.graphic.text(text, 10, y);
    }
  }

  draw() {
    this.graphic.clear();

    for (let i = 0; i < SECONDS; ++i) {
      this.graphic.stroke(220, 220, 220);
      this.graphic.line(
        ((i + 0.5) * this.w) / SECONDS,
        0,
        ((i + 0.5) * this.w) / SECONDS,
        this.h,
      );
    }

    let note = piano1.playingNote || piano2.playingNote;
    this.lastNote = note;
    WHITE_NOTES.map((note) => {
      note.freq.map((freq, i) => {
        this.drawFreqLine(
          freq,
          color(150, 150, 150),
          "" + note.note + i + " / " + freq + "Hz",
        );
      });
    });

    BLACK_NOTES.map((note) => {
      if (note) {
        note.freq.map((freq, i) => {
          this.drawFreqLine(
            freq,
            color(150, 150, 150),
            "" + note.note + i + " / " + freq + "Hz",
          );
        });
      }
    });

    for (let i = 1; i < SECONDS; ++i) {
      this.graphic.stroke(150, 150, 150);
      this.graphic.line(
        (i * this.w) / SECONDS,
        0,
        (i * this.w) / SECONDS,
        this.h,
      );
      this.graphic.fill(0, 0, 0);
      this.graphic.stroke(255, 255, 255);
      this.graphic.textSize(12);
      this.graphic.textStyle("bold");
      this.graphic.textAlign("center", "center");
      this.graphic.text(i + "s", (i * this.w) / SECONDS, this.h - 20);
    }

    if (note) {
      note.freq.map((freq, i) => {
        this.drawFreqLine(
          freq,
          color(0, 0, 0),
          "" + note.note + i + " / " + freq + "Hz",
        );
      });
    }

    this.graphic.stroke(0, 0, 0);
    if (pitchCanvas.isPlaying) {
      const x = (pitchCanvas.getCurrentTime() / SECONDS) * this.w;
      this.graphic.line(x, 0, x, this.h);
    }

    image(this.graphic, this.x, this.y);
  }
}

/***********************
 *       UTILITIES      *
 ************************/

// Initializing Pressure.js
// https://pressurejs.com/documentation.html
function initPressure() {
  Pressure.set("#canvas", {
    start: function (event) {
      // this is called on force start
      isDrawing = true;
      isDrawingJustStarted = true;
    },
    end: function () {
      // this is called on force end
      isDrawing = false;
      pressure = 0;
    },
    change: function (force, event) {
      if (isPressureInit == false) {
        console.log("Pressure.js initialized successfully");
        isPressureInit = true;
      }
      pressure = force;
    },
  });

  Pressure.config({
    polyfill: true, // use time-based fallback ?
    polyfillSpeedUp: 1000, // how long does the fallback take to reach full pressure
    polyfillSpeedDown: 300,
    preventSelect: true,
    only: null,
  });
}

// Disabling scrolling and bouncing on iOS Safari
// https://stackoverflow.com/questions/7768269/ipad-safari-disable-scrolling-and-bounce-effect

function preventDefault(e) {
  e.preventDefault();
}

function disableScroll() {
  document.body.addEventListener("touchmove", preventDefault, {
    passive: false,
  });
}
/*
function enableScroll(){
    document.body.removeEventListener('touchmove', preventDefault, { passive: false });
}*/

function upsampleArray(inputArray, outputArrayLength, ignore) {
  const inputArrayLength = inputArray.length;
  const outputArray = new Array(outputArrayLength);
  for (let i = 0; i < outputArrayLength; i++) {
    const index = (i / (outputArrayLength - 1)) * (inputArrayLength - 1);
    const lowerIndex = Math.floor(index);
    const upperIndex = Math.ceil(index);
    const fraction = index - lowerIndex;
    const lowerValue = inputArray[lowerIndex];
    const upperValue = inputArray[upperIndex];
    const interpolatedValue = lowerValue + (upperValue - lowerValue) * fraction;
    var valueToUse;
    if (
      (lowerValue == ignore && upperValue == ignore) ||
      (lowerValue == ignore && fraction <= 0.5) ||
      (upperValue == ignore && fraction >= 0.5)
    ) {
      valueToUse = ignore;
    } else if (lowerValue == ignore) {
      valueToUse = upperValue;
    } else if (upperValue == ignore) {
      valueToUse = lowerValue;
    } else {
      valueToUse = interpolatedValue;
    }
    outputArray[i] = valueToUse;
  }
  return outputArray;
}

function timeDomainToPeriodicWave(input, ignore) {
  if (input.length != 4096) {
    console.log("input wrong length!!!");
    input = upsampleArray(input, 4096, { ignore: -2 });
  }

  const f = new FFTJS(4096);
  for (let i = 0; i < 4096; i++) {
    if (input[i] == ignore) {
      input[i] = 0;
    }
  }

  const out = f.createComplexArray();
  f.realTransform(out, input);
  f.completeSpectrum(out);

  // console.log("out", out);
  // console.log("in", input);

  const real = out.filter((_, i) => i % 2 == 0).map((c) => c / 4096);
  const imag = out.filter((_, i) => i % 2 == 1).map((c) => c / 4096);

  // console.log(real, imag);

  let wave = new PeriodicWave(audioContext, {
    real: real,
    imag: imag,
    disableNormalization: true,
  });

  let wavenorm = new PeriodicWave(audioContext, {
    real: real,
    imag: imag,
    disableNormalization: false,
  });
  // console.log(wave, wavenorm);
  return wave;
}

function cumulativeSum(arr) {
  const result = [];
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    sum += arr[i];
    result.push(sum);
  }
  return result;
}

function generateVariableWave(freqArray, waveArray, sampleRate) {
  /**
   * Generates a wave with a variable frequency specified by freqArray and a custom wave shape specified by waveArray.
   * When freqArray has zero values, the output wave will also be zero at those points.
   * Parameters:
   * - sampleRate: Sampling rate in samples per second.
   * - freqArray: An array of frequencies in Hz for each point in time.
   * - waveArray: An array containing values in the range [-1, 1] representing a single period of the wave shape.
   * Returns:
   * - An array representing the wave with the variable frequency and custom wave shape,
   *   with zero values where freqArray is zero.
   */
  freqArray = freqArray.map((value) => (isNaN(value) ? 0 : value));

  // Calculate the time step between samples
  const dt = 1 / sampleRate;

  // Calculate the instantaneous phase by integrating the frequency
  // The cumulative sum of (2 * Math.PI * freqArray[i] * dt) approximates the integral of the frequency
  const instantaneousPhase = cumulativeSum(
    freqArray.map((freq) => 2 * Math.PI * freq * dt),
  );

  // Calculate the number of samples in the output wave
  const numSamples = freqArray.length;

  // Generate the wave based on the instantaneous phase and the custom wave shape
  const wave = new Array(numSamples).fill(0);
  for (let i = 0; i < numSamples; i++) {
    const phase = instantaneousPhase[i];
    const index =
      Math.floor((phase / (2 * Math.PI)) * waveArray.length) % waveArray.length;
    wave[i] = waveArray[index];
  }

  // Create a mask where the frequency is zero
  const zeroMask = freqArray.map((value) => value === 0);

  // Apply the mask to the wave, setting parts of the wave to zero where the frequency is zero
  for (let i = 0; i < numSamples; i++) {
    if (zeroMask[i]) {
      wave[i] = 0;
    }
  }

  return wave;
}

const MIN_FREQ = WHITE_NOTES[0].freq[2] - 1;
const MAX_FREQ = WHITE_NOTES[0].freq[6] + 10;

function pctToHz(pct, ignore) {
  if (pct == ignore) {
    return 0;
  }
  const result = MIN_FREQ * (MAX_FREQ / MIN_FREQ) ** pct;
  return result;
}

function hzToPct(freq) {
  return Math.log(freq / MIN_FREQ) / Math.log(MAX_FREQ / MIN_FREQ);
}

function arrayToWAV(buffer, sampleRate) {
  const byteRate = sampleRate * 4; // 32-bit float, hence 4 bytes per sample
  const blockAlign = 4; // Number of bytes for one sample including all channels.
  const dataSize = buffer.length * 4; // Total number of bytes for data
  const chunkSize = 36 + dataSize; // Size of the whole file in bytes without 8 bytes of 'RIFF' and size

  const bufferArray = new ArrayBuffer(44 + dataSize); // 44 bytes for header, rest for data
  const view = new DataView(bufferArray);

  // Writing the RIFF header
  writeString(view, 0, "RIFF");
  view.setUint32(4, chunkSize, true); // ChunkSize
  writeString(view, 8, "WAVE");
  // fmt subchunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 3, true); // Audio format 3 = IEEE float
  view.setUint16(22, 1, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, byteRate, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, 32, true); // BitsPerSample
  // data subchunk
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true); // Subchunk2Size

  // Writing the audio data
  let offset = 44; // Skip header
  for (let i = 0; i < buffer.length; i++, offset += 4) {
    view.setFloat32(offset, buffer[i], true);
  }

  return new Blob([view], { type: "audio/wav" });

  function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}

function downloadWAV(blob, filename = "audio.wav", callback) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
  setTimeout(callback, 100);
}
