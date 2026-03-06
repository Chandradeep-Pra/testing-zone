class AudioProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];

    if (input.length > 0) {
      const channelData = input[0];

      const pcm16 = new Int16Array(channelData.length);

      for (let i = 0; i < channelData.length; i++) {
        pcm16[i] = Math.max(-1, Math.min(1, channelData[i])) * 0x7fff;
      }

      this.port.postMessage(pcm16);
    }

    return true;
  }
}

registerProcessor("audio-processor", AudioProcessor);