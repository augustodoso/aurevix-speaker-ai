from pydantic import BaseModel


class LectureCreate(BaseModel):
    title: str
    speaker_name: str
    description: str
    topic: str  

class QuestionCreate(BaseModel):
    lecture_id: int
    user_name: str
    question: str