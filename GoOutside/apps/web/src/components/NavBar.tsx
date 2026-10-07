import Link from "next/link";

export default function Navbar() {
  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link href="/" className="logo">
          Go Outside
        </Link>

        <nav className="nav-links">
          <Link href="/">Home</Link>
          <Link href="/events">Events</Link>
          <Link href="/communities">Communities</Link>
        </nav>

        <div className="nav-actions">
          <Link href="/login" className="login-link">
            Log in
          </Link>

          <Link href="/profile" className="profile-button">
            Profile
          </Link>
        </div>
      </div>
    </header>
  );
}