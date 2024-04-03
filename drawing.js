

class Drawing {
    /***********************
    *       SETTINGS       *
    ************************/

    // How sensitive is the brush size to the pressure of the pen?
    pressureMultiplier = 10; 

    // What is the smallest size for the brush?
    minBrushSize = 1;

    // Higher numbers give a smoother stroke
    brushDensity = 5;

    showDebug = true;

    // Jitter smoothing parameters
    // See: http://cristal.univ-lille.fr/~casiez/1euro/
    minCutoff = 0.0001; // decrease this to get rid of slow speed jitter but increase lag (must be > 0)
    beta      = 1.0;  // increase this to get rid of high speed lag


    /***********************
    *       GLOBALS        *
    ************************/
    xFilter; yFilter; pFilter;
    inBetween;
    prevPenX = 0;
    prevPenY = 0; 
    prevBrushSize = 1;
    amt; x; y; s; d;
    pressure = 0;
    drawCanvas; // uiCanvas;
    isPressureInit = false;
    isDrawing = false;
    isDrawingJustStarted = false;


    constructor(p) {
        this.p = p;
        // var xFilter, yFilter, pFilter;
        // var inBetween;
        this.prevPenX = 0;
        this.prevPenY = 0; 
        this.prevBrushSize = 1;
        // this.amt, x, y, s, d;
        this.pressure = 0;
        // this.drawCanvas, uiCanvas;
        this.isPressureInit = false;
        this.isDrawing = false;
        this.isDrawingJustStarted = false;
    }

  setup() {
    console.log(this.p);
    
    // Filters used to smooth position and pressure jitter
    this.xFilter = new OneEuroFilter(60, this.minCutoff, this.beta, 1.0);
    this.yFilter = new OneEuroFilter(60, this.minCutoff, this.beta, 1.0);
    this.pFilter = new OneEuroFilter(60, this.minCutoff, this.beta, 1.0);
    
    // prevent scrolling on iOS Safari
    disableScroll();
    
    //Initialize the canvas
    this.drawCanvas = this.p.createCanvas(this.p.windowWidth, this.p.windowHeight);
    this.p.
    this.drawCanvas.id("drawingCanvas");
    this.drawCanvas.position(0, 0);    
  }

  draw() {
    // console.log("drawing.draw");
    // Start Pressure.js if it hasn't started already
    if(this.isPressureInit == false){
      initPressure();
    }
      
    
    if(this.isDrawing) {      
      // Smooth out the position of the pointer 
      this.penX = this.xFilter.filter(this.p.mouseX, this.p.millis());
      this.penY = this.yFilter.filter(this.p.mouseY, this.p.millis());
      
      // What to do on the first frame of the stroke
      if(this.isDrawingJustStarted) {
        //console.log("started drawing");
        this.prevPenX = this.penX;
        this.prevPenY = this.penY;
      }

      // Smooth out the pressure
      this.pressure = this.pFilter.filter(this.pressure, this.p.millis());

      // Define the current brush size based on the pressure
      this.brushSize = this.minBrushSize + (this.pressure * this.pressureMultiplier);

      // Calculate the distance between previous and current position
      this.d = this.p.dist(this.prevPenX, this.prevPenY, this.penX, this.penY);

      // The bigger the distance the more ellipses
      // will be drawn to fill in the empty space
      this.inBetween = (this.d / this.p.min(this.brushSize,this.prevBrushSize)) * this.brushDensity;

      // Add ellipses to fill in the space 
      // between samples of the pen position
      for(i=1;i<=this.inBetween;i++){
        this.amt = i/this.inBetween;
        this.s = this.p.lerp(this.prevBrushSize, this.brushSize, this.amt);
        this.x = this.p.lerp(this.prevPenX, this.penX, this.amt);
        this.y = this.p.lerp(this.prevPenY, this.penY, this.amt);
        this.p.noStroke();
        this.p.fill(100)
        this.p.ellipse(x, y, s);      
      }

      // Draw an ellipse at the latest position
      this.p.noStroke();
      this.p.fill(100)
      this.p.ellipse(this.penX, this.penY, this.brushSize);

      // Save the latest brush values for next frame
      this.prevBrushSize = this.brushSize; 
      this.prevPenX = this.penX;
      this.prevPenY = this.penY;
      
      this.isDrawingJustStarted = false;
    }
  }
}