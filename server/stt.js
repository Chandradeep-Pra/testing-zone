import WebSocket, { WebSocketServer } from "ws";
import fetch from "node-fetch";

const wss = new WebSocketServer({ port: 5001 });

wss.on("connection", (client) => {
  const dg = new WebSocket(
    "wss://api.deepgram.com/v1/listen?punctuate=true&interim_results=true",
    {
      headers: {
        Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
      },
    }
  );

  dg.on("message", (msg) => {
    const data = JSON.parse(msg);
    const alt = data.channel?.alternatives?.[0];
    if (!alt?.transcript) return;

    client.send(
      JSON.stringify({
        type: data.is_final ? "final" : "interim",
        text: alt.transcript,
      })
    );
  });

  client.on("message", (audio) => dg.send(audio));
});
