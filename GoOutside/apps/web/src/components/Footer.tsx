export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div>
          <p className="footer-logo">Go Outside</p>
          <p className="footer-description">
            Find events, communities, and new reasons to get outside.
          </p>
        </div>

        <p className="footer-copyright">
          © {new Date().getFullYear()} Go Outside
        </p>
      </div>
    </footer>
  );
}