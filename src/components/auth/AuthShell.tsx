import Link from "next/link";

function BookStackArt() {
  return (
    <svg viewBox="0 0 245 245" fill="none" aria-hidden="true" focusable="false">

      <ellipse cx="122" cy="196" rx="92" ry="13" fill="#E9E2DE" />

      <rect x="34" y="166" width="150" height="20" rx="3" fill="#A03037" />
      <rect x="44" y="148" width="168" height="20" rx="3" fill="#2F2A28" />
      <rect x="30" y="130" width="178" height="20" rx="3" fill="#4266B2" />
      <rect x="56" y="112" width="154" height="20" rx="3" fill="#D9A441" />
      <rect x="42" y="48" width="12" height="66" rx="2" fill="#8F2B2F" />
      <rect x="66" y="42" width="12" height="70" rx="2" fill="#2F2A28" />
      <rect x="90" y="52" width="12" height="62" rx="2" fill="#4266B2" />
      <rect x="114" y="46" width="12" height="68" rx="2" fill="#D9A441" />

      <path
        d="M120 118c-18-11-38-13-56-6v44c18-7 38-5 56 6V118Z"
        fill="#FFF7F3"
        stroke="#7C1E1E"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M120 118c18-11 38-13 56-6v44c-18-7-38-5-56 6V118Z"
        fill="#FBE9E5"
        stroke="#7C1E1E"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M120 120v40" stroke="#7C1E1E" strokeWidth="2" strokeLinecap="round" />
      <path d="M74 126c10-3 20-2 30 2M74 136c10-3 20-2 30 2" stroke="#D8B5AE" strokeWidth="2" strokeLinecap="round" />
      <path d="M166 126c-10-3-20-2-30 2M166 136c-10-3-20-2-30 2" stroke="#D8B5AE" strokeWidth="2" strokeLinecap="round" />

      <path d="M190 96l4 9 9 4-9 4-4 9-4-9-9-4 9-4 4-9Z" fill="#A03037" opacity="0.55" />
      <circle cx="56" cy="92" r="5" fill="#D9A441" opacity="0.7" />
      <circle cx="196" cy="150" r="4" fill="#4266B2" opacity="0.6" />
    </svg>
  );
}

export default function AuthShell({
  title,
  subtitle,
  activeTab,
  children,
}: {
  title?: string;
  subtitle?: string;
  activeTab?: "login" | "signup";
  children: React.ReactNode;
}) {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-illustration" aria-hidden="true">
          <BookStackArt />
          <div className="auth-illustration-copy">
            <h2>{activeTab === "signup" ? "Join Bookstore" : "Welcome back!"}</h2>
            <p>
              {activeTab === "signup"
                ? "Save your favourite books, order faster and never lose track of a delivery."
                : "Sign in to see your wishlist, track orders and get book recommendations."}
            </p>
          </div>
        </div>

        <main className="auth-form-panel">
          {activeTab ? (
            <div className="auth-tabs" role="tablist" aria-label="Account">
              <Link
                href="/login"
                role="tab"
                aria-selected={activeTab === "login"}
                className={`auth-tab ${activeTab === "login" ? "active" : ""}`}
              >
                Login
              </Link>
              <Link
                href="/signup"
                role="tab"
                aria-selected={activeTab === "signup"}
                className={`auth-tab ${activeTab === "signup" ? "active" : ""}`}
              >
                Signup
              </Link>
            </div>
          ) : (
            <>
              <h1 className="auth-title">{title}</h1>
              <p className="auth-subtitle">{subtitle}</p>
            </>
          )}

          {children}
        </main>
      </div>
    </div>
  );
}

