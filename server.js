// Initialize Express App (Move this to the top)
const express = require("express");
const app = express();

const axios = require("axios");
const bodyParser = require("body-parser");
const cors = require("cors");
const { Server } = require("socket.io");
const http = require("http");

// Add CSP header to allow 'unsafe-eval'
//app.use((req, res, next) => {
//    res.setHeader(
//        "Content-Security-Policy",
//        "script-src 'self' 'unsafe-eval';"
//    );
//    next();
//});

// Use CORS before defining any routes or middleware
app.use(cors({ origin: "*" })); // Allow requests from all origins

// Middleware
app.use(bodyParser.json());

// Particle Device Info (from environment variables)
const PARTICLE_DEVICE_ID = process.env.PARTICLE_DEVICE_ID;
const PARTICLE_ACCESS_TOKEN = process.env.PARTICLE_ACCESS_TOKEN;
const PARTICLE_EVENT_NAME = "environmentData";

// Create HTTP Server for Socket.IO
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Variables to store the latest temperature and humidity
let latestEnvironmentData = {
  temperature: null,
  humidity: null,
};

// Listen to Particle Event Stream
const PARTICLE_EVENT_STREAM_URL = `https://api.particle.io/v1/devices/events/${PARTICLE_EVENT_NAME}?access_token=${PARTICLE_ACCESS_TOKEN}`;

axios
  .get(PARTICLE_EVENT_STREAM_URL, { responseType: "stream" })
  .then((response) => {
    console.log("Connected to Particle Event Stream");

    response.data.on("data", (chunk) => {
      const eventData = chunk.toString().trim();

      if (eventData.startsWith("data")) {
        try {
          const payload = JSON.parse(eventData.replace(/^data: /, ""));
          const parsedData = JSON.parse(payload.data);

          // Update latest environment data
          latestEnvironmentData = {
            temperature: parsedData.temperature,
            humidity: parsedData.humidity,
          };
          io.emit("update", {
            temperature: parsedData.temperature,
            humidity: parsedData.humidity,
            timestamp: new Date().toLocaleTimeString(),
          });
        } catch (error) {
          console.error("Error parsing event data:", error);
        }
      }
    });
  })
  .catch((error) => {
    console.error("Error connecting to Particle Event Stream:", error.message);
  });

// Frontend endpoint
app.get("/", (req, res) => {
  res.send("Particle Web App Backend");
});

// New /environment endpoint
app.get("/environment", (req, res) => {
  if (latestEnvironmentData.temperature !== null && latestEnvironmentData.humidity !== null) {
    res.json(latestEnvironmentData);
  } else {
    res.status(503).json({ error: "Environment data not yet available" });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
