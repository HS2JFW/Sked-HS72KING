
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3072;
const DATA_FILE = path.join(__dirname, 'bandData.json');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Load bandData from file if it exists
let bandData = {
  '1.8': { available: true, operator: null, callSign: null, mode: null, checkInTime: null },
  '3.5': { available: true, operator: null, callSign: null, mode: null, checkInTime: null },
  '7': { available: true, operator: null, callSign: null, mode: null, checkInTime: null },
  '10': { available: true, operator: null, callSign: null, mode: null, checkInTime: null },
  '14': { available: true, operator: null, callSign: null, mode: null, checkInTime: null },
  '18': { available: true, operator: null, callSign: null, mode: null, checkInTime: null },
  '21': { available: true, operator: null, callSign: null, mode: null, checkInTime: null },
  '24': { available: true, operator: null, callSign: null, mode: null, checkInTime: null },
  '28': { available: true, operator: null, callSign: null, mode: null, checkInTime: null },
  'Satellite': { available: true, operator: null, callSign: null, mode: null, checkInTime: null }
};

if (fs.existsSync(DATA_FILE)) {
  bandData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

// Function to find if operator is already checked in to any band
function isOperatorCheckedIn(operator) {
  for (let band in bandData) {
    if (!bandData[band].available && bandData[band].operator === operator) {
      return true;
    }
  }
  return false;
}

// Function to save bandData to file
function saveBandData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(bandData, null, 2));
}

// Route to serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('A user connected');

  // Send current bandData to the newly connected client
  socket.emit('update', bandData);

  // Handle 'update' event from client
  socket.on('update', (data) => {
    const { operator, callSign, band, mode, action } = data;

    if (action === 'check-in') {
      // Check if operator is already checked in to another band
      if (isOperatorCheckedIn(operator)) {
        socket.emit('error', `Operator ${operator} is already checked in to another band.`);
        return;
      }

      // Check if the band is available
      if (bandData[band].available) {
        // Update bandData with the new operator information and check-in time
        const checkInTime = new Date().toISOString();
        bandData[band] = { available: false, operator, callSign, mode, checkInTime };

        // Save updated bandData to file
        saveBandData();

        // Broadcast the updated bandData to all clients
        io.emit('update', bandData);
      } else {
        // Band is occupied, check if it's the same operator and mode change
        if (bandData[band].operator === operator && bandData[band].mode !== mode) {
          // Operator re-checks in with mode change
          const checkInTime = new Date().toISOString();
          bandData[band] = { available: false, operator, callSign, mode, checkInTime };

          // Save updated bandData to file
          saveBandData();

          // Broadcast the updated bandData to all clients
          io.emit('update', bandData);
        } else {
          socket.emit('error', `Band ${band} is already occupied`);
        }
      }
    } else if (action === 'check-out') {
      // Update bandData to mark the band as available
      bandData[band] = { available: true, operator: null, callSign: null, mode: null, checkInTime: null };

      // Save updated bandData to file
      saveBandData();

      // Broadcast the updated bandData to all clients
      io.emit('update', bandData);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
