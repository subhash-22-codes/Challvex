import os
import uuid
import sys
import shutil
import signal
import asyncio
import logging
import tempfile
import subprocess

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional

from database import db
from auth_utils import get_current_user
from models import SampleCase, ExecutionRequest


router = APIRouter()
logger = logging.getLogger(__name__)

# -----------------------------------
# LIMITS
# -----------------------------------
MAX_OUTPUT_SIZE = 100 * 1024
MAX_CODE_SIZE = 30000
MAX_CONCURRENT_JUDGES = 3

semaphore = asyncio.Semaphore(
    MAX_CONCURRENT_JUDGES
)

ALLOWED_LANGUAGES = {"python", "java"}

FORBIDDEN_KEYWORDS = [
    "os.system",
    "subprocess.",
    "eval(",
    "exec(",
    "ProcessBuilder",
    "Runtime.getRuntime",
    "java.io.File",
    "java.nio"
]


# -----------------------------------
# HELPERS
# -----------------------------------
def normalize_text(text: str):
    if not text:
        return ""

    return text.strip().replace(
        "\r\n",
        "\n"
    )[:10000]


def compare_outputs(actual: str, expected: str):
    if actual is None or expected is None:
        return False

    return actual.split() == expected.split()


def contains_forbidden_code(code: str):
    lowered = code.lower()

    for word in FORBIDDEN_KEYWORDS:
        if word.lower() in lowered:
            return True

    return False


async def run_safe_process(
    cmd,
    work_dir,
    input_data,
    timeout_seconds
):
    if not input_data.endswith("\n"):
        input_data += "\n"

    proc = None

    try:
        proc = subprocess.Popen(
            cmd,
            cwd=work_dir,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            preexec_fn=os.setsid
        )

        stdout, stderr = await asyncio.wait_for(
            asyncio.to_thread(
                proc.communicate,
                input=input_data
            ),
            timeout=timeout_seconds
        )

        if len(stdout) > MAX_OUTPUT_SIZE:
            stdout = (
                stdout[:MAX_OUTPUT_SIZE]
                + "\n[Output Truncated]"
            )

        return proc.returncode, stdout, stderr

    except asyncio.TimeoutError:
        if proc:
            try:
                os.killpg(
                    os.getpgid(proc.pid),
                    signal.SIGKILL
                )
            except:
                pass

        return "TIMEOUT", "", "Time Limit Exceeded"

    except Exception as e:
        return "ERROR", "", str(e)


# -----------------------------------
# ROUTE
# -----------------------------------
@router.post("/judge")
async def run_code(
    req: ExecutionRequest,
    current_user: dict = Depends(get_current_user)
):
    if req.language not in ALLOWED_LANGUAGES:
        raise HTTPException(
            status_code=400,
            detail="Unsupported language."
        )

    if len(req.code) > MAX_CODE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="Code too large."
        )

    if contains_forbidden_code(req.code):
        return {
            "status": "SECURITY_ERROR",
            "message": "Prohibited operations detected."
        }

    all_samples = []
    num_public = 0
    current_time_limit = req.time_limit or 2

    # ----------------------------
    # MANUAL SAMPLES
    # ----------------------------
    if req.samples is not None:
        all_samples = req.samples + (
            req.private_samples or []
        )

        num_public = len(req.samples)

    # ----------------------------
    # CHALLENGE SAMPLES
    # ----------------------------
    elif req.slot_id is not None:
        challenge = await db.challenges.find_one({
            "slot_id": req.slot_id
        })

        if not challenge:
            raise HTTPException(
                status_code=404,
                detail="Challenge not found"
            )

        try:
            question = challenge["questions"][
                req.question_index
            ]

            public_cases = question.get(
                "samples",
                []
            )

            private_cases = question.get(
                "private_samples",
                []
            )

            all_samples = public_cases + private_cases
            num_public = len(public_cases)

            current_time_limit = question.get(
                "time_limit",
                2
            )

        except:
            raise HTTPException(
                status_code=400,
                detail="Invalid question index."
            )

    if not all_samples:
        raise HTTPException(
            status_code=400,
            detail="No test cases."
        )

    # clamp time limit
    if current_time_limit < 1:
        current_time_limit = 1

    if current_time_limit > 5:
        current_time_limit = 5

    run_id = str(uuid.uuid4())[:8]

    work_dir = os.path.join(
        tempfile.gettempdir(),
        f"arena_run_{run_id}"
    )

    os.makedirs(work_dir, exist_ok=True)

    results = []

    try:
        # ------------------------
        # LANGUAGE CONFIG
        # ------------------------
        if req.language == "python":
            file_path = os.path.join(
                work_dir,
                "solution.py"
            )

            run_cmd = [
                sys.executable,
                "solution.py"
            ]

        else:
            file_path = os.path.join(
                work_dir,
                "Solution.java"
            )

            run_cmd = [
                "java",
                "-Xmx128m",
                "-Xss256k",
                "Solution"
            ]

        # write code
        with open(
            file_path,
            "w",
            encoding="utf-8"
        ) as f:
            f.write(req.code)

        # compile java
        if req.language == "java":
            compile_proc = subprocess.run(
                ["javac", "Solution.java"],
                cwd=work_dir,
                capture_output=True,
                text=True,
                timeout=5
            )

            if compile_proc.returncode != 0:
                return {
                    "status": "COMPILATION_ERROR",
                    "message": compile_proc.stderr
                }

        # ------------------------
        # RUN TEST CASES
        # ------------------------
        for i, sample in enumerate(all_samples):
            sample_dict = (
                sample.model_dump()
                if hasattr(sample, "model_dump")
                else sample
            )

            is_public = i < num_public

            async with semaphore:
                ret_code, stdout, stderr = await run_safe_process(
                    run_cmd,
                    work_dir,
                    sample_dict.get(
                        "input_data",
                        ""
                    ),
                    current_time_limit
                )

            if ret_code == "TIMEOUT":
                results.append({
                    "case": i + 1,
                    "passed": False,
                    "status": "TIMEOUT",
                    "is_public": is_public
                })
                break

            if ret_code != 0:
                results.append({
                    "case": i + 1,
                    "passed": False,
                    "status": "RUNTIME_ERROR",
                    "is_public": is_public,
                    "message": (
                        stderr if is_public
                        else "Execution Error"
                    )
                })
                break

            expected = sample_dict.get(
                "output_data",
                ""
            )

            passed = compare_outputs(
                stdout,
                expected
            )

            results.append({
                "case": i + 1,
                "passed": passed,
                "is_public": is_public,
                "input": (
                    sample_dict.get("input_data")
                    if is_public else "HIDDEN"
                ),
                "expected": (
                    normalize_text(expected)
                    if is_public else "HIDDEN"
                ),
                "actual": (
                    normalize_text(stdout)
                    if is_public
                    else (
                        "PASSED"
                        if passed else "FAILED"
                    )
                )
            })

        return {
            "status": "SUCCESS",
            "test_results": results
        }

    finally:
        shutil.rmtree(
            work_dir,
            ignore_errors=True
        )