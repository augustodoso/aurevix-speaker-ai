import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

const API_URL = "https://aurevix-speaker-ai.onrender.com";
const TOKEN_KEY = "aurevix_speaker_token";

function App() {
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [authLoading, setAuthLoading] = useState(false);

  const [view, setView] = useState("home");  
  const [lectures, setLectures] = useState([]);
  const [selectedLectureId, setSelectedLectureId] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [slidesByLecture, setSlidesByLecture] = useState({});
  const [slideSummaries, setSlideSummaries] = useState({});
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const [generatorTopic, setGeneratorTopic] = useState("");
  const [generatedPresentation, setGeneratedPresentation] = useState([]);
  const [generatorLoading, setGeneratorLoading] = useState(false);
  const [savedPresentations, setSavedPresentations] = useState([]);
  
  const [toast, setToast] = useState(null);

  function showToast(message, type = "success") {
  setToast({ message, type });

  setTimeout(() => {
    setToast(null);
  }, 3000);
}
  const [formData, setFormData] = useState({
    title: "",
    speaker_name: "",
    topic: "",
    description: "",
  });

  const isPresentation = view === "presentation";

  const authHeaders = token
    ? { headers: { Authorization: `Bearer ${token}` } }
    : {};

  useEffect(() => {
    if (token) {
      loadCurrentUser();
      loadLectures();
      loadGeneratedPresentations();
    }
  }, [token]);

  useEffect(() => {
    if (!selectedLectureId || !token) return;

    loadDashboard(selectedLectureId);

    const socket = new WebSocket("wss://aurevix-speaker-ai.onrender.com/ws");

socket.onmessage = () => {
  loadDashboard(selectedLectureId);
};

return () => socket.close();
  }, [selectedLectureId, token]);

  function handleLoginSuccess(newToken) {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setView("home");
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setLectures([]);
    setSelectedLectureId(null);
    setDashboard(null);
    setSlidesByLecture({});
    setSlideSummaries({});
    setAiQuestion("");
    setAiAnswer("");
    setGeneratorTopic("");
    setGeneratedPresentation([]);
    setSavedPresentations([]);
    setView("home");
  }

  async function loadCurrentUser() {
    try {
      const response = await axios.get(`${API_URL}/auth/me`, authHeaders);
      setUser(response.data);
    } catch (error) {
      console.error(error);
      logout();
    }
  }

  async function handleAuthSubmit(e, authData) {
    e.preventDefault();

    try {
      setAuthLoading(true);

      const endpoint = authMode === "login" ? "/auth/login" : "/auth/register";

      const payload =
        authMode === "login"
          ? {
              email: authData.email,
              password: authData.password,
            }
          : {
              name: authData.name,
              email: authData.email,
              password: authData.password,
            };

      const response = await axios.post(`${API_URL}${endpoint}`, payload);

      const accessToken =
        response.data.access_token ||
        response.data.token ||
        response.data.accessToken;

      if (!accessToken) {
        alert("Account created. Now login.");
        setAuthMode("login");
        return;
      }

      handleLoginSuccess(accessToken);
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.detail || "Authentication error");
    } finally {
      setAuthLoading(false);
    }
  }

  async function loadLectures() {
    try {
      const response = await axios.get(`${API_URL}/lectures`, authHeaders);
      setLectures(response.data);

      response.data.forEach((lecture) => {
        loadSlides(lecture.id);
      });
    } catch (error) {
      console.error(error);

      if (error.response?.status === 401 || error.response?.status === 403) {
        logout();
      }
    }
  }

  async function loadSlides(id) {
    try {
      const response = await axios.get(
        `${API_URL}/lectures/${id}/slides`,
        authHeaders
      );

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
      const response = await axios.get(
        `${API_URL}/dashboard/${id}/data`,
        authHeaders
      );

      setDashboard(response.data);
      await loadSlides(id);
    } catch (error) {
      console.error(error);

      if (error.response?.status === 404) {
        alert("Lecture not found or you do not have access.");
        setView("home");
      }
    }
  }

  async function createLecture(e) {
    e.preventDefault();

    try {
      await axios.post(`${API_URL}/lectures`, formData, authHeaders);

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
      await axios.post(
        `${API_URL}/lectures/${id}/upload-slide`,
        form,
        authHeaders
      );

      await loadSlides(id);
      alert("Slide uploaded!");
    } catch (error) {
      console.error(error);
      alert("Error uploading slide");
    }
  }

  async function loadSlideSummary(slideId) {
    try {
      const response = await axios.get(
        `${API_URL}/slides/${slideId}/summary`,
        authHeaders
      );

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
        form,
        authHeaders
      );

      setAiAnswer(response.data.answer);
    } catch (error) {
      console.error(error);
      alert("Error asking Lecture AI");
    } finally {
      setAiLoading(false);
    }
  }

  async function generatePresentation() {
    if (!generatorTopic.trim()) {
      alert("Please enter a presentation topic.");
      return;
    }

    const form = new FormData();
    form.append("topic", generatorTopic);

    try {
      setGeneratorLoading(true);
      setGeneratedPresentation([]);

      const response = await axios.post(
        `${API_URL}/ai/generate-presentation`,
        form,
        authHeaders
      );

      setGeneratedPresentation(response.data.slides || []);
    } catch (error) {
      console.error(error);
      alert("Error generating presentation");
    } finally {
      setGeneratorLoading(false);
    }
  }

  async function savePresentation() {
    if (!generatorTopic.trim() || generatedPresentation.length === 0) {
      alert("Generate a presentation before saving.");
      return;
    }

    const form = new FormData();
    form.append("topic", generatorTopic);
    form.append("slides_json", JSON.stringify(generatedPresentation));

    try {
      await axios.post(`${API_URL}/ai/save-presentation`, form, authHeaders);
      await loadGeneratedPresentations();
      alert("Presentation saved!");
    } catch (error) {
      console.error(error);
      alert("Error saving presentation");
    }
  }

  async function loadGeneratedPresentations() {
    try {
      const response = await axios.get(
        `${API_URL}/ai/generated-presentations`,
        authHeaders
      );

      setSavedPresentations(response.data || []);
    } catch (error) {
      console.error(error);
    }
  }

  async function deleteGeneratedPresentation(id) {
    try {
      await axios.delete(
        `${API_URL}/ai/generated-presentations/${id}`,
        authHeaders
      );

      await loadGeneratedPresentations();
    } catch (error) {
      console.error(error);
      alert("Error deleting saved presentation");
    }
  }

  function openSavedPresentation(presentation) {
    setGeneratorTopic(presentation.topic);
    setGeneratedPresentation(presentation.slides || []);
    setView("generator");
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

  if (!token) {
    return (
      <AuthScreen
        authMode={authMode}
        setAuthMode={setAuthMode}
        authLoading={authLoading}
        handleAuthSubmit={handleAuthSubmit}
      />
    );
  }

  return (
    <div className={isPresentation ? "app-shell presentation-shell" : "app-shell"}>
      {!isPresentation && (
        <Sidebar
          lectures={lectures}
          selectedLectureId={selectedLectureId}
          openDashboard={openDashboard}
          setView={setView}
          logout={logout}
          user={user}
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

        {view === "generator" && (
          <AIPresentationGenerator
            generatorTopic={generatorTopic}
            setGeneratorTopic={setGeneratorTopic}
            generatedPresentation={generatedPresentation}
            setGeneratedPresentation={setGeneratedPresentation}
            generatorLoading={generatorLoading}
            generatePresentation={generatePresentation}
            savePresentation={savePresentation}
            savedPresentations={savedPresentations}
            openSavedPresentation={openSavedPresentation}
            deleteGeneratedPresentation={deleteGeneratedPresentation}
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
            loadLectures={loadLectures}
            token={token}
          />
        )}
      </main>

      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.message}
        </div>
    )}

    </div>
  );
}

