from fastapi import FastAPI, HTTPException, Form, WebSocket, UploadFile, File, Depends
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database.database import engine, SessionLocal, Base
from app.database.models import Lecture, Question, Slide, SlideChunk, User
from app.schemas import LectureCreate, QuestionCreate, UserCreate, UserLogin
from app.auth import hash_password, verify_password, create_access_token, get_current_user

from app.services.ai_service import (
    analyze_questions,
    generate_speaker_response,
    extract_main_theme,
    calculate_priority_score,
    summarize_slide_content,
    match_question_to_slide,
    generate_slide_based_response,
    build_lecture_context,
    generate_contextual_answer,
)

from app.services.slide_service import extract_pdf_text
from app.services.rag_service import split_text_into_chunks, find_relevant_chunks
from app.services.thumbnail_service import generate_pdf_thumbnail

import qrcode
import os


app = FastAPI(
    title="Aurevix Speaker AI",
    version="1.0.0",
    description="AI assistant for live talks, audience questions, and speaker support.",
)

Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://aurevix-speaker-ai.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("storage", exist_ok=True)
os.makedirs("storage/slides", exist_ok=True)
os.makedirs("storage/qrcodes", exist_ok=True)
os.makedirs("storage/thumbnails", exist_ok=True)

app.mount(
    "/storage",
    StaticFiles(directory="storage"),
    name="storage",
)

active_connections = []


async def broadcast_message(message: dict):
    disconnected = []

    for connection in active_connections:
        try:
            await connection.send_json(message)
        except Exception:
            disconnected.append(connection)

    for connection in disconnected:
        if connection in active_connections:
            active_connections.remove(connection)


def get_thumbnail_path(slide_id: int):
    return f"storage/thumbnails/slide_{slide_id}.png"


def get_thumbnail_url(slide_id: int):
    path = get_thumbnail_path(slide_id)

    if os.path.exists(path):
        return f"https://aurevix-speaker-ai.onrender.com/{path}"

    return None


def get_user_lecture_or_404(db, lecture_id: int, current_user: User):
    lecture = db.query(Lecture).filter(
        Lecture.id == lecture_id,
        Lecture.owner_id == current_user.id,
    ).first()

    if not lecture:
        raise HTTPException(
            status_code=404,
            detail="Lecture not found",
        )

    return lecture


@app.get("/")
def home():
    return {
        "message": "Aurevix Speaker AI is running",
        "version": "1.0.0",
    }


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/auth/register")
def register_user(data: UserCreate):
    db = SessionLocal()

    existing_user = db.query(User).filter(User.email == data.email).first()

    if existing_user:
        db.close()
        raise HTTPException(
            status_code=400,
            detail="Email already registered",
        )

    user = User(
        name=data.name,
        email=data.email,
        hashed_password=hash_password(data.password),
    )

    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()

    return {
        "message": "User created successfully",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
        },
    }


@app.post("/auth/login")
def login_user(data: UserLogin):
    db = SessionLocal()

    user = db.query(User).filter(User.email == data.email).first()

    if not user:
        db.close()
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    password_is_valid = verify_password(data.password, user.hashed_password)

    if not password_is_valid:
        db.close()
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    token = create_access_token(
        {
            "sub": str(user.id),
            "email": user.email,
        }
    )

    db.close()

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
        },
    }

@app.get("/auth/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
    }

@app.post("/lectures")
def create_lecture(
    data: LectureCreate,
    current_user: User = Depends(get_current_user),
):
    db = SessionLocal()

    lecture = Lecture(
        owner_id=current_user.id,
        title=data.title,
        speaker_name=data.speaker_name,
        description=data.description,
        topic=data.topic,
    )

    db.add(lecture)
    db.commit()
    db.refresh(lecture)

    result = {
        "message": "Lecture created successfully",
        "lecture": {
            "id": lecture.id,
            "owner_id": lecture.owner_id,
            "title": lecture.title,
            "speaker_name": lecture.speaker_name,
            "description": lecture.description,
            "topic": lecture.topic,
        },
    }

    db.close()
    return result


