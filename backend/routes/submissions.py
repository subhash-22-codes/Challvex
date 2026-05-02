from fastapi import APIRouter, HTTPException, Depends
from models import Submission, ExecutionRequest
from database import db
from auth_utils import get_current_user
from .judge import run_code


from typing import List, Dict, Optional
from datetime import datetime, timezone, timedelta
from bson import ObjectId

import logging

logger = logging.getLogger(__name__)

router = APIRouter()

EDITABLE_STATUSES = {"started", "draft", "pending"}
FINAL_STATUS = "reviewed"


def ensure_creator(current_user: dict):
    if "creator" not in current_user.get("roles", []):
        raise HTTPException(status_code=403, detail="Unauthorized Access")

def clean_score(value):
    try:
        score = float(value)
        return max(0, min(100, score))
    except:
        return None

# -----------------------------------
# GATEKEEPER: VERIFY ACCESS CODE
# -----------------------------------
@router.post("/submissions/challenges/{slot_id}/verify-access")
async def verify_challenge_access(
    slot_id: str, 
    data: Dict[str, str], 
    current_user: dict = Depends(get_current_user)
):
    user_id = str(current_user["id"])
    provided_code = data.get("access_code")

    # 1. Fetch challenge
    challenge = await db.challenges.find_one({"slot_id": slot_id})
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    if not challenge.get("requires_code"):
        return {"status": "success", "message": "No code required."}

    # 2. Check cooldown/rate limit
    attempt_record = await db.access_attempts.find_one({"user_id": user_id, "slot_id": slot_id})
    
    if attempt_record and attempt_record.get("attempts", 0) >= 3:
        raise HTTPException(
            status_code=429, 
            detail="Too many failed attempts. Please wait 1 minute before trying again."
        )

    # 3. Check code
    if provided_code == challenge.get("access_code"):
        # success: clear old failed attempts
        await db.access_attempts.delete_one({"user_id": user_id, "slot_id": slot_id})
        
        # create the "ticket" (initial draft) so submit_code doesn't 403
        await db.submissions.update_one(
            {"slot_id": slot_id, "student_id": user_id},
            {
                "$setOnInsert": {
                    "slot_id": slot_id,
                    "student_id": user_id,
                    "username": current_user["username"],
                    "status": "draft",
                    "answers": {},
                    "languages": {},
                    "submitted_at": datetime.now(timezone.utc)
                }
            },
            upsert=True
        )
        return {"status": "success", "message": "Access granted."}
    
    # 4. Handle failure
    new_attempts = (attempt_record.get("attempts", 0) + 1) if attempt_record else 1
    expire_at = datetime.now(timezone.utc) + timedelta(minutes=1)
    
    await db.access_attempts.update_one(
        {"user_id": user_id, "slot_id": slot_id},
        {
            "$set": {
                "attempts": new_attempts,
                "last_attempt": datetime.now(timezone.utc),
                "expire_at": expire_at 
            }
        },
        upsert=True
    )

    remaining = 3 - new_attempts
    detail = f"Invalid code. {remaining} attempts remaining." if remaining > 0 else "Locked for 1 minute."
    raise HTTPException(status_code=403, detail=detail)
# -----------------------------------
# SUBMIT / SAVE CODE
# -----------------------------------
@router.post("/submissions", response_model=Submission, status_code=201)
async def submit_code(submission: Submission, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["id"])
    
    challenge = await db.challenges.find_one({"slot_id": submission.slot_id})
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge slot not found.")

    # 2. security: check for the ticket we created in verify-access
    existing = await db.submissions.find_one({
        "slot_id": submission.slot_id,
        "student_id": user_id
    })

    if challenge.get("requires_code") and not existing:
         raise HTTPException(
             status_code=403, 
             detail="Access code verification required before starting this challenge."
         )

    if existing and existing.get("status") == "reviewed":
        raise HTTPException(status_code=400, detail="Reviewed submission cannot be modified.")

    submission_dict = submission.model_dump()
    submission_dict["student_id"] = user_id
    submission_dict["username"] = current_user["username"]
    submission_dict["submitted_at"] = datetime.now(timezone.utc)

    if submission_dict["status"] not in ["draft", "pending"]:
        submission_dict["status"] = "pending"

    # auto evaluate logic
    if submission_dict["status"] == "pending":
        answers = submission_dict.get("answers", {})
        languages = submission_dict.get("languages", {})
        results_map = {}
        scores = {}
        total_score = 0.0
        checked = 0

        for q_key, code in answers.items():
            try:
                q_index = int(q_key)
                question = challenge["questions"][q_index]
                all_cases = question.get("samples", []) + question.get("private_samples", [])
                total_cases = len(all_cases)

                if total_cases == 0:
                    results_map[q_key] = {"passed": 0, "total": 0, "score": 0}
                    scores[q_key] = 0
                    continue

                judge_req = ExecutionRequest(
                    code=code,
                    language=languages.get(q_key, "python"),
                    slot_id=submission.slot_id,
                    question_index=q_index
                )

                judge_result = await run_code(judge_req, current_user)
                passed_cases = sum(1 for item in judge_result.get("test_results", []) if item.get("passed"))

                score = round((passed_cases / total_cases) * 10, 2)
                results_map[q_key] = {
                    "passed": passed_cases,
                    "total": total_cases,
                    "score": score,
                    "details": judge_result.get("test_results", [])
                }
                scores[q_key] = score
                total_score += score
                checked += 1

            except Exception as e:
                results_map[q_key] = {"passed": 0, "total": 0, "score": 0, "error": str(e)}
                scores[q_key] = 0
                checked += 1

        submission_dict["results"] = results_map
        submission_dict["individual_scores"] = scores
        submission_dict["average_score"] = round(total_score / checked, 2) if checked else 0.0
    else:
        submission_dict["results"] = existing.get("results", {}) if existing else {}
        submission_dict["individual_scores"] = existing.get("individual_scores", {}) if existing else {}
        submission_dict["average_score"] = existing.get("average_score", 0.0) if existing else 0.0

    await db.submissions.update_one(
        {"slot_id": submission.slot_id, "student_id": user_id},
        {"$set": submission_dict},
        upsert=True
    )

    return submission_dict


