function LandingPage({ setView }) {
  return (
    <div className="landing-page">

      <header className="landing-header">

        <div className="landing-logo">
          <div className="logo-fallback">A</div>

          <div>
            <h1>Aurevix</h1>
            <p>Speaker AI</p>
          </div>
        </div>

        <div className="landing-actions">
          <button
            className="secondary-btn"
            onClick={() => setView("home")}
          >
            Login
          </button>

          <button
            className="primary-btn"
            onClick={() => setView("generator")}
          >
            Try AI Generator
          </button>
        </div>

      </header>

      <section className="hero-section">

        <div className="hero-content">

          <p className="hero-tag">
            AI-Powered Presentation Platform
          </p>

          <h1>
            Create smarter presentations with AI.
          </h1>

          <p className="hero-description">
            Generate slides, export PowerPoints,
            interact with your audience in real time,
            and let AI assist you during presentations.
          </p>

          <div className="hero-buttons">

            <button
              className="primary-btn"
              onClick={() => setView("generator")}
            >
              Generate Presentation
            </button>

            <button
              className="secondary-btn"
              onClick={() => setView("home")}
            >
              Open Dashboard
            </button>

          </div>

        </div>

        <div className="hero-preview">

          <div className="hero-card">

            <div className="hero-card-top">
              <span>AI Presentation</span>
            </div>

            <h3>
              Artificial Intelligence in Healthcare
            </h3>

            <ul>
              <li>AI diagnosis systems</li>
              <li>Predictive healthcare</li>
              <li>Medical automation</li>
              <li>AI ethics in medicine</li>
            </ul>

          </div>

        </div>

      </section>

      <section className="features-section">

        <div className="feature-card">
          <h3>AI Presentation Generator</h3>

          <p>
            Generate complete presentations
            with AI-powered slides and speaker notes.
          </p>
        </div>

        <div className="feature-card">
          <h3>PowerPoint Export</h3>

          <p>
            Export presentations directly
            to editable .pptx files.
          </p>
        </div>

        <div className="feature-card">
          <h3>Audience Interaction</h3>

          <p>
            Receive audience questions in real time
            using QR Codes and live dashboards.
          </p>
        </div>

        <div className="feature-card">
          <h3>AI Copilot</h3>

          <p>
            Ask AI questions about your presentation
            using contextual RAG responses.
          </p>
        </div>

      </section>

    </div>
  );
}

export default LandingPage;