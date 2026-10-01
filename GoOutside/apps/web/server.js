// server.js
// Import the express library
const express = require('express'); 

// Initialize the Express application
const app = express();


app.use(express.json()); 

// Create basic arrays as our "Databases"
let events = [];
let communities = [];

// Define the port the server will listen on
const PORT = 10533; 

// GET endpoint for all events
app.get('/api/events', (req, res) => {
	res.send(events);
});

// POST endpoint to create a new event
app.post('/api/events', (req, res) => {
	const {eventName, category, host} = req.body;

	// Require fields for validation
	if (!eventName || !category || !host) {
		return res.status(400).send('Missing required fields.');
	}

	// Create newEvent object
	const newEvent = {
        	eventName: eventName,
        	category: category,
        	host: host
    	};

	// Push to array
	events.push(newEvent);

	// Return success status
	res.status(201).json({
		message: 'Event created successfully',
		event: newEvent
	});
});

// GET endpoint for all communities
app.get('/api/communities', (req, res) => {
	res.send(communities);
});

// POST endpoint to create a new community
app.post('/api/communities', (req, res) => {
	const {communityName, category, host} = req.body;
	
	// Require fields for validation
	if (!communityName || !category || !host) {
		return res.status(400).send('Missing required fields.');
	}
	
	// Create newCommunity object
	const newCommunity = {
        	communityName: communityName,
        	category: category,
        	host: host
    	};

	// Push to array
	communities.push(newCommunity);

	// Return success status
	res.status(201).json({
		message: 'Community created successfully',
		community: newCommunity
	});
});

// Start the server
// Tell the server to listen for incoming network requests
app.listen(PORT, () => {
	console.log(`Server is running at http://localhost:${PORT}`);
});