# -----------------------------------
# ADMIN REVIEW
# -----------------------------------
@router.put("/submissions/review/{slot_id}/{student_id}")
async def update_review(
    slot_id: str,
    student_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    ensure_creator(current_user)

    scores_dict = data.get(
        "individual_scores",
        {}
    )

    feedback_text = data.get(
        "feedback",
        ""
    )

    cleaned_scores = {}
    valid_values = []

    for key, value in scores_dict.items():
        score = clean_score(value)

        if score is not None:
            cleaned_scores[key] = score
            valid_values.append(score)

    avg_score = (
        round(sum(valid_values) / len(valid_values), 2)
        if valid_values else 0.0
    )

    result = await db.submissions.update_one(
        {
            "slot_id": slot_id,
            "student_id": student_id
        },
        {
            "$set": {
                "individual_scores": cleaned_scores,
                "feedback": feedback_text,
                "average_score": avg_score,
                "status": "reviewed",
                "reviewed_at": datetime.utcnow(),
                "reviewed_by": current_user["username"]
            }
        }
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Submission not found."
        )

    return {
        "message": "Evaluation finalized.",
        "average_score": avg_score
    }


# -----------------------------------
# GET SUBMISSIONS
# -----------------------------------
@router.get("/submissions", response_model=List[dict])
async def get_submissions(
    admin_view: bool = False,
    current_user: dict = Depends(get_current_user)
):
    is_creator = "creator" in current_user["roles"]
    user_id_str = str(current_user["id"])

    if is_creator and admin_view:
        owned_challenges_cursor = db.challenges.find({
            "$or": [
                {"created_by_id": user_id_str},
                {"created_by": current_user["username"]}
            ]
        }, {"slot_id": 1})
        
        owned_challenges = await owned_challenges_cursor.to_list(length=1000)
        allowed_slot_ids = [c["slot_id"] for c in owned_challenges]

        cursor = db.submissions.find({
            "slot_id": {"$in": allowed_slot_ids}
        }).sort("submitted_at", -1)
    else:
        cursor = db.submissions.find({
            "student_id": user_id_str
        }).sort("submitted_at", -1)

    raw_items = await cursor.to_list(length=500)
    final_list = []

    for item in raw_items:
        item["_id"] = str(item["_id"])

        if is_creator and admin_view:
            try:
                student = await db.users.find_one({
                    "_id": ObjectId(item["student_id"])
                })

                item["student_name"] = (
                    student.get("username")
                    if student else "Deleted"
                )

            except:
                item["student_name"] = "Unknown"

        final_list.append(item)

    return final_list


@router.get("/submissions/review/{slot_id}/{student_id}")
async def get_specific_submission(
    slot_id: str,
    student_id: str,
    current_user: dict = Depends(get_current_user)
):
    ensure_creator(current_user)
    user_id_str = str(current_user["id"])

    # UPDATE: Verify the current creator owns the challenge associated with this slot_id before proceeding
    challenge = await db.challenges.find_one({"slot_id": slot_id})
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge context not found.")

    is_owner = (challenge.get("created_by_id") == user_id_str or 
                challenge.get("created_by") == current_user["username"])

    if not is_owner:
        raise HTTPException(
            status_code=403, 
            detail="Access denied: You do not have permission to review this challenge."
        )

    submission = await db.submissions.find_one({
        "slot_id": slot_id,
        "student_id": student_id
    })

    if not submission:
        raise HTTPException(
            status_code=404,
            detail="Submission not found."
        )

    try:
        student = await db.users.find_one({
            "_id": ObjectId(student_id)
        })

        submission["student_name"] = (
            student.get("username")
            if student else "Deleted User"
        )

    except:
        submission["student_name"] = "Unknown User"

    submission["_id"] = str(submission["_id"])

    return submission


# -----------------------------------
# GET OWN SUBMISSION
# -----------------------------------
@router.get("/submissions/{slot_id}")
async def get_submission(
    slot_id: str,
    current_user: dict = Depends(get_current_user)
):
    submission = await db.submissions.find_one({
        "slot_id": slot_id,
        "student_id": str(current_user["id"])
    })

    if submission:
        submission["_id"] = str(submission["_id"])
        return submission

    return None


# -----------------------------------
# DELETE DRAFT
# -----------------------------------
@router.delete("/submissions/{slot_id}")
async def discard_submission(
    slot_id: str,
    current_user: dict = Depends(get_current_user)
):
    result = await db.submissions.delete_one({
        "slot_id": slot_id,
        "student_id": str(current_user["id"]),
        "status": {
            "$in": list(EDITABLE_STATUSES)
        }
    })

    if result.deleted_count == 0:
        return {
            "message": "No active draft found."
        }

    return {
        "message": "Draft discarded successfully."
    }