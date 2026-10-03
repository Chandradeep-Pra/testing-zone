class AudioProcessor extends AudioWorkletProcessor {

  constructor() {
    super();
    this.pending = [];
  }

  process(inputs) {

    const input = inputs[0];

    if (!input.length) return true;

    const channel = input[0];

    for (let i = 0; i < channel.length; i++) {

      const s = Math.max(-1, Math.min(1, channel[i]));
      this.pending.push(s < 0
        ? s * 0x8000
        : s * 0x7fff);
    }

    // Send 20 ms mono PCM frames at 16 kHz rather than tiny render quanta.
    while (this.pending.length >= 320) {
      const frame = new Int16Array(this.pending.splice(0, 320));
      this.port.postMessage(frame, [frame.buffer]);
    }

    return true;
  }

}

registerProcessor("audio-processor", AudioProcessor);
