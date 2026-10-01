// routes/get.js

const express = require('express');
const router = express.Router();

const events = require('../data/events');


// ========================================
// EVENT SERVICES
// ========================================


// GET /api/events
// Get all events
router.get('/events', (req, res) => {
	res.json(events);
});


// GET /api/events/:id
// Get a single event
router.get('/events/:id', (req, res) => {
	const id = Number(req.params.id);

	const event = events.find(event => event.id === id);

	if (!event) {
		return res.status(404).send('Event not found.');
	}

	res.json(event);
});


// GET /api/events?category=:category
// Get all events within a category
router.get('/events', (req, res) => {
	const { category } = req.query;

	// If there is no category, return all events
	if (!category) {
		return res.json(events);
	}

	const filteredEvents = events.filter(event =>
		event.category.toLowerCase() === category.toLowerCase()
	);

	res.json(filteredEvents);
});


// GET /api/events?startdate=:startDate&endDate=:endDate
// Get all events within a timeframe
router.get('/events', (req, res) => {
	const { startdate, endDate } = req.query;

	// If dates aren't provided, return all events
	if (!startdate || !endDate) {
		return res.json(events);
	}

	const filteredEvents = events.filter(event => {
		return event.startDate >= startdate &&
			   event.endDate <= endDate;
	});

	res.json(filteredEvents);
});


// GET /api/events?cost=:cost
// Get all events within a cost
router.get('/events', (req, res) => {
	const cost = Number(req.query.cost);

	if (isNaN(cost)) {
		return res.status(400).send('Invalid cost.');
	}

	const filteredEvents = events.filter(event => event.cost <= cost);

	res.json(filteredEvents);
});


// GET /api/events?host=:hostId
// Get all events with a host ID
router.get('/events', (req, res) => {
	const hostId = Number(req.query.host);

	if (isNaN(hostId)) {
		return res.status(400).send('Invalid host ID.');
	}

	const filteredEvents = events.filter(event => event.host === hostId);

	res.json(filteredEvents);
});


// ========================================
// USER EVENT SERVICES
// ========================================


// Temporary user ID for testing
// Later, this should come from Penn State login/authentication
const currentUserId = 101;


// GET /api/users/me/events/upcoming
// Get user's upcoming events
router.get('/users/me/events/upcoming', (req, res) => {
	const today = new Date().toISOString().split('T')[0];

	const upcomingEvents = events.filter(event => {
		return event.rsvps.includes(currentUserId) &&
			   event.startDate >= today;
	});

	res.json(upcomingEvents);
});


// GET /api/users/me/events/past
// Get user's past events
router.get('/users/me/events/past', (req, res) => {
	const today = new Date().toISOString().split('T')[0];

	const pastEvents = events.filter(event => {
		return event.rsvps.includes(currentUserId) &&
			   event.endDate < today;
	});

	res.json(pastEvents);
});


// GET /api/users/me/events/active
// Get user's created and active events
router.get('/users/me/events/active', (req, res) => {
	const activeEvents = events.filter(event => {
		return event.host === currentUserId &&
			   event.active === true;
	});

	res.json(activeEvents);
});


// GET /api/users/me/events
// Get user's RSVPd events
router.get('/users/me/events', (req, res) => {
	const userEvents = events.filter(event =>
		event.rsvps.includes(currentUserId)
	);

	res.json(userEvents);
});


module.exports = router;