function AuthScreen({ authMode, setAuthMode, authLoading, handleAuthSubmit }) {
  const [authData, setAuthData] = useState({
    name: "",
    email: "",
    password: "",
  });

  function handleAuthChange(e) {
    setAuthData({
      ...authData,
      [e.target.name]: e.target.value,
    });
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="brand auth-brand">
          <div className="logo-fallback">A</div>
          <div>
            <h1>Aurevix</h1>
            <p>Speaker AI</p>
          </div>
        </div>

        <div>
          <p className="eyebrow">Secure access</p>
          <h2>{authMode === "login" ? "Login" : "Create account"}</h2>
          <p className="muted">
            Access your AI-powered presentation dashboard.
          </p>
        </div>

        <form onSubmit={(e) => handleAuthSubmit(e, authData)}>
          {authMode === "register" && (
            <input
              name="name"
              placeholder="Name"
              value={authData.name}
              onChange={handleAuthChange}
              required
            />
          )}

          <input
            name="email"
            type="email"
            placeholder="Email"
            value={authData.email}
            onChange={handleAuthChange}
            required
          />

          <input
            name="password"
            type="password"
            placeholder="Password"
            value={authData.password}
            onChange={handleAuthChange}
            required
          />

          <button className="primary-btn" disabled={authLoading}>
            {authLoading
              ? "Please wait..."
              : authMode === "login"
              ? "Login"
              : "Create account"}
          </button>
        </form>

        <button
          className="secondary-btn"
          onClick={() =>
            setAuthMode(authMode === "login" ? "register" : "login")
          }
        >
          {authMode === "login"
            ? "Create a new account"
            : "Already have an account? Login"}
        </button>
      </div>
    </div>
  );
}