@app.get("/lectures")
def get_lectures(
    current_user: User = Depends(get_current_user),
):
    db = SessionLocal()

    lectures = db.query(Lecture).filter(
        Lecture.owner_id == current_user.id
    ).all()

    result = [
        {
            "id": lecture.id,
            "owner_id": lecture.owner_id,
            "title": lecture.title,
            "speaker_name": lecture.speaker_name,
            "description": lecture.description,
            "topic": lecture.topic,
        }
        for lecture in lectures
    ]

    db.close()
    return result


@app.post("/questions")
def create_question(data: QuestionCreate):
    db = SessionLocal()

    lecture = db.query(Lecture).filter(Lecture.id == data.lecture_id).first()

    if not lecture:
        db.close()
        raise HTTPException(status_code=404, detail="Lecture not found")

    priority_score = calculate_priority_score(data.question)

    question = Question(
        lecture_id=data.lecture_id,
        user_name=data.user_name,
        question=data.question,
        priority_score=priority_score,
    )

    db.add(question)
    db.commit()
    db.refresh(question)

    result = {
        "message": "Question received successfully",
        "question": {
            "id": question.id,
            "lecture_id": question.lecture_id,
            "user_name": question.user_name,
            "question": question.question,
            "priority_score": question.priority_score,
        },
    }

    db.close()
    return result


@app.get("/questions/{lecture_id}")
def get_questions(
    lecture_id: int,
    current_user: User = Depends(get_current_user),
):
    db = SessionLocal()

    get_user_lecture_or_404(db, lecture_id, current_user)

    questions = db.query(Question).filter(
        Question.lecture_id == lecture_id
    ).all()

    result = {
        "lecture_id": lecture_id,
        "questions": [
            {
                "id": question.id,
                "lecture_id": question.lecture_id,
                "user_name": question.user_name,
                "question": question.question,
                "priority_score": question.priority_score,
            }
            for question in questions
        ],
    }

    db.close()
    return result


@app.get("/ai-analysis/{lecture_id}")
def ai_analysis(
    lecture_id: int,
    current_user: User = Depends(get_current_user),
):
    db = SessionLocal()

    get_user_lecture_or_404(db, lecture_id, current_user)

    lecture_questions = db.query(Question).filter(
        Question.lecture_id == lecture_id
    ).all()

    db.close()

    if not lecture_questions:
        raise HTTPException(status_code=404, detail="No questions found")

    formatted_questions = [{"question": q.question} for q in lecture_questions]

    analysis = analyze_questions(formatted_questions)

    return {
        "lecture_id": lecture_id,
        "analysis": analysis,
    }


@app.get("/lectures/{lecture_id}/qrcode")
def generate_lecture_qrcode(lecture_id: int):
    db = SessionLocal()

    lecture = db.query(Lecture).filter(Lecture.id == lecture_id).first()

    db.close()

    if not lecture:
        raise HTTPException(status_code=404, detail="Lecture not found")

    public_url = f"https://aurevix-speaker-ai.onrender.com/audience/{lecture_id}"
    qr_image = qrcode.make(public_url)

    file_path = f"storage/qrcodes/lecture_{lecture_id}.png"
    qr_image.save(file_path)

    return FileResponse(
        file_path,
        media_type="image/png",
        filename=f"lecture_{lecture_id}_qrcode.png",
    )


@app.get("/audience/{lecture_id}", response_class=HTMLResponse)
def audience_page(lecture_id: int):
    db = SessionLocal()

    lecture = db.query(Lecture).filter(Lecture.id == lecture_id).first()

    db.close()

    if not lecture:
        raise HTTPException(status_code=404, detail="Lecture not found")

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Aurevix Speaker AI</title>
        <style>
            body {{
                font-family: Arial, sans-serif;
                background: #0f172a;
                color: white;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
            }}

            .card {{
                background: #111827;
                padding: 32px;
                border-radius: 16px;
                width: 100%;
                max-width: 480px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.3);
            }}

            input, textarea {{
                width: 100%;
                padding: 12px;
                margin-top: 10px;
                margin-bottom: 16px;
                border-radius: 8px;
                border: none;
            }}

            button {{
                width: 100%;
                padding: 14px;
                background: #22c55e;
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 16px;
                cursor: pointer;
            }}

            p {{
                color: #cbd5e1;
            }}
        </style>
    </head>

    <body>
        <div class="card">
            <h1>{lecture.title}</h1>
            <p>Palestrante: {lecture.speaker_name}</p>
            <p>Tema: {lecture.topic}</p>

            <form action="/audience/{lecture_id}/submit" method="post">
                <input name="user_name" placeholder="Seu nome" required />

                <textarea
                    name="question"
                    placeholder="Digite sua pergunta..."
                    rows="5"
                    required
                ></textarea>

                <button type="submit">
                    Enviar pergunta
                </button>
            </form>
        </div>
    </body>
    </html>
    """


@app.post("/audience/{lecture_id}/submit", response_class=HTMLResponse)
async def submit_audience_question(
    lecture_id: int,
    user_name: str = Form(...),
    question: str = Form(...),
):
    db = SessionLocal()

    lecture = db.query(Lecture).filter(Lecture.id == lecture_id).first()

    if not lecture:
        db.close()
        raise HTTPException(status_code=404, detail="Lecture not found")

    priority_score = calculate_priority_score(question)

    new_question = Question(
        lecture_id=lecture_id,
        user_name=user_name,
        question=question,
        priority_score=priority_score,
    )

    db.add(new_question)
    db.commit()
    db.refresh(new_question)
    db.close()

    await broadcast_message({"type": "new_question"})

    return """
    <html>
        <body
            style="
                font-family: Arial;
                background:#0f172a;
                color:white;
                text-align:center;
                padding-top:100px;
            "
        >
            <h1>Pergunta enviada com sucesso ✅</h1>
            <p>Obrigado por participar.</p>

            <a
                href="javascript:history.back()"
                style="color:#22c55e;"
            >
                Enviar outra pergunta
            </a>
        </body>
    </html>
    """


@app.get("/dashboard/{lecture_id}/data")
def dashboard_data(
    lecture_id: int,
    current_user: User = Depends(get_current_user),
):
    db = SessionLocal()

    lecture = get_user_lecture_or_404(db, lecture_id, current_user)

    lecture_questions = (
        db.query(Question)
        .filter(Question.lecture_id == lecture_id)
        .order_by(Question.id.asc())
        .all()
    )

    analysis = "No analysis available"
    speaker_response = "No suggestions available"
    main_theme = "No main theme identified"

    formatted_questions = [
        {
            "id": q.id,
            "user_name": q.user_name,
            "question": q.question,
            "priority_score": q.priority_score,
        }
        for q in lecture_questions
    ]

    priority_questions = sorted(
        formatted_questions,
        key=lambda q: q["priority_score"],
        reverse=True,
    )[:5]

    if formatted_questions:
        analysis = analyze_questions(formatted_questions)
        latest_question = formatted_questions[-1]
        speaker_response = generate_speaker_response(latest_question["question"])
        main_theme = extract_main_theme(formatted_questions)

    result = {
        "lecture": {
            "id": lecture.id,
            "owner_id": lecture.owner_id,
            "title": lecture.title,
            "speaker_name": lecture.speaker_name,
            "description": lecture.description,
            "topic": lecture.topic,
        },
        "total_questions": len(formatted_questions),
        "recent_questions": formatted_questions[-5:],
        "priority_questions": priority_questions,
        "ai_analysis": analysis,
        "speaker_response": speaker_response,
        "main_theme": main_theme,
        "audience_url": f"https://aurevix-speaker-ai.onrender.com/audience/{lecture_id}",
        "qrcode_url": f"https://aurevix-speaker-ai.onrender.com/lectures/{lecture_id}/qrcode",
    }

    db.close()
    return result


@app.post("/lectures/{lecture_id}/upload-slide")
async def upload_slide(
    lecture_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    db = SessionLocal()

    get_user_lecture_or_404(db, lecture_id, current_user)

    safe_filename = file.filename.replace(" ", "_")
    file_path = f"storage/slides/{safe_filename}"

    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())

    slide = Slide(
        lecture_id=lecture_id,
        filename=safe_filename,
        filepath=file_path,
    )

    db.add(slide)
    db.commit()
    db.refresh(slide)

    thumbnail_url = None

    if safe_filename.lower().endswith(".pdf"):
        thumbnail_path = get_thumbnail_path(slide.id)

        generate_pdf_thumbnail(
            pdf_path=file_path,
            output_path=thumbnail_path,
        )

        thumbnail_url = get_thumbnail_url(slide.id)

        pdf_text = extract_pdf_text(file_path)
        chunks = split_text_into_chunks(pdf_text)

        for chunk in chunks:
            slide_chunk = SlideChunk(
                slide_id=slide.id,
                lecture_id=lecture_id,
                content=chunk,
            )

            db.add(slide_chunk)

        db.commit()

    result = {
        "message": "Slide uploaded successfully",
        "slide": {
            "id": slide.id,
            "filename": slide.filename,
            "filepath": slide.filepath,
            "thumbnail_url": thumbnail_url,
        },
    }

    db.close()
    return result


@app.get("/lectures/{lecture_id}/slides")
def get_slides(
    lecture_id: int,
    current_user: User = Depends(get_current_user),
):
    db = SessionLocal()

    get_user_lecture_or_404(db, lecture_id, current_user)

    slides = db.query(Slide).filter(Slide.lecture_id == lecture_id).all()

    result = [
        {
            "id": slide.id,
            "filename": slide.filename,
            "filepath": slide.filepath,
            "thumbnail_url": get_thumbnail_url(slide.id),
        }
        for slide in slides
    ]

    db.close()
    return result


@app.get("/slides/{slide_id}/summary")
def summarize_slide(
    slide_id: int,
    current_user: User = Depends(get_current_user),
):
    db = SessionLocal()

    slide = db.query(Slide).filter(Slide.id == slide_id).first()

    if not slide:
        db.close()
        raise HTTPException(status_code=404, detail="Slide not found")

    get_user_lecture_or_404(db, slide.lecture_id, current_user)

    db.close()

    if not slide.filename.lower().endswith(".pdf"):
        return {
            "slide_id": slide.id,
            "filename": slide.filename,
            "summary": "Summary is currently available only for PDF files.",
        }

    text = extract_pdf_text(slide.filepath)
    summary = summarize_slide_content(text)

    return {
        "slide_id": slide.id,
        "filename": slide.filename,
        "summary": summary,
    }


@app.get("/slides/{slide_id}/chunks")
def get_slide_chunks(
    slide_id: int,
    current_user: User = Depends(get_current_user),
):
    db = SessionLocal()

    slide = db.query(Slide).filter(Slide.id == slide_id).first()

    if not slide:
        db.close()
        raise HTTPException(status_code=404, detail="Slide not found")

    get_user_lecture_or_404(db, slide.lecture_id, current_user)

    chunks = db.query(SlideChunk).filter(SlideChunk.slide_id == slide_id).all()

    result = [
        {
            "id": chunk.id,
            "slide_id": chunk.slide_id,
            "lecture_id": chunk.lecture_id,
            "content": chunk.content,
        }
        for chunk in chunks
    ]

    db.close()
    return result


@app.post("/lectures/{lecture_id}/match-question")
def match_question_with_slide(
    lecture_id: int,
    question: str = Form(...),
    current_user: User = Depends(get_current_user),
):
    db = SessionLocal()

    get_user_lecture_or_404(db, lecture_id, current_user)

    slides = db.query(Slide).filter(Slide.lecture_id == lecture_id).all()

    formatted_slides = [
        {
            "id": slide.id,
            "filename": slide.filename,
            "filepath": slide.filepath,
            "thumbnail_url": get_thumbnail_url(slide.id),
        }
        for slide in slides
    ]

    db.close()

    match_result = match_question_to_slide(
        question,
        formatted_slides,
    )

    return {
        "lecture_id": lecture_id,
        "question": question,
        "match": match_result,
    }


@app.post("/lectures/{lecture_id}/slide-based-answer")
def slide_based_answer(
    lecture_id: int,
    question: str = Form(...),
    slide_id: int = Form(...),
    current_user: User = Depends(get_current_user),
):
    db = SessionLocal()

    get_user_lecture_or_404(db, lecture_id, current_user)

    slide = (
        db.query(Slide)
        .filter(
            Slide.id == slide_id,
            Slide.lecture_id == lecture_id,
        )
        .first()
    )

    db.close()

    if not slide:
        raise HTTPException(
            status_code=404,
            detail="Slide not found for this lecture",
        )

    if not slide.filename.lower().endswith(".pdf"):
        return {
            "lecture_id": lecture_id,
            "slide_id": slide_id,
            "question": question,
            "answer": "Slide-based answers are currently available only for PDF files.",
        }

    slide_text = extract_pdf_text(slide.filepath)

    answer = generate_slide_based_response(
        question,
        slide_text,
    )

    return {
        "lecture_id": lecture_id,
        "slide_id": slide_id,
        "filename": slide.filename,
        "question": question,
        "answer": answer,
    }


@app.post("/lectures/{lecture_id}/contextual-answer")
def contextual_answer(
    lecture_id: int,
    question: str = Form(...),
    current_user: User = Depends(get_current_user),
):
    db = SessionLocal()

    lecture = get_user_lecture_or_404(db, lecture_id, current_user)

    slides = db.query(Slide).filter(Slide.lecture_id == lecture_id).all()
    questions = db.query(Question).filter(Question.lecture_id == lecture_id).all()

    db.close()

    slide_texts = []

    for slide in slides:
        if slide.filename.lower().endswith(".pdf"):
            slide_texts.append(extract_pdf_text(slide.filepath))

    previous_questions = [q.question for q in questions]

    lecture_context = build_lecture_context(
        lecture_title=lecture.title,
        lecture_topic=lecture.topic,
        slide_texts=slide_texts,
        previous_questions=previous_questions,
    )

    answer = generate_contextual_answer(
        question=question,
        lecture_context=lecture_context,
    )

    return {
        "lecture_id": lecture_id,
        "question": question,
        "answer": answer,
    }


@app.post("/lectures/{lecture_id}/rag-answer")
def rag_answer(
    lecture_id: int,
    question: str = Form(...),
    current_user: User = Depends(get_current_user),
):
    db = SessionLocal()

    get_user_lecture_or_404(db, lecture_id, current_user)

    chunks = db.query(SlideChunk).filter(SlideChunk.lecture_id == lecture_id).all()

    db.close()

    chunk_contents = [chunk.content for chunk in chunks]

    relevant_chunks = find_relevant_chunks(
        question=question,
        chunks=chunk_contents,
        limit=3,
    )

    if not relevant_chunks:
        return {
            "lecture_id": lecture_id,
            "question": question,
            "answer": "No relevant slide content found for this question.",
            "relevant_chunks": [],
        }

    context = "\n\n".join(relevant_chunks)

    answer = generate_slide_based_response(
        question=question,
        slide_text=context,
    )

    return {
        "lecture_id": lecture_id,
        "question": question,
        "answer": answer,
        "relevant_chunks": relevant_chunks,
    }


@app.get("/static/logo")
def get_logo():
    return FileResponse("storage/aurevix-logo.png")


@app.delete("/lectures/{lecture_id}")
def delete_lecture(
    lecture_id: int,
    current_user: User = Depends(get_current_user),
):
    db = SessionLocal()

    lecture = get_user_lecture_or_404(db, lecture_id, current_user)

    db.query(SlideChunk).filter(SlideChunk.lecture_id == lecture_id).delete()
    db.query(Slide).filter(Slide.lecture_id == lecture_id).delete()
    db.query(Question).filter(Question.lecture_id == lecture_id).delete()

    db.delete(lecture)
    db.commit()
    db.close()

    return {
        "message": "Lecture deleted successfully",
        "lecture_id": lecture_id,
    }


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    active_connections.append(websocket)

    try:
        while True:
            await websocket.receive_text()

    except Exception:
        if websocket in active_connections:
            active_connections.remove(websocket)