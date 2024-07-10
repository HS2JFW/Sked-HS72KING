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
  '1.8': {},
  '3.5': {},
  '7': {},
  '10': {},
  '14': {},
  '18': {},
  '21': {},
  '24': {},
  '28': {},
  'Satellite': {}
};

if (fs.existsSync(DATA_FILE)) {
  bandData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
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
      if (!bandData[band][mode]) {
        // Update bandData with the new operator information and check-in time
        const checkInTime = new Date().toISOString();
        bandData[band][mode] = { operator, callSign, checkInTime };

        // Save updated bandData to file
        saveBandData();

        // Broadcast the updated bandData to all clients
        io.emit('update', bandData);
      } else {
        socket.emit('error', `Mode ${mode} on band ${band} is already occupied`);
      }
    } else if (action === 'check-out') {
      if (bandData[band][mode]) {
        // Update bandData to mark the mode on the band as available
        delete bandData[band][mode];

        // Save updated bandData to file
        saveBandData();

        // Broadcast the updated bandData to all clients
        io.emit('update', bandData);
      } else {
        socket.emit('error', `Mode ${mode} on band ${band} is not occupied`);
      }
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
