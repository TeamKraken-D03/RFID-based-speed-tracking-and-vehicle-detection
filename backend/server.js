const net = require('net');
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

const Esp1Log = require('./models/esp1Log');
const Esp2Log = require('./models/esp2Log');
const SpeedLog = require('./models/speedLog');
// const TamperLog = require('./models/tamperLog'); // Uncomment if using tamper logs

require('dotenv').config(); // for MONGO_URI

const TCP_IP = '0.0.0.0';
const TCP_PORT = 12345;
const HTTP_PORT = 3000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

let startTime = 0;
let endTime = 0;
let speed = 0;
const distance = 100;
const thresholdSpeed = 30;
let latestUID = '';
let latestTimestamp = '';
let currentEmail = '';

const uidEmailMap = {
  'b3 ab 9d 34': 'cb.sc.u4aie23334@cb.students.amrita.edu',
  '23 7c 23 35': 'cb.sc.u4aie23322@cb.students.amrita.edu',
};

const app = express();
app.use(express.static(path.join(__dirname, 'frontend/build')));
const httpServer = http.createServer(app);
const wss = new WebSocket.Server({ server: httpServer });

wss.on('connection', (ws) => {
  console.log('Client connected to WebSocket');
  ws.send(JSON.stringify({
    speed: speed.toFixed(2),
    uid: latestUID,
    timestamp: latestTimestamp,
    isOverspeeding: speed > thresholdSpeed
  }));
});

function broadcastData() {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        speed: speed.toFixed(2),
        uid: latestUID,
        timestamp: latestTimestamp,
        isOverspeeding: speed > thresholdSpeed
      }));
    }
  });
}

function getCurrentTimeIST() {
  const now = new Date();
  const istTime = new Date(now.getTime() + (5 * 60 + 30) * 60000);
  return istTime.toISOString().replace('T', ' ').substr(0, 19);
}

function sendEmail(data) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "rennydan72@gmail.com",
      pass: "kthc hhqt qtoe btii", // Use .env for security
    },
  });

  const message = {
    from: "rennydan72@gmail.com",
    to: data.email,
    subject: "Overspeeding Alert",
    html: `<p>Overspeeding detected!</p>
           <p>Speed: ${data.speed} m/s</p>
           <p>UID: ${data.uid}</p>
           <p>Timestamp: ${data.timestamp}</p>`,
  };

  transporter.sendMail(message, (error, info) => {
    if (error) return console.error("Email error:", error);
    console.log("Email sent:", info.response);
  });
}

function handleClient(socket) {
  const address = socket.remoteAddress;
  const port = socket.remotePort;
  const clientId = `${address}:${port}`;
  console.log(`New connection from ${clientId}`);

  socket.on('data', async (data) => {
    const message = data.toString().trim();
    if (!message) return;

    let time = null;
    let uid = null;

    if (message.includes('Time:')) {
      const parts = message.split('|');
      const timeStr = parts[0].split(':')[1].trim();
      time = parseInt(timeStr.replace(/\D/g, ''));
      if (parts.length > 1 && parts[1].includes('UID:')) {
        uid = parts[1].split(':')[1].trim();
        latestUID = uid;
        currentEmail = uidEmailMap[uid] || '';
      }
    }

    if (time) {
      const timestamp = getCurrentTimeIST();

      if (address === '192.168.197.10') {
        startTime = time / 1000;

        try {
          await Esp1Log.create({ uid: latestUID, timestamp });
          console.log('ESP1 log stored');
        } catch (err) {
          console.error('ESP1 log DB error:', err.message);
        }

      } else {
        endTime = time / 1000;
        speed = distance / (endTime - startTime);
        latestTimestamp = timestamp;

        try {
          await Esp2Log.create({ uid: latestUID, timestamp });
          console.log('ESP2 log stored');
        } catch (err) {
          console.error('ESP2 log DB error:', err.message);
        }

        // Check both RFID logs before logging into SpeedLog
        const esp1Exists = await Esp1Log.findOne({ uid: latestUID }).sort({ timestamp: -1 });
        const esp2Exists = await Esp2Log.findOne({ uid: latestUID }).sort({ timestamp: -1 });

        if (esp1Exists && esp2Exists) {
          try {
            await SpeedLog.create({
              uid: latestUID,
              email: currentEmail,
              startTime,
              endTime,
              speed: speed.toFixed(2),
              overspeedCount: speed > thresholdSpeed ? 1 : 0,
            });

            console.log('Speed log stored');
          } catch (err) {
            console.error('Speed log DB error:', err.message);
          }

          if (speed > thresholdSpeed && currentEmail) {
            sendEmail({
              speed: speed.toFixed(2),
              uid: latestUID,
              timestamp: latestTimestamp,
              email: currentEmail,
            });
          }
        } else {
          console.warn(`Skipping SpeedLog: UID ${latestUID} missing either ESP1 or ESP2 log.`);

        }

        broadcastData();
        console.log(`[SPEED] ${speed.toFixed(2)} m/s | UID: ${latestUID} | ${timestamp}`);
      }
    }

    console.log(`[${new Date().toISOString().replace('T', ' ').substr(0, 19)}] ${clientId}: ${message}`);
  });

  socket.on('error', (err) => console.log(`Socket error ${clientId}: ${err.message}`));
  socket.on('close', () => console.log(`Connection closed: ${clientId}`));
}

function main() {
  const tcpServer = net.createServer(handleClient);
  tcpServer.listen(TCP_PORT, TCP_IP, () => {
    console.log(`TCP server on ${TCP_PORT}, waiting for ESP32...`);
  });

  httpServer.listen(HTTP_PORT, () => {
    console.log(`HTTP server on http://localhost:${HTTP_PORT}`);
  });
}

main();
