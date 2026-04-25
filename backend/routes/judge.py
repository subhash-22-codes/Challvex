import os
import uuid
import subprocess
import shutil
import sys
import time
import tempfile
import logging
import asyncio
import signal
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Optional
from database import db
from auth_utils import get_current_user
from pydantic import BaseModel

router = APIRouter()
logger = logging.getLogger(__name__)

MAX_OUTPUT_SIZE = 100 * 1024
MAX_CONCURRENT_JUDGES = 4
semaphore = asyncio.Semaphore(MAX_CONCURRENT_JUDGES)

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

def flexible_normalize(text: str):
    if not text: return ""
    return text.strip().replace("\r\n", "\n")[:10000] 

def compare_outputs(actual: str, expected: str) -> bool:
    if actual is None or expected is None: return False
    return actual.split() == expected.split()

async def run_safe_process(cmd, work_dir, input_data, timeout):
    if not input_data.endswith("\n"):
        input_data += "\n"
        
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

        try:
            stdout, stderr = await asyncio.wait_for(
                asyncio.to_thread(proc.communicate, input=input_data),
                timeout=timeout
            )
            
            if len(stdout) > MAX_OUTPUT_SIZE:
                stdout = stdout[:MAX_OUTPUT_SIZE] + "\n[Output Truncated]"
                
            return proc.returncode, stdout, stderr

        except asyncio.TimeoutExpired:
            os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
            return "TIMEOUT", "", "Time Limit Exceeded"

    except Exception as e:
        return "ERROR", "", str(e)

@router.post("/judge")
async def run_code(req: ExecutionRequest, current_user: dict = Depends(get_current_user)):
    if req.language not in ["python", "java"]:
        raise HTTPException(status_code=400, detail="Unsupported language.")

    if len(req.code) > 30000:
        raise HTTPException(status_code=400, detail="Code too large.")

    forbidden = ["java.io.File", "java.nio", "ProcessBuilder", "Runtime.getRuntime", "os.system", "subprocess.", "eval(", "exec("]
    for word in forbidden:
        if word in req.code:
            return {"status": "SECURITY_ERROR", "message": "Prohibited operations detected."}

    all_samples = []
    num_public = 0
    current_time_limit = req.time_limit or 2
    results = [] 

    if req.samples is not None:
        all_samples = req.samples + (req.private_samples or [])
        num_public = len(req.samples)
    elif req.slot_id is not None:
        challenge = await db.challenges.find_one({"slot_id": req.slot_id})
        if not challenge: 
            raise HTTPException(status_code=404, detail="Challenge not found")
        try:
            question = challenge["questions"][req.question_index]
            all_samples = question.get("samples", []) + question.get("private_samples", [])
            num_public = len(question.get("samples", []))
            current_time_limit = question.get("time_limit", 2)
        except (IndexError, KeyError):
            raise HTTPException(status_code=400, detail="Invalid index")
    
    if not all_samples:
         raise HTTPException(status_code=400, detail="No test cases.")

    run_id = str(uuid.uuid4())[:8]
    work_dir = os.path.join(tempfile.gettempdir(), f"arena_run_{run_id}")
    os.makedirs(work_dir, exist_ok=True)

    try:
        if req.language == "python":
            file_path = os.path.join(work_dir, "solution.py")
            run_cmd = [sys.executable, "solution.py"]
        else:
            file_path = os.path.join(work_dir, "Solution.java")
            run_cmd = ["java", "-Xmx128m", "-Xss256k", "Solution"]

        with open(file_path, "w", encoding="utf-8") as f:
            f.write(req.code)

        if req.language == "java":
            compile_proc = subprocess.run(
                ["javac", "Solution.java"],
                cwd=work_dir, capture_output=True, text=True, timeout=5
            )
            if compile_proc.returncode != 0:
                return {"status": "COMPILATION_ERROR", "message": compile_proc.stderr}

        for i, sample in enumerate(all_samples):
            sample_dict = sample.dict() if hasattr(sample, 'dict') else sample
            is_public = i < num_public
            
            async with semaphore:
                ret_code, stdout, stderr = await run_safe_process(
                    run_cmd, work_dir, sample_dict.get("input_data", ""), current_time_limit
                )

            if ret_code == "TIMEOUT":
                results.append({"case": i+1, "passed": False, "status": "TIMEOUT", "is_public": is_public})
                break
            
            if ret_code != 0:
                results.append({
                    "case": i+1, "passed": False, "status": "RUNTIME_ERROR", "is_public": is_public,
                    "message": stderr if is_public else "Execution Error"
                })
                break

            passed = compare_outputs(stdout, sample_dict.get("output_data", ""))
            results.append({
                "case": i+1, "passed": passed, "is_public": is_public,
                "input": sample_dict.get("input_data") if is_public else "HIDDEN",
                "expected": flexible_normalize(sample_dict.get("output_data")) if is_public else "HIDDEN",
                "actual": flexible_normalize(stdout) if is_public else ("PASSED" if passed else "FAILED")
            })

        return {"status": "SUCCESS", "test_results": results}

    finally:
        if os.path.exists(work_dir):
            shutil.rmtree(work_dir, ignore_errors=True)