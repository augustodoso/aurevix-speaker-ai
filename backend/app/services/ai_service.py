from openai import OpenAI
from dotenv import load_dotenv
import os

load_dotenv()

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)

OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")


def ask_openai(prompt: str):

    try:
        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are Aurevix Speaker AI, an assistant for live "
                        "lectures, presentations, conferences and audience Q&A. "
                        "Be clear, useful, concise and practical."
                    )
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.4
        )

        return response.choices[0].message.content

    except Exception as error:
        return f"AI service unavailable. Error: {str(error)}"


def analyze_questions(questions):

    questions_text = "\n".join(
        [f"- {q['question']}" for q in questions]
    )

    prompt = f"""
Analyze the audience questions below.

Return:
1. Main topic
2. Most repeated concern
3. What the speaker should answer first
4. Suggested short answer

Audience questions:
{questions_text}
    """

    return ask_openai(prompt)


def generate_speaker_response(question: str):

    prompt = f"""
A speaker is presenting live and received this audience question:

"{question}"

Generate a clear, confident and practical answer suggestion for the speaker.

Return:
- Short direct answer
- One practical example
- How to transition back to the presentation
    """

    return ask_openai(prompt)


def extract_main_theme(questions):

    all_questions = " ".join(
        [q["question"] for q in questions]
    ).lower()

    themes = {
        "Artificial Intelligence": [
            "ai",
            "artificial intelligence",
            "machine learning",
            "automation",
            "openai",
            "chatgpt"
        ],
        "Healthcare": [
            "hospital",
            "doctor",
            "healthcare",
            "medicine",
            "patient",
            "clinic"
        ],
        "Technology": [
            "technology",
            "software",
            "system",
            "platform",
            "api",
            "backend"
        ],
        "Business": [
            "business",
            "strategy",
            "market",
            "sales",
            "customer",
            "company"
        ]
    }

    scores = {}

    for theme, keywords in themes.items():
        scores[theme] = 0

        for keyword in keywords:
            scores[theme] += all_questions.count(keyword)

    best_theme = max(scores, key=scores.get)

    if scores[best_theme] == 0:
        return "General Audience Interest"

    return best_theme


def calculate_priority_score(question: str):

    question = question.lower()
    score = 1

    important_keywords = [
        "how",
        "why",
        "future",
        "impact",
        "risk",
        "problem",
        "solution",
        "strategy",
        "improve",
        "example",
        "cost",
        "security",
        "data",
        "ai",
        "technology"
    ]

    for keyword in important_keywords:
        if keyword in question:
            score += 2

    if len(question) > 100:
        score += 1

    return min(score, 10)


def summarize_slide_content(text: str):

    if not text:
        return "No readable text found in this slide file."

    prompt = f"""
Summarize the slide or presentation content below for a live speaker.

Return:
1. Main idea
2. Key points
3. Suggested speaker focus
4. Possible audience questions

Content:
{text[:6000]}
    """

    return ask_openai(prompt)


def match_question_to_slide(question: str, slides: list):

    if not slides:
        return {
            "matched_slide": None,
            "reason": "No slides available for this lecture."
        }

    question_lower = question.lower()

    best_slide = None
    best_score = 0

    for slide in slides:
        filename = slide["filename"].lower()
        score = 0

        for word in question_lower.split():
            if word in filename:
                score += 1

        if score > best_score:
            best_score = score
            best_slide = slide

    if not best_slide:
        best_slide = slides[0]

    return {
        "matched_slide": best_slide,
        "reason": "This slide appears to be the closest match based on the question and uploaded slide filename."
    }


def generate_slide_based_response(question: str, slide_text: str):

    if not slide_text:
        return """
No readable slide content was found.

Suggested response:
Answer based on your own explanation and invite the audience to clarify the question.
        """

    prompt = f"""
A speaker received this audience question:

"{question}"

Use the slide content below to generate a contextual answer.

Slide content:
{slide_text[:6000]}

Return:
1. Direct answer
2. Explanation based on the slide
3. Practical example
4. Smooth transition back to the presentation
    """

    return ask_openai(prompt)

def build_lecture_context(
    lecture_title: str,
    lecture_topic: str,
    slide_texts: list,
    previous_questions: list
):

    slides_content = "\n\n".join(slide_texts)

    questions_content = "\n".join(
        [f"- {q}" for q in previous_questions]
    )

    context = f"""
Lecture title:
{lecture_title}

Lecture topic:
{lecture_topic}

Slides content:
{slides_content[:8000]}

Previous audience questions:
{questions_content[:3000]}
    """

    return context

def generate_contextual_answer(
    question: str,
    lecture_context: str
):

    prompt = f"""
You are Aurevix Speaker AI.

Use the full lecture context below to answer
the audience question intelligently.

Lecture context:
{lecture_context}

Audience question:
{question}

Return:
1. Direct answer
2. Contextual explanation
3. Practical example
4. Suggested transition back to the presentation
    """

    return ask_openai(prompt)

def generate_ai_presentation(topic: str):

    if not topic:
        return []

    prompt = f"""
You are Aurevix Speaker AI.

Create a professional presentation about:

"{topic}"

Return ONLY valid JSON.

Format exactly like this:

[
  {{
    "title": "Slide title",
    "content": [
      "bullet point",
      "bullet point",
      "bullet point"
    ],
    "speaker_notes": "Short speaker notes"
  }}
]

Rules:
- Create exactly 6 slides.
- Each slide must have 3 to 5 bullet points.
- Speaker notes must be practical and presentation-ready.
- Do not return markdown.
- Do not return explanations.
- Do not wrap the JSON in code blocks.
- Return only valid JSON.
    """

    response = ask_openai(prompt)

    try:
        import json
        return json.loads(response)
    except Exception:
        return []