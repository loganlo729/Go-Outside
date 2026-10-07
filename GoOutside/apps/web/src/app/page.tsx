import Link from "next/link";

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="page-container hero-content">
          <p className="eyebrow">GO OUTSIDE</p>

          <h1>
            Find your next reason
            <br />
            to step outside.
          </h1>

          <p className="hero-description">
            Discover outdoor events, meet new people, and find
            communities built around the things you love doing.
          </p>

          <div className="hero-actions">
            <Link href="/events" className="button button-primary">
              Explore Events
            </Link>

            <Link
              href="/communities"
              className="button button-secondary"
            >
              Find Communities
            </Link>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="page-container">
          <div className="section-heading">
            <p className="eyebrow">EXPLORE</p>
            <h2>There's more happening outside.</h2>

            <p>
              Find activities and people that give you a reason
              to close the laptop for a while.
            </p>
          </div>

          <div className="feature-grid">
            <article className="feature-card">
              <div className="feature-icon">01</div>

              <h3>Discover Events</h3>

              <p>
                Find outdoor events happening around you, from
                casual meetups to organized activities.
              </p>

              <Link href="/events">
                Browse events →
              </Link>
            </article>

            <article className="feature-card">
              <div className="feature-icon">02</div>

              <h3>Join Communities</h3>

              <p>
                Connect with groups built around shared outdoor
                interests and activities.
              </p>

              <Link href="/communities">
                Find communities →
              </Link>
            </article>

            <article className="feature-card">
              <div className="feature-icon">03</div>

              <h3>Meet People</h3>

              <p>
                Turn shared interests into real experiences with
                people in your area.
              </p>

              <Link href="/profile">
                View your profile →
              </Link>
            </article>
          </div>
        </div>
      </section>
    </>
  );
}