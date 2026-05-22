import { useState } from "react";
import axios from "axios";

function CreateLecture() {

  const [formData, setFormData] = useState({
    title: "",
    speaker_name: "",
    description: "",
    topic: ""
  });

  const [message, setMessage] = useState("");

  async function handleSubmit(e) {

    e.preventDefault();

    try {

      const response = await axios.post(
        "http://127.0.0.1:8001/lectures",
        formData
      );

      setMessage(
        "Lecture created successfully!"
      );

      console.log(response.data);

    } catch (error) {

      console.error(error);

      setMessage(
        "Error creating lecture"
      );

    }

  }

  function handleChange(e) {

    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });

  }

  return (

    <div
      style={{
        minHeight: "100vh",
        background: "#020617",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "30px",
        fontFamily: "Inter, sans-serif"
      }}
    >

      <form
        onSubmit={handleSubmit}
        style={{
          background: "#111827",
          padding: "40px",
          borderRadius: "24px",
          width: "100%",
          maxWidth: "600px",
          color: "white",
          boxShadow:
            "0 20px 40px rgba(0,0,0,0.4)"
        }}
      >

        <h1
          style={{
            marginBottom: "30px"
          }}
        >
          Create Lecture
        </h1>

        <input
          type="text"
          name="title"
          placeholder="Lecture title"
          onChange={handleChange}
          required
          style={inputStyle}
        />

        <input
          type="text"
          name="speaker_name"
          placeholder="Speaker name"
          onChange={handleChange}
          required
          style={inputStyle}
        />

        <input
          type="text"
          name="topic"
          placeholder="Lecture topic"
          onChange={handleChange}
          required
          style={inputStyle}
        />

        <textarea
          name="description"
          placeholder="Lecture description"
          rows="5"
          onChange={handleChange}
          required
          style={textareaStyle}
        />

        <button
          type="submit"
          style={buttonStyle}
        >
          Create Lecture
        </button>

        {
          message && (
            <p
              style={{
                marginTop: "20px",
                color: "#22c55e"
              }}
            >
              {message}
            </p>
          )
        }

      </form>

    </div>

  );

}

const inputStyle = {
  width: "100%",
  padding: "14px",
  marginBottom: "18px",
  borderRadius: "12px",
  border: "none",
  background: "#1e293b",
  color: "white",
  fontSize: "16px"
};

const textareaStyle = {
  ...inputStyle
};

const buttonStyle = {
  width: "100%",
  padding: "16px",
  borderRadius: "14px",
  border: "none",
  background: "#22c55e",
  color: "#020617",
  fontSize: "18px",
  fontWeight: "bold",
  cursor: "pointer"
};

export default CreateLecture;