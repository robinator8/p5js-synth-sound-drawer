// class WaveDemo {
//   // let mySound; // For holding our custom sound buffer
//   // let isPlaying = false; // Track playback state
//   // let box = { x: 100, y: 100, width: 200, height: 100 }; // Define box dimensions
//   // function setup() {
//   // createCanvas(400, 200);
//   // Generate a sine wave buffer
//   // }
//   // function draw() {
//   //   background(220);
//   //   // Check if mouse is over the box
//   //   if (mouseX > box.x && mouseX < box.x + box.width && mouseY > box.y && mouseY < box.y + box.height) {
//   //     if (!isPlaying) {
//   //       mySound.loop(); // Start looping the sound
//   //       isPlaying = true;
//   //     }
//   //     fill(150); // Change box color to indicate active state
//   //   } else {
//   //     if (isPlaying) {
//   //       mySound.stop(); // Stop the sound
//   //       isPlaying = false;
//   //     }
//   //     fill(255); // Box color when not active
//   //   }
//   // }
//   constructor() {
//     this.bufferSize = 44100 * 0.5; // Half a second at 44100 samples per second
//     this.myArray = new Float32Array(this.bufferSize);
//     this.isPlaying = false;
//   }

//   play() {
//     if (!this.isPlaying) {
//       console.log("play");
//       this.mySound.loop();
//       console.log(
//         "is playing ",
//         this.mySound.isPlaying(),
//         this.mySound.isLooping(),
//       );
//       // this.mySound.play(0, 1, 0.5); // play(soundTime, rate, amp, cueStart, duration)
//       // this.env.play(this.mySound); // Apply the envelope to the sound
//       this.isPlaying = true;
//     }
//   }

//   load(arr) {
//     console.log("load");
//     for (let i = 0; i < this.bufferSize; i++) {
//       // Generate a 440 Hz sine wave
//       let t = i / 44100; // current time in seconds
//       let f = 200;
//       let idx = floor(t * f * arr.length) % arr.length;
//       this.myArray[i] = arr[idx]; // Math.sin(2 * Math.PI * 200 * t);
//     }

//     // Create a p5.SoundFile and set its buffer to our generated waveform
//     this.mySound = new p5.SoundFile();
//     this.mySound.setBuffer([this.myArray]);
//     // this.mySound.loopMode = true; // Set the sound file to loop
//     // this.mySound.loop();
//     console.log(getAudioContext());
//     if (getAudioContext().state !== "running") {
//       userStartAudio();
//       getAudioContext().resume();
//       getAudioContext().onstatechange = () =>
//         console.log(getAudioContext().state);
//       console.log(getAudioContext());
//     }
//   }

//   pause() {
//     if (this.isPlaying) {
//       console.log("pause");
//       this.mySound.stop();
//       this.isPlaying = false;
//     }
//   }

//   startAudioContext() {
//     if (getAudioContext().state !== "running") {
//       userStartAudio();
//       getAudioContext().resume();
//       getAudioContext().onstatechange = () =>
//         console.log(getAudioContext().state);
//       console.log(getAudioContext());
//     }
//     // startAudioContext();
//   }
// }
