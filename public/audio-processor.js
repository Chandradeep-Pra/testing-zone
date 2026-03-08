class AudioProcessor extends AudioWorkletProcessor {

  process(inputs) {

    const input = inputs[0];

    if (!input.length) return true;

    const channel = input[0];

    const buffer = new Int16Array(channel.length);

    for (let i = 0; i < channel.length; i++) {

      const s = Math.max(-1, Math.min(1, channel[i]));

      buffer[i] = s < 0
        ? s * 0x8000
        : s * 0x7fff;

    }

    this.port.postMessage(buffer);

    return true;
  }

}

registerProcessor("audio-processor", AudioProcessor);