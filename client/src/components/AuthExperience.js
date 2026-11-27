import './AuthExperience.css';

export default function AuthExperience({ children }) {
  return <div className="auth-experience"><div className="auth-container auth-experience-content"><div className="auth-shell">
    {children}
    <nav className="auth-legal-links" aria-label="About NutriScan and privacy">
      <a href="/about">About NutriScan</a><a href="/privacy">Privacy policy</a><a href="/terms">Terms of use</a>
    </nav>
  </div></div></div>;
}
