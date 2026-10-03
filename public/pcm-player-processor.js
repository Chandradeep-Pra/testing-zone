/**
 * Worklet-based PCM player for streaming generated audio back to the browser.
 */
class PCMPlayerProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 24000 * 180;
    this.buffer = new Float32Array(this.bufferSize);
    this.writeIndex = 0;
    this.readIndex = 0;

    this.port.onmessage = (event) => {
      if (event.data?.command === "endOfAudio") {
        this.readIndex = this.writeIndex;
        return;
      }

      const int16Samples = new Int16Array(event.data);
      for (let i = 0; i < int16Samples.length; i += 1) {
        const floatVal = int16Samples[i] / 32768;
        this.buffer[this.writeIndex] = floatVal;
        this.writeIndex = (this.writeIndex + 1) % this.bufferSize;

        if (this.writeIndex === this.readIndex) {
          this.readIndex = (this.readIndex + 1) % this.bufferSize;
        }
      }
    };
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];
    const framesPerBlock = output[0].length;
    for (let frame = 0; frame < framesPerBlock; frame += 1) {
      output[0][frame] = this.buffer[this.readIndex];
      if (output.length > 1) {
        output[1][frame] = this.buffer[this.readIndex];
      }

      if (this.readIndex !== this.writeIndex) {
        this.readIndex = (this.readIndex + 1) % this.bufferSize;
      }
    }
    return true;
  }
}

registerProcessor("pcm-player-processor", PCMPlayerProcessor);