function Sidebar({
  lectures,
  selectedLectureId,
  openDashboard,
  setView,
  logout,
  user,
}) {
  return (
    <aside className="sidebar">
      <div>
        <div className="brand">
          <div className="logo-fallback">A</div>
          <div>
            <h1>Aurevix</h1>
            <p>Speaker AI</p>
          </div>
        </div>

        <nav className="nav">
          <button onClick={() => setView("home")}>Home</button>
          <button onClick={() => setView("create")}>New lecture</button>
          <button onClick={() => setView("generator")}>AI Generator</button>
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

      <div className="sidebar-footer user-footer">
        <div>
          <span className="status-dot"></span>
          <span>{user ? `Logged as ${user.name}` : "Online"}</span>
        </div>

        <button className="logout-btn" onClick={logout}>
          Logout
        </button>
      </div>
    </aside>
  );
}

function Home({
  lectures,
  slidesByLecture,
  openDashboard,
  setView,
  loadLectures,
  token,
}) {
  const authHeaders = token
    ? { headers: { Authorization: `Bearer ${token}` } }
    : {};

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

                    <div className="lecture-actions">
                      <button
                        className="secondary-btn"
                        onClick={async () => {
                          const confirmDelete = window.confirm(
                            "Delete this lecture?"
                          );

                          if (!confirmDelete) return;

                          try {
                            await axios.delete(
                              `${API_URL}/lectures/${lecture.id}`,
                              authHeaders
                            );

                            await loadLectures();
                          } catch (error) {
                            console.error(error);
                            alert("Error deleting lecture");
                          }
                        }}
                      >
                        Delete lecture
                      </button>

                      <button
                        className="primary-btn"
                        onClick={() => openDashboard(lecture.id)}
                      >
                        Open dashboard
                      </button>
                    </div>

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

function AIPresentationGenerator({
  generatorTopic,
  setGeneratorTopic,
  generatedPresentation,
  setGeneratedPresentation,
  generatorLoading,
  generatePresentation,
  savePresentation,
  savedPresentations,
  openSavedPresentation,
  deleteGeneratedPresentation,
}) {
  const [editingSlideIndex, setEditingSlideIndex] = useState(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedContent, setEditedContent] = useState("");

  async function exportPresentation() {
    if (!generatorTopic.trim()) {
      alert("Please enter a presentation topic first.");
      return;
    }

    const form = new FormData();
    form.append("topic", generatorTopic);

    try {
      const response = await axios.post(`${API_URL}/ai/export-pptx`, form, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
        },
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");

      link.href = url;
      link.setAttribute("download", `${generatorTopic}.pptx`);

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Error exporting PowerPoint");
    }
  }

  function startEditingSlide(slide, index) {
    setEditingSlideIndex(index);
    setEditedTitle(slide.title || "");
    setEditedContent((slide.content || []).join("\n"));
  }

  function saveSlideEdit(index) {
    const updatedSlides = [...generatedPresentation];

    updatedSlides[index] = {
      ...updatedSlides[index],
      title: editedTitle,
      content: editedContent
        .split("\n")
        .map((item) => item.trim())
        .filter((item) => item !== ""),
    };

    setGeneratedPresentation(updatedSlides);
    setEditingSlideIndex(null);
  }

  return (
    <div className="page">
      <header className="top-header">
        <div>
          <p className="eyebrow">Aurevix AI</p>
          <h2>AI Presentation Generator</h2>
          <p>Create a complete presentation structure from a simple topic.</p>
        </div>
      </header>

      <section className="panel generator-panel">
        <h3>Generate a presentation</h3>
        <p className="muted">
          Enter a topic and Aurevix will generate slides, bullet points,
          speaker notes and possible audience questions.
        </p>

        <textarea
          rows="5"
          placeholder="Example: Artificial Intelligence in Healthcare"
          value={generatorTopic}
          onChange={(e) => setGeneratorTopic(e.target.value)}
        />

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button
          className={`primary-btn ${
           generatorLoading ? "loading-btn" : ""
            }`}
           onClick={generatePresentation}
           disabled={generatorLoading}
>
          {generatorLoading ? (
           <div className="button-loading">
           <div className="spinner"></div>
           <span>Generating...</span>
          </div>
  ) : (
           "Generate Presentation"
   )}
          </button>

          <button
            className="secondary-btn"
            onClick={exportPresentation}
            disabled={generatorLoading}
          >
            Export PPTX
          </button>

          <button
            className="secondary-btn"
            onClick={savePresentation}
            disabled={generatorLoading || generatedPresentation.length === 0}
          >
            Save Presentation
          </button>
        </div>
      </section>

      {savedPresentations.length > 0 && (
        <section className="panel">
          <div className="section-header">
            <h3>My AI Presentations</h3>
            <p>{savedPresentations.length} saved presentations.</p>
          </div>

          <div className="generated-slides">
            {savedPresentations.map((item) => (
              <div key={item.id} className="generated-slide-card">
                <div className="generated-slide-top">
                  <span>Saved Presentation</span>
                </div>

                <h3>{item.topic}</h3>
                <p className="muted">{item.slides?.length || 0} slides saved.</p>

                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  <button
                    className="primary-btn"
                    onClick={() => openSavedPresentation(item)}
                  >
                    Open
                  </button>

                  <button
                    className="secondary-btn"
                    onClick={() => deleteGeneratedPresentation(item.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {generatedPresentation.length > 0 && (
        <section className="panel">
          <div className="section-header">
            <h3>Generated slides</h3>
            <p>{generatedPresentation.length} slides created by AI.</p>
          </div>

          <div className="generated-slides">
            {generatedPresentation.map((slide, index) => (
              <div key={index} className="generated-slide-card">
                <div className="generated-slide-top">
                  <span>Slide {index + 1}</span>
                </div>

                {editingSlideIndex === index ? (
                  <>
                    <input
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                    />

                    <textarea
                      rows="8"
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                    />

                    <button
                      className="primary-btn"
                      onClick={() => saveSlideEdit(index)}
                    >
                      Save Slide
                    </button>
                  </>
                ) : (
                  <>
                    <h3>{slide.title}</h3>

                    <ul>
                      {slide.content?.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>

                    <div className="speaker-notes">
                      <strong>Speaker Notes</strong>
                      <p>{slide.speaker_notes}</p>
                    </div>

                    <button
                      className="secondary-btn"
                      onClick={() => startEditingSlide(slide, index)}
                    >
                      Edit Slide
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
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

            <a
              href={dashboard.qrcode_url}
              target="_blank"
              rel="noreferrer"
              className="primary-btn"
            >
              Open QR Code
            </a>
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
      if (e.key === "ArrowRight") nextSlide();
      if (e.key === "ArrowLeft") prevSlide();
      if (e.key === "Escape") setView("dashboard");
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

        <div style={{ display: "flex", gap: "10px" }}>
          <button className="secondary-btn small" onClick={toggleFullscreen}>
            Fullscreen
          </button>

          <button
            className="secondary-btn small"
            onClick={() => setView("dashboard")}
          >
            Back to dashboard
          </button>
        </div>
      </header>

      <div className="presentation-stage">
        <div>
          <section className="big-slide">
            {slide?.thumbnail_url ? (
              <img src={slide.thumbnail_url} alt={slide.filename} />
            ) : (
              <div className="slide-placeholder">
                <h1>{dashboard.lecture.title}</h1>
                <p>{dashboard.lecture.topic}</p>
              </div>
            )}
          </section>

          <div className="slide-controls">
            <button onClick={prevSlide}>← Previous</button>

            <span>
              Slide {slides.length === 0 ? 0 : currentSlide + 1} / {slides.length}
            </span>

            <button onClick={nextSlide}>Next →</button>
          </div>
        </div>

        <aside className="live-panel">
          <div className="live-card">
            <h3>Live Questions</h3>

            {dashboard.recent_questions.length === 0 ? (
              <p className="muted">No questions yet.</p>
            ) : (
              dashboard.recent_questions.map((q) => (
                <div key={q.id} className="question-item">
                  <strong>{q.user_name}</strong>
                  <p>{q.question}</p>
                </div>
              ))
            )}
          </div>

          <div className="live-card">
            <h3>AI Copilot</h3>
            <p className="ai-text">{dashboard.speaker_response}</p>
          </div>

          <div className="live-card">
            <h3>Audience QR</h3>

            <a
              href={dashboard.qrcode_url}
              target="_blank"
              rel="noreferrer"
              className="primary-btn"
            >
              Open Audience QR
            </a>
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