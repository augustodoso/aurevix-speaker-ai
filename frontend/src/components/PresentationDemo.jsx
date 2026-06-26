import { useState } from "react";

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
      copilot:
        "AI helps companies reduce repetitive work, improve decision-making and create better experiences for teams and customers.",
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
      copilot:
        "AI can organize ideas, suggest better structures and help presenters focus more on delivery than formatting.",
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
      copilot:
        "Aurevix combines slide generation, presenter support and audience interaction in a single AI-powered workflow.",
    },
  ];

  const [currentSlide, setCurrentSlide] = useState(0);
  const slide = demoSlides[currentSlide];

  function nextSlide() {
    setCurrentSlide((prev) =>
      prev === demoSlides.length - 1 ? prev : prev + 1
    );
  }

  function previousSlide() {
    setCurrentSlide((prev) => (prev === 0 ? prev : prev - 1));
  }

  return (
    <div className="premium-demo-page">
      <div className="premium-demo-header">
        <button
          className="secondary-btn"
          onClick={() => setView("landing")}
        >
          ← Back to Landing
        </button>

        <div>
          <p className="eyebrow">Live Demo</p>
          <h2>Aurevix Speaker AI</h2>
        </div>

        <button
          className="primary-btn"
          onClick={() => setView("generator")}
        >
          Create Your Own
        </button>
      </div>

      <div className="premium-demo-layout">
        <section className="premium-demo-slide">
          <p className="slide-counter">
            Slide {currentSlide + 1} / {demoSlides.length}
          </p>

          <h1>{slide.title}</h1>

          <ul>
            {slide.content.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </section>

        <aside className="premium-demo-panel">
          <div className="premium-card">
            <h3>Speaker Notes</h3>
            <p>{slide.speaker_notes}</p>
          </div>

          <div className="premium-card">
            <h3>AI Copilot</h3>
            <p>{slide.copilot}</p>
          </div>

          <div className="premium-card">
            <h3>Audience QR</h3>
            <p>Let your audience send questions during the presentation.</p>
            <button className="primary-btn">Open Audience QR</button>
          </div>
        </aside>
      </div>

      <div className="premium-demo-controls">
        <button
          className="secondary-btn"
          onClick={previousSlide}
          disabled={currentSlide === 0}
        >
          ← Previous
        </button>

        <strong>
          Slide {currentSlide + 1} / {demoSlides.length}
        </strong>

        <button
          className="secondary-btn"
          onClick={nextSlide}
          disabled={currentSlide === demoSlides.length - 1}
        >
          Next →
        </button>
      </div>
    </div>
  );
}

export default PresentationDemo;