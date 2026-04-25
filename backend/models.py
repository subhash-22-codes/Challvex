from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict
from datetime import datetime

class User(BaseModel):
    username: str
    email: EmailStr
    password: str  
    roles: List[str] = ["student"] 
    mentor_id: Optional[str] = None 
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    roles: List[str]
    username: str

class SampleCase(BaseModel):
    input_data: str
    output_data: str
    explanation: Optional[str] = None

class Question(BaseModel):
    title: str
    difficulty: str 
    storyline: str
    input_format: str
    output_format: str
    constraints: str
    samples: List[SampleCase]    
    private_samples: List[SampleCase] = Field(default_factory=list) 
    time_limit: int = 2                
    memory_limit: int = 128 
    solution_code: str = ""           

class DailyChallenge(BaseModel):
    slot_id: str 
    title: str = "Untitled Assessment" 
    status: str = "draft"  
    
    questions: List[Question] 
    total_time: int 
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        from_attributes = True
    
class Submission(BaseModel):
    slot_id: str
    student_role: str = "student" 
    answers: Dict[str, str] 
    student_id: Optional[str] = None                                  
    username: Optional[str] = None
    status: str = "pending"     
    start_time: Optional[datetime] = None  
    submitted_at: datetime = Field(default_factory=datetime.utcnow)
    results: Dict[str, dict] = Field(default_factory=dict)
    feedback: Optional[str] = "" 
    individual_scores: Dict[str, float] = Field(default_factory=dict)
    average_score: float = 0.0

    class Config:
        from_attributes = True
        
