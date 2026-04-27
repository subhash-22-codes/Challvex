from fastapi import APIRouter, HTTPException, Depends
from models import Submission, ExecutionRequest
from database import db
from auth_utils import get_current_user
from .judge import run_code


from typing import List
from datetime import datetime
from bson import ObjectId

import logging

logger = logging.getLogger(__name__)

router = APIRouter()

EDITABLE_STATUSES = {"started", "draft", "pending"}
FINAL_STATUS = "reviewed"


# -----------------------------------
# HELPERS
# -----------------------------------
def ensure_admin(current_user: dict):
    if "admin" not in current_user["roles"]:
        raise HTTPException(
            status_code=403,
            detail="Unauthorized Access"
        )


def clean_score(value):
    try:
        score = float(value)
        if score < 0:
            score = 0
        if score > 100:
            score = 100
        return score
    except:
        return None


# -----------------------------------
# SUBMIT / SAVE CODE
# -----------------------------------
@router.post("/submissions", response_model=Submission, status_code=201)
async def submit_code(submission: Submission, current_user: dict = Depends(get_current_user)):
    logger.info(f"Submission from '{current_user['username']}' for slot '{submission.slot_id}'")

    challenge = await db.challenges.find_one({"slot_id": submission.slot_id})
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge slot not found.")

    existing = await db.submissions.find_one({
        "slot_id": submission.slot_id,
        "student_id": current_user["id"]
    })

    if existing and existing.get("status") == FINAL_STATUS:
        raise HTTPException(status_code=400, detail="Reviewed submission cannot be modified.")

    submission_dict = submission.model_dump()
    submission_dict["student_id"] = current_user["id"]
    submission_dict["username"] = current_user["username"]
    submission_dict["submitted_at"] = datetime.utcnow()
    submission_dict["feedback"] = ""

    if submission_dict["status"] not in EDITABLE_STATUSES:
        submission_dict["status"] = "pending"

    # -------------------------------------------------
    # FINAL SUBMIT: auto evaluate answers on pending
    # -------------------------------------------------
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

                public_cases = question.get("samples", [])
                private_cases = question.get("private_samples", [])
                all_cases = public_cases + private_cases
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

                passed_cases = 0
                if judge_result.get("status") == "SUCCESS":
                    for item in judge_result.get("test_results", []):
                        if item.get("passed"):
                            passed_cases += 1

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
                results_map[q_key] = {
                    "passed": 0,
                    "total": 0,
                    "score": 0,
                    "error": str(e)
                }
                scores[q_key] = 0
                checked += 1

        submission_dict["results"] = results_map
        submission_dict["individual_scores"] = scores
        submission_dict["average_score"] = round(total_score / checked, 2) if checked else 0.0

    else:
        submission_dict["results"] = {}
        submission_dict["individual_scores"] = {}
        submission_dict["average_score"] = 0.0

    await db.submissions.update_one(
        {"slot_id": submission.slot_id, "student_id": current_user["id"]},
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
    ensure_admin(current_user)

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
    is_admin = "admin" in current_user["roles"]

    if is_admin and admin_view:
        cursor = db.submissions.find().sort(
            "submitted_at",
            -1
        )
    else:
        cursor = db.submissions.find({
            "student_id": current_user["id"]
        }).sort(
            "submitted_at",
            -1
        )

    raw_items = await cursor.to_list(length=500)

    final_list = []

    for item in raw_items:
        item["_id"] = str(item["_id"])

        if is_admin and admin_view:
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


# -----------------------------------
# GET SPECIFIC FOR REVIEW
# -----------------------------------
@router.get("/submissions/review/{slot_id}/{student_id}")
async def get_specific_submission(
    slot_id: str,
    student_id: str,
    current_user: dict = Depends(get_current_user)
):
    ensure_admin(current_user)

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
        "student_id": current_user["id"]
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
        "student_id": current_user["id"],
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