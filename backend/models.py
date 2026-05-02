from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Literal
from datetime import datetime, timezone

class User(BaseModel):
    username: str
    email: EmailStr
    password: str  
    roles: List[Literal["creator", "student"]] = Field(default_factory=lambda: ["student"])
    mentor_id: Optional[str] = None 
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    id: str
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
    time_limit: int
    solution_code: str
    samples: List[Dict]
    private_samples: List[Dict]

class DailyChallenge(BaseModel):
    slot_id: str 
    title: str = "Untitled Assessment" 
    status: str = "draft"  
    
    org_id: Optional[str] = None  
    org_name: Optional[str] = None  # CRITICAL: Added so FastAPI doesn't strip this field
    org_slug: Optional[str] = None
    
    requires_code: bool = False
    access_code: Optional[str] = None 
    
    questions: List[Question] 
    total_time: int 
    created_by: Optional[str] = None
    created_by_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_published_globally: bool = True
    
    class Config:
        from_attributes = True
    
class Submission(BaseModel):
    slot_id: str
    student_role: str = "student"
    answers: Dict[str, str]
    languages: Dict[str, str] = Field(default_factory=dict)

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
        
class SampleCase(BaseModel):
    input_data: str
    output_data: str
    explanation: Optional[str] = None

class ExecutionRequest(BaseModel):
    code: str
    language: str
    slot_id: Optional[str] = None
    question_index: Optional[int] = None
    samples: Optional[List[SampleCase]] = None
    private_samples: Optional[List[SampleCase]] = None
    time_limit: Optional[int] = 2
    
class Organization(BaseModel):
    name: str 
    slug: str 
    description: Optional[str] = None
    owner_id: str  
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True
    
    class Config:
        from_attributes = True
    
class OrganizationMember(BaseModel):
    org_id: str
    user_id: str
    invited_by: str  # Added to track who sent the invite
    role: Literal["creator"] = "creator"
    invited_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    joined_at: Optional[datetime] = None
    status: str = "pending" 
    
    class Config:
        from_attributes = True
        
class AccessAttempt(BaseModel):
    user_id: str
    slot_id: str
    attempts: int = 0
    last_attempt: datetime = Field(default_factory=datetime.utcnow)
    locked_until: Optional[datetime] = None
    
class PaginatedChallenges(BaseModel):
    challenges: List[DailyChallenge]
    total: int
    page: int
    has_more: bool
    
class OrgCreateRequest(BaseModel):
    name: str

class InviteRequest(BaseModel):
    recipient_email: str
    invite_type: str = "standard"  # Default if not provided
    personal_note: Optional[str] = None