export default function EventsPage() {
  return (
    <div className="page-container page-section">
      <div className="page-header">
        <p className="eyebrow">DISCOVER</p>
        <h1>Events</h1>

        <p>
          Find something happening near you and get outside.
        </p>
      </div>

      <div className="empty-card">
        <h2>Events are coming soon.</h2>

        <p>
          Event data from the Go Outside API will appear here.
        </p>
      </div>
    </div>
  );
}