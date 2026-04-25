from fastapi import APIRouter, HTTPException, Depends, status
from models import Submission
from database import db
from typing import List
from auth_utils import get_current_user
from datetime import datetime
from bson import ObjectId
import logging

# --- SET UP LOGGING ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/submissions", response_model=Submission, status_code=201)
async def submit_code(
    submission: Submission, 
    current_user: dict = Depends(get_current_user)
):
    # UPDATED: Using slot_id (str) for logging
    logger.info(f"Incoming Submission: Student '{current_user['username']}' (ID: {current_user['id']}) for Slot: {submission.slot_id}")
    
    submission_dict = submission.model_dump()
    submission_dict["student_id"] = current_user["id"]
    submission_dict["username"] = current_user["username"]
    submission_dict["submitted_at"] = datetime.utcnow()
    
    # Ensure grading fields are initialized but empty
    submission_dict["individual_scores"] = {}
    submission_dict["average_score"] = 0.0
    submission_dict["feedback"] = ""
    
    # UPDATED: Filter changed from day_number to slot_id
    await db.submissions.update_one(
        {"slot_id": submission.slot_id, "student_id": current_user["id"]},
        {"$set": submission_dict},
        upsert=True
    )
    
    logger.info("Submission successfully saved to database.")
    return submission

# UPDATED: Path parameter day_number (int) changed to slot_id (str)
@router.put("/submissions/review/{slot_id}/{student_id}")
async def update_review(
    slot_id: str, 
    student_id: str, 
    data: dict, 
    current_user: dict = Depends(get_current_user)
):
    # UPDATED: Logging changed to use slot_id
    logger.info(f"Admin '{current_user['username']}' reviewing Student ID: {student_id} on Slot: {slot_id}")
    
    if "admin" not in current_user["roles"]:
        raise HTTPException(status_code=403, detail="Unauthorized Assessor Access")

    # Match frontend keys for scoring and feedback
    scores_dict = data.get("individual_scores", {})
    feedback_text = data.get("feedback", "") 
    
    logger.info(f"Scores received from frontend: {scores_dict}")
    
    # Math logic for average score calculation
    valid_values = []
    for k, v in scores_dict.items():
        try:
            val = float(v)
            valid_values.append(val)
        except (ValueError, TypeError):
            continue

    if valid_values:
        avg_score = sum(valid_values) / len(valid_values)
        avg_score = round(avg_score, 2)
    else:
        avg_score = 0.0

    update_payload = {
        "individual_scores": scores_dict,
        "feedback": feedback_text,
        "average_score": avg_score,
        "status": "reviewed",
        "reviewed_at": datetime.utcnow(),
        "reviewed_by": current_user["username"]
    }

    # UPDATED: Database filter changed to slot_id
    result = await db.submissions.update_one(
        {"slot_id": slot_id, "student_id": student_id},
        {"$set": update_payload}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Target submission not found.")
    
    logger.info(f"Review finalized. Average Score: {avg_score}")
    return {"message": "Evaluation finalized.", "average_score": avg_score}

@router.get("/submissions", response_model=List[dict])
async def get_submissions(
    admin_view: bool = False, 
    current_user: dict = Depends(get_current_user)
):
    is_admin = "admin" in current_user["roles"]

    if is_admin and admin_view:
        logger.info(f"Admin '{current_user['username']}' fetching global submission list.")
        cursor = db.submissions.find().sort("submitted_at", -1)
    else:
        logger.info(f"User '{current_user['username']}' fetching personal dashboard data.")
        # UPDATED: Sorting by submitted_at since slot_ids are non-sequential
        cursor = db.submissions.find({"student_id": current_user["id"]}).sort("submitted_at", -1)
    
    raw_submissions = await cursor.to_list(length=500)
    
    final_list = []
    for sub in raw_submissions:
        sub["_id"] = str(sub["_id"])
        if is_admin and admin_view:
            student = await db.users.find_one({"_id": ObjectId(sub["student_id"])})
            sub["student_name"] = student.get("username", "Unknown") if student else "Deleted"
        final_list.append(sub)
        
    return final_list

# UPDATED: Path parameter changed to slot_id (str)
@router.get("/submissions/review/{slot_id}/{student_id}")
async def get_specific_submission(
    slot_id: str, 
    student_id: str, 
    current_user: dict = Depends(get_current_user)
):
    if "admin" not in current_user["roles"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    # UPDATED: Database query changed to slot_id
    submission = await db.submissions.find_one({
        "slot_id": slot_id, 
        "student_id": student_id
    })
    
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found.")
        
    student = await db.users.find_one({"_id": ObjectId(student_id)})
    submission["student_name"] = student.get("username", "Unknown User") if student else "Deleted User"
    
    submission["_id"] = str(submission["_id"])
    return submission

# UPDATED: Path parameter changed to slot_id (str)
@router.get("/submissions/{slot_id}")
async def get_submission(slot_id: str, current_user: dict = Depends(get_current_user)):
    # UPDATED: Database query changed to slot_id
    submission = await db.submissions.find_one({
        "slot_id": slot_id, 
        "student_id": current_user["id"]
    })
    
    if submission:
        submission["_id"] = str(submission["_id"])
        return submission
    return None

# UPDATED: Path parameter changed to slot_id (str)
@router.delete("/submissions/{slot_id}")
async def discard_submission(slot_id: str, current_user: dict = Depends(get_current_user)):
    # UPDATED: Log changed to slot_id
    logger.info(f"User '{current_user['username']}' is discarding draft for Slot: {slot_id}")
    
    # UPDATED: Query changed to slot_id
    query = {
        "slot_id": slot_id, 
        "student_id": current_user["id"],
        "status": {"$in": ["started", "pending", "draft"]} 
    }
    
    result = await db.submissions.delete_one(query)
    
    if result.deleted_count == 0:
        logger.warning(f"Discard failed: No matching draft found for status 'started/pending' for user {current_user['username']}")
        return {"message": "No active draft found."}

    logger.info(f"Successfully deleted 'started' draft for Slot: {slot_id}")
    return {"message": "Draft discarded successfully."}