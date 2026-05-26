from sqlalchemy import Column, Integer, String, Text, ForeignKey
from app.database.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)


class Lecture(Base):
    __tablename__ = "lectures"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    title = Column(String)
    speaker_name = Column(String)
    description = Column(Text)
    topic = Column(String)


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    lecture_id = Column(Integer, ForeignKey("lectures.id"))
    user_name = Column(String)
    question = Column(Text)
    priority_score = Column(Integer, default=1)


class Slide(Base):
    __tablename__ = "slides"

    id = Column(Integer, primary_key=True, index=True)
    lecture_id = Column(Integer, ForeignKey("lectures.id"))

    filename = Column(String)
    filepath = Column(String)


class SlideChunk(Base):
    __tablename__ = "slide_chunks"

    id = Column(Integer, primary_key=True, index=True)
    slide_id = Column(Integer, ForeignKey("slides.id"))
    lecture_id = Column(Integer, ForeignKey("lectures.id"))

    content = Column(Text)