function PresentationDemo({ setView }) {
  const demoSlides = [
    {
      title: "Artificial Intelligence in Business",
      content: [
        "How AI is changing modern companies",
        "Automation, productivity and decision-making",
        "New opportunities for teams and leaders",
      ],
      speaker_notes:
        "Start by explaining how artificial intelligence is already present in everyday business operations.",
    },
    {
      title: "Why presentations need AI",
      content: [
        "Less time preparing slides",
        "Better structure and clarity",
        "More confidence for the presenter",
      ],
      speaker_notes:
        "Explain that the goal is not to replace the presenter, but to support preparation and delivery.",
    },
    {
      title: "Aurevix Speaker AI",
      content: [
        "AI-generated presentations",
        "Private speaker notes",
        "Audience interaction with QR Code",
        "AI Copilot during the presentation",
      ],
      speaker_notes:
        "Show how Aurevix connects preparation, presentation and audience interaction in one platform.",
    },
  ];

  return (
    <div className="demo-page">
      <button className="secondary-btn demo-back" onClick={() => setView("landing")}>
        ← Back to Landing
      </button>

      <div className="demo-layout">
        <section className="demo-slide">
          <p className="eyebrow">Live Demo</p>
          <h1>{demoSlides[0].title}</h1>

          <ul>
            {demoSlides[0].content.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </section>

        <aside className="demo-panel">
          <div className="live-card">
            <h3>Speaker Notes</h3>
            <p>{demoSlides[0].speaker_notes}</p>
          </div>

          <div className="live-card">
            <h3>AI Copilot</h3>
            <p>
              Suggested answer: AI helps presenters organize ideas, reduce
              preparation time and deliver clearer presentations.
            </p>
          </div>

          <div className="live-card">
            <h3>Audience QR</h3>
            <button className="primary-btn">Open Audience QR</button>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default PresentationDemo;