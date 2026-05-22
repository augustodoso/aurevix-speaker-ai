import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

const API_URL = "http://127.0.0.1:8001";

function App() {
  const [view, setView] = useState("home");
  const [lectures, setLectures] = useState([]);
  const [selectedLectureId, setSelectedLectureId] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [slidesByLecture, setSlidesByLecture] = useState({});
  const [slideSummaries, setSlideSummaries] = useState({});
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    speaker_name: "",
    topic: "",
    description: "",
  });

  const isPresentation = view === "presentation";

  useEffect(() => {
    loadLectures();
  }, []);

  useEffect(() => {
    if (!selectedLectureId) return;

    loadDashboard(selectedLectureId);

    const socket = new WebSocket("ws://127.0.0.1:8001/ws");

    socket.onmessage = () => {
      loadDashboard(selectedLectureId);
    };

    return () => socket.close();
  }, [selectedLectureId]);

  async function loadLectures() {
    try {
      const response = await axios.get(`${API_URL}/lectures`);
      setLectures(response.data);

      response.data.forEach((lecture) => {
        loadSlides(lecture.id);
      });
    } catch (error) {
      console.error(error);
    }
  }

  async function loadSlides(id) {
    try {
      const response = await axios.get(`${API_URL}/lectures/${id}/slides`);

      setSlidesByLecture((prev) => ({
        ...prev,
        [id]: response.data,
      }));
    } catch (error) {
      console.error(error);
    }
  }

  async function loadDashboard(id) {
    try {
      const response = await axios.get(`${API_URL}/dashboard/${id}/data`);
      setDashboard(response.data);
      await loadSlides(id);
    } catch (error) {
      console.error(error);
    }
  }

  async function createLecture(e) {
    e.preventDefault();

    try {
      await axios.post(`${API_URL}/lectures`, formData);

      setFormData({
        title: "",
        speaker_name: "",
        topic: "",
        description: "",
      });

      await loadLectures();
      setView("home");
    } catch (error) {
      console.error(error);
      alert("Error creating lecture");
    }
  }

  async function uploadSlide(id, file) {
    if (!file) return;

    const form = new FormData();
    form.append("file", file);

    try {
      await axios.post(`${API_URL}/lectures/${id}/upload-slide`, form);
      await loadSlides(id);
      alert("Slide uploaded!");
    } catch (error) {
      console.error(error);
      alert("Error uploading slide");
    }
  }

  async function loadSlideSummary(slideId) {
    try {
      const response = await axios.get(`${API_URL}/slides/${slideId}/summary`);

      setSlideSummaries((prev) => ({
        ...prev,
        [slideId]: response.data.summary,
      }));
    } catch (error) {
      console.error(error);
    }
  }

  async function askLectureAI() {
    if (!selectedLectureId || !aiQuestion.trim()) return;

    const form = new FormData();
    form.append("question", aiQuestion);

    try {
      setAiLoading(true);

      const response = await axios.post(
        `${API_URL}/lectures/${selectedLectureId}/rag-answer`,
        form
      );

      setAiAnswer(response.data.answer);
    } catch (error) {
      console.error(error);
      alert("Error asking Lecture AI");
    } finally {
      setAiLoading(false);
    }
  }

  function openDashboard(id) {
    setSelectedLectureId(id);
    setDashboard(null);
    setAiQuestion("");
    setAiAnswer("");
    setView("dashboard");
  }

  function handleChange(e) {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  }

  return (
    <div className={isPresentation ? "app-shell presentation-shell" : "app-shell"}>
      {!isPresentation && (
        <Sidebar
          lectures={lectures}
          selectedLectureId={selectedLectureId}
          openDashboard={openDashboard}
          setView={setView}
        />
      )}

      <main className={isPresentation ? "workspace presentation-workspace" : "workspace"}>
        {view === "create" && (
          <CreateLecture
            formData={formData}
            handleChange={handleChange}
            createLecture={createLecture}
          />
        )}

        {view === "dashboard" && dashboard && (
          <Dashboard
            dashboard={dashboard}
            lectureId={selectedLectureId}
            slides={slidesByLecture[selectedLectureId] || []}
            slideSummaries={slideSummaries}
            loadSlideSummary={loadSlideSummary}
            uploadSlide={uploadSlide}
            aiQuestion={aiQuestion}
            setAiQuestion={setAiQuestion}
            aiAnswer={aiAnswer}
            aiLoading={aiLoading}
            askLectureAI={askLectureAI}
            setView={setView}
          />
        )}

        {view === "presentation" && dashboard && (
          <PresentationMode
            dashboard={dashboard}
            slides={slidesByLecture[selectedLectureId] || []}
            setView={setView}
          />
        )}

        {view === "home" && (
          <Home
            lectures={lectures}
            slidesByLecture={slidesByLecture}
            openDashboard={openDashboard}
            setView={setView}
          />
        )}
      </main>
    </div>
  );
}

function Sidebar({ lectures, selectedLectureId, openDashboard, setView }) {
  return (
    <aside className="sidebar">
      <div>
        <div className="brand">
          <img src={`${API_URL}/static/logo`} alt="Aurevix" />
          <div>
            <h1>Aurevix</h1>
            <p>Speaker AI</p>
          </div>
        </div>

        <nav className="nav">
          <button onClick={() => setView("home")}>Home</button>
          <button onClick={() => setView("create")}>New lecture</button>
        </nav>

        <div className="sidebar-section">
          <p className="section-label">Recent lectures</p>

          {lectures.length === 0 ? (
            <p className="empty-small">No lectures yet.</p>
          ) : (
            lectures.map((lecture) => (
              <button
                key={lecture.id}
                className={
                  selectedLectureId === lecture.id
                    ? "lecture-nav active"
                    : "lecture-nav"
                }
                onClick={() => openDashboard(lecture.id)}
              >
                <span>{lecture.title}</span>
                <small>{lecture.topic}</small>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="sidebar-footer">
        <span className="status-dot"></span>
        Local server running
      </div>
    </aside>
  );
}

function Home({ lectures, slidesByLecture, openDashboard, setView }) {
  return (
    <div className="page">
      <header className="top-header">
        <div>
          <p className="eyebrow">Aurevix Speaker AI</p>
          <h2>Home</h2>
        </div>

        <button className="primary-btn small" onClick={() => setView("create")}>
          + New lecture
        </button>
      </header>

      <section className="powerpoint-hero">
        <div>
          <h1>Start a smarter presentation.</h1>
          <p>
            Create a lecture, upload your slides, collect audience questions and
            let AI help you answer with context.
          </p>
        </div>

        <div className="hero-preview">
          <div className="mini-slide">
            <span>AI</span>
            <small>Presentation Copilot</small>
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-header">
          <h3>Recent presentations</h3>
          <p>{lectures.length} total</p>
        </div>

        {lectures.length === 0 ? (
          <div className="empty-state">
            <h3>No presentations yet</h3>
            <p>Create your first AI-powered lecture to start.</p>
          </div>
        ) : (
          <div className="presentation-grid">
            {lectures.map((lecture) => {
              const slideCount = slidesByLecture[lecture.id]?.length || 0;

              return (
                <article key={lecture.id} className="presentation-card">
                  <div className="presentation-cover">
                    <div className="cover-top"></div>
                    <div className="cover-content">
                      <span>{lecture.topic || "Lecture"}</span>
                      <strong>{lecture.title}</strong>
                    </div>
                  </div>

                  <div className="presentation-info">
                    <h3>{lecture.title}</h3>
                    <p>{lecture.speaker_name}</p>

                    <div className="meta-row">
                      <span>{slideCount} slides</span>
                      <span>AI ready</span>
                    </div>

                    <button
                      className="primary-btn"
                      onClick={() => openDashboard(lecture.id)}
                    >
                      Open dashboard
                    </button>

                    <div className="link-row">
                      <a
                        href={`${API_URL}/audience/${lecture.id}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Audience
                      </a>

                      <a
                        href={`${API_URL}/lectures/${lecture.id}/qrcode`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        QR Code
                      </a>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function CreateLecture({ formData, handleChange, createLecture }) {
  return (
    <div className="page">
      <header className="top-header">
        <div>
          <p className="eyebrow">New presentation</p>
          <h2>Create lecture</h2>
        </div>
      </header>

      <form className="create-card" onSubmit={createLecture}>
        <div>
          <h1>Lecture details</h1>
          <p>Fill the base information before adding slides and audience tools.</p>
        </div>

        <input
          name="title"
          placeholder="Lecture title"
          value={formData.title}
          onChange={handleChange}
          required
        />

        <input
          name="speaker_name"
          placeholder="Speaker name"
          value={formData.speaker_name}
          onChange={handleChange}
          required
        />

        <input
          name="topic"
          placeholder="Lecture topic"
          value={formData.topic}
          onChange={handleChange}
          required
        />

        <textarea
          name="description"
          rows="5"
          placeholder="Lecture description"
          value={formData.description}
          onChange={handleChange}
          required
        />

        <button className="primary-btn">Create lecture</button>
      </form>
    </div>
  );
}

function Dashboard({
  dashboard,
  lectureId,
  slides,
  slideSummaries,
  loadSlideSummary,
  uploadSlide,
  aiQuestion,
  setAiQuestion,
  aiAnswer,
  aiLoading,
  askLectureAI,
  setView,
}) {
  return (
    <div className="page dashboard-page">
      <header className="top-header">
        <div>
          <p className="eyebrow">Live dashboard</p>
          <h2>{dashboard.lecture.title}</h2>
          <p>Speaker: {dashboard.lecture.speaker_name}</p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            className="primary-btn small"
            onClick={() => setView("presentation")}
          >
            Presentation Mode
          </button>

          <button className="secondary-btn small" onClick={() => setView("home")}>
            Back home
          </button>
        </div>
      </header>

      <div className="dashboard-layout">
        <section className="dashboard-main">
          <div className="metrics-row">
            <Metric title="Questions" value={dashboard.total_questions} />
            <Metric title="Main theme" value={dashboard.main_theme} />
            <Metric title="Slides" value={slides.length} />
          </div>

          <div className="panel">
            <div className="section-header">
              <h3>Slides</h3>
              <p>Upload and analyze lecture materials</p>
            </div>

            <div className="slides-list">
              {slides.length === 0 ? (
                <p className="muted">No slides uploaded yet.</p>
              ) : (
                slides.map((slide) => (
                  <SlideItem
                    key={slide.id}
                    slide={slide}
                    summary={slideSummaries[slide.id]}
                    loadSlideSummary={loadSlideSummary}
                  />
                ))
              )}
            </div>

            <input
              type="file"
              accept=".pdf,.ppt,.pptx"
              onChange={(e) => uploadSlide(lectureId, e.target.files[0])}
            />
          </div>

          <div className="two-columns">
            <QuestionPanel
              title="Recent questions"
              questions={dashboard.recent_questions}
            />

            <QuestionPanel
              title="Priority questions"
              questions={dashboard.priority_questions}
              priority
            />
          </div>

          <div className="panel">
            <h3>AI Analysis</h3>
            <p className="ai-text">{dashboard.ai_analysis}</p>
          </div>

          <div className="panel">
            <h3>AI Suggested Response</h3>
            <p className="ai-text">{dashboard.speaker_response}</p>
          </div>
        </section>

        <aside className="copilot-panel">
          <div>
            <p className="eyebrow">AI Copilot</p>
            <h3>Ask about this lecture</h3>
            <p>The answer uses the PDF chunks saved from this presentation.</p>
          </div>

          <textarea
            rows="5"
            placeholder="Ask something about this lecture..."
            value={aiQuestion}
            onChange={(e) => setAiQuestion(e.target.value)}
          />

          <button className="primary-btn" onClick={askLectureAI}>
            {aiLoading ? "Thinking..." : "Ask Lecture AI"}
          </button>

          {aiAnswer && (
            <div className="answer-box">
              <pre>{aiAnswer}</pre>
            </div>
          )}

          <div className="qr-box">
            <h4>Audience QR Code</h4>
            <img src={dashboard.qrcode_url} alt="QR Code" />
          </div>
        </aside>
      </div>
    </div>
  );
}

function PresentationMode({ dashboard, slides, setView }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slide = slides[currentSlide];

  function nextSlide() {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide((prev) => prev + 1);
    }
  }

  function prevSlide() {
    if (currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1);
    }
  }

  function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
}

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "ArrowRight") {
        nextSlide();
      }

      if (e.key === "ArrowLeft") {
        prevSlide();
      }

      if (e.key === "Escape") {
        setView("dashboard");
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentSlide, slides.length]);

  return (
    <div className="presentation-mode">
      <header className="presentation-header">
        <div>
          <p className="eyebrow">Presentation Mode</p>

          <h2>{dashboard.lecture.title}</h2>
        </div>

        <button
          className="secondary-btn small"
          onClick={() => setView("dashboard")}
        >
          <button
  className="secondary-btn small"
  onClick={toggleFullscreen}
>
  Fullscreen
</button>

          Back to dashboard
        </button>
      </header>

      <div className="presentation-stage">
        <div>
          <section className="big-slide">
            {slide?.thumbnail_url ? (
              <img
                src={slide.thumbnail_url}
                alt={slide.filename}
              />
            ) : (
              <div className="slide-placeholder">
                <h1>{dashboard.lecture.title}</h1>

                <p>{dashboard.lecture.topic}</p>
              </div>
            )}
          </section>

          <div className="slide-controls">
            <button onClick={prevSlide}>
              ← Previous
            </button>

            <span>
              Slide {slides.length === 0 ? 0 : currentSlide + 1} / {slides.length}
            </span>

            <button onClick={nextSlide}>
              Next →
            </button>
          </div>
        </div>

        <aside className="live-panel">
          <div className="live-card">
            <h3>Live Questions</h3>

            {dashboard.recent_questions.length === 0 ? (
              <p className="muted">
                No questions yet.
              </p>
            ) : (
              dashboard.recent_questions.map((q) => (
                <div
                  key={q.id}
                  className="question-item"
                >
                  <strong>{q.user_name}</strong>

                  <p>{q.question}</p>
                </div>
              ))
            )}
          </div>

          <div className="live-card">
            <h3>AI Copilot</h3>

            <p className="ai-text">
              {dashboard.speaker_response}
            </p>
          </div>

          <div className="live-card">
            <h3>Audience QR</h3>

            <img
              src={dashboard.qrcode_url}
              alt="Audience QR"
              className="presentation-qr"
            />
          </div>
        </aside>
      </div>
    </div>
  );
}

function Metric({ title, value }) {
  return (
    <div className="metric">
      <p>{title}</p>
      <strong>{value}</strong>
    </div>
  );
}

function QuestionPanel({ title, questions, priority }) {
  return (
    <div className="panel">
      <h3>{title}</h3>

      {questions.length === 0 ? (
        <p className="muted">No questions yet.</p>
      ) : (
        questions.map((q) => (
          <div key={q.id} className="question-item">
            <strong>{q.user_name}</strong>
            <p>{q.question}</p>
            {priority && <small>Priority: {q.priority_score}/10</small>}
          </div>
        ))
      )}
    </div>
  );
}

function SlideItem({ slide, summary, loadSlideSummary }) {
  return (
    <div className="slide-item">
      <div className="slide-thumb">
        {slide.thumbnail_url ? (
          <img
            src={slide.thumbnail_url}
            alt={slide.filename}
            className="slide-thumbnail"
          />
        ) : (
          <span>PDF</span>
        )}
      </div>

      <div className="slide-info">
        <strong>{slide.filename}</strong>

        <div className="slide-actions">
          <button
            className="secondary-btn"
            onClick={() => loadSlideSummary(slide.id)}
          >
            AI Summary
          </button>

          <a
            href={`${API_URL}/${slide.filepath}`}
            target="_blank"
            rel="noreferrer"
          >
            View PDF
          </a>
        </div>

        {summary && <div className="summary-box">{summary}</div>}
      </div>
    </div>
  );
}

export default App;