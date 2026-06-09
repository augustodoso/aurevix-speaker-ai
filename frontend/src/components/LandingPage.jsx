import presentationMode from "../assets/presentation-mode.png";
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
          <button className="secondary-btn" onClick={() => setView("home")}>
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
          <p className="hero-tag">AI-Powered Presentation Platform</p>

          <h1>Create smarter presentations with AI.</h1>

          <p className="hero-description">
            Generate slides, receive speaker notes, interact with your audience
            and present with a private AI-powered presenter view.
          </p>

          <div className="hero-buttons">
            <button
              className="primary-btn"
              onClick={() => setView("generator")}
            >
              Generate Presentation
            </button>

            <button className="secondary-btn" onClick={() => setView("home")}>
              Open Dashboard
            </button>
          </div>
        </div>

        <div className="hero-preview">

        <img
          src={presentationMode}
          alt="Aurevix Speaker AI"
          className="hero-preview-image"
        />

      </div>
      </section>

      <section className="features-section">
        <div className="feature-card">
          <h3>AI Presentation Generator</h3>
          <p>
            Generate complete presentations with AI-powered slides and speaker
            notes.
          </p>
        </div>

        <div className="feature-card">
          <h3>Presentation Mode</h3>
          <p>
            Use private speaker notes and AI support while presenting live.
          </p>
        </div>

        <div className="feature-card">
          <h3>Audience Screen</h3>
          <p>
            Show a clean presentation screen to the audience without private
            notes.
          </p>
        </div>

        <div className="feature-card">
          <h3>AI Copilot</h3>
          <p>
            Ask AI questions about your presentation using contextual responses.
          </p>
        </div>
      </section>

      <section className="how-it-works-section">
        <h2>How it works</h2>

        <div className="steps-grid">
          <div className="step-card">
            <span>1</span>
            <h3>Choose a topic</h3>
            <p>Describe your presentation idea in a few words.</p>
          </div>

          <div className="step-card">
            <span>2</span>
            <h3>Generate slides with AI</h3>
            <p>Create a complete presentation structure instantly.</p>
          </div>

          <div className="step-card">
            <span>3</span>
            <h3>Present with confidence</h3>
            <p>Use Speaker Notes, Audience Screen and AI Copilot.</p>
          </div>
        </div>
      </section>

      <section className="audience-section">
        <h2>Built for professionals</h2>

        <div className="steps-grid">
          <div className="step-card">
            <h3>🎤 Speakers</h3>
            <p>Create and deliver presentations faster.</p>
          </div>

          <div className="step-card">
            <h3>👨‍🏫 Professors</h3>
            <p>Prepare classes with AI assistance.</p>
          </div>

          <div className="step-card">
            <h3>🏢 Companies</h3>
            <p>Improve internal training and workshops.</p>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <h2>Ready to transform your presentations?</h2>

        <p>
          Generate slides, receive speaker notes and interact with your audience
          using AI.
        </p>

        <button className="primary-btn" onClick={() => setView("generator")}>
          Try Aurevix Speaker AI Free
        </button>
      </section>
    </div>
  );
}

export default LandingPage;