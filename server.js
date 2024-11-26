const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const cors = require("cors");
app.use(cors({ origin: "*" })); // Allow requests from all origins
const { Server } = require("socket.io");
const http = require("http");

// Particle Device Info (from Heroku environment variables)
const PARTICLE_DEVICE_ID = process.env.PARTICLE_DEVICE_ID;
const PARTICLE_ACCESS_TOKEN = process.env.PARTICLE_ACCESS_TOKEN;
const PARTICLE_EVENT_NAME = "environmentData";

// Express App
const app = express();
app.use(bodyParser.json());
app.use(cors());

// Create HTTP Server for Socket.IO
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Listen to Particle Event Stream
const PARTICLE_EVENT_STREAM_URL = `https://api.particle.io/v1/devices/events/${PARTICLE_EVENT_NAME}?access_token=${PARTICLE_ACCESS_TOKEN}`;

axios.get(PARTICLE_EVENT_STREAM_URL, { responseType: "stream" }).then(response => {
    console.log("Connected to Particle Event Stream");

    response.data.on("data", chunk => {
        const eventData = chunk.toString().trim();

        if (eventData.startsWith("event")) {
            console.log("Received event: ", eventData);
        } else if (eventData.startsWith("data")) {
            const payload = JSON.parse(eventData.replace(/^data: /, ""));
            const parsedData = JSON.parse(payload.data);

            console.log("Temperature:", parsedData.temperature);
            console.log("Humidity:", parsedData.humidity);

            // Broadcast the data to all clients via Socket.IO
            io.emit("update", {
                temperature: parsedData.temperature,
                humidity: parsedData.humidity,
                timestamp: new Date().toLocaleTimeString(),
            });
        }
    });
}).catch(error => {
    console.error("Error connecting to Particle Event Stream:", error.message);
});

// Frontend endpoint
app.get("/", (req, res) => {
    res.send("Particle Web App Backend");
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
