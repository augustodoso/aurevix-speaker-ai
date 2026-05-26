from pydantic import BaseModel


class UserCreate(BaseModel):
    name: str
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


class LectureCreate(BaseModel):
    title: str
    speaker_name: str
    description: str
    topic: str


class QuestionCreate(BaseModel):
    lecture_id: int
    user_name: str
    question: str