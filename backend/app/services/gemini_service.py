import re
import json
import time
import logging
from typing import Dict, Any, Optional, Tuple
from app.core.config import settings
from app.models.domain import GeminiTriageResponse

logger = logging.getLogger(__name__)

# --- PII Sanitization Engine ---

def sanitize_triage_input(title: str, description: str, location_name: Optional[str] = None) -> Tuple[str, str, str]:
    """
    Strips personally identifiable information (PII) such as emails, phone numbers,
    and student IDs before passing prompt payloads to external LLM services.
    """
    # Regex patterns
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    phone_pattern = r'\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b'
    student_id_pattern = r'\b(?:STU|ID|S)?\d{6,10}\b'

    def scrub(text: str) -> str:
        if not text:
            return ""
        s = re.sub(email_pattern, '[REDACTED_EMAIL]', text)
        s = re.sub(phone_pattern, '[REDACTED_PHONE]', s)
        s = re.sub(student_id_pattern, '[REDACTED_ID]', s)
        return s.strip()

    clean_title = scrub(title)
    clean_desc = scrub(description)
    clean_loc = scrub(location_name or "Campus Location")
    return clean_title, clean_desc, clean_loc

# --- Error Classification Engine ---

class GeminiTransientError(Exception):
    """Raised when Gemini API encounters a transient network or server error."""
    pass

class GeminiPermanentError(Exception):
    """Raised when Gemini API encounters a permanent client or auth error."""
    pass

def is_transient_error(exc: Exception) -> bool:
    """
    Evaluates whether an exception is transient (retriable) or permanent (non-retriable).
    Transient errors: Timeout, 429 Resource Exhausted, 503 Service Unavailable, connection reset.
    Permanent errors: 400 Bad Request, 401/403 Authentication/Authorization, Schema Error.
    """
    err_str = str(exc).lower()
    if isinstance(exc, GeminiTransientError):
        return True
    if isinstance(exc, GeminiPermanentError):
        return False

    transient_indicators = ["429", "resource_exhausted", "503", "unavailable", "timeout", "timed out", "connection reset", "service unavailable", "try again"]
    for indicator in transient_indicators:
        if indicator in err_str:
            return True
    return False

# --- SDG Rule-Based Mapping ---

SDG_MAPPING_RULES = {
    "WATER": "SDG 6: Clean Water and Sanitation",
    "ENERGY": "SDG 7: Affordable and Clean Energy",
    "INFRASTRUCTURE": "SDG 9: Industry, Innovation and Infrastructure",
    "CLEANLINESS": "SDG 11: Sustainable Cities and Communities",
    "TRANSPORT": "SDG 11: Sustainable Cities and Communities",
    "WASTE": "SDG 12: Responsible Consumption and Production",
    "FOOD": "SDG 12: Responsible Consumption and Production",
    "OTHER": "SDG 11: Sustainable Cities and Communities"
}

def rule_based_fallback_triage(report_category: str, student_priority: str) -> GeminiTriageResponse:
    """
    Generates a safe rule-based triage response when external AI services fail or are unavailable.
    """
    cat = (report_category or "OTHER").upper()
    if cat not in SDG_MAPPING_RULES:
        cat = "OTHER"
    
    prio = (student_priority or "MEDIUM").upper()
    if prio not in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]:
        prio = "MEDIUM"

    sdg = SDG_MAPPING_RULES.get(cat, "SDG 11: Sustainable Cities and Communities")

    return GeminiTriageResponse(
        recommended_category=cat,
        recommended_priority=prio,
        confidence_score=0.50,
        sdg_mapping=sdg,
        reasoning="Rule-based fallback applied due to external service unavailability. Triage derived from student report category and priority.",
        suggested_action="Dispatch campus facilities management crew for on-site physical inspection."
    )

# --- Primary & Fallback Model Executor ---

def _call_model(
    model_name: str,
    title: str,
    description: str,
    category: str,
    location_name: str,
    student_priority: str,
    api_key: str,
    timeout_seconds: int
) -> Tuple[GeminiTriageResponse, str]:
    """
    Helper function to invoke the Gemini API using either Google GenAI SDK or structured HTTP request,
    or mock interface during testing/development if API key is not present.
    """
    if not api_key:
        raise GeminiPermanentError("GEMINI_API_KEY is missing or invalid.")

    try:
        # Try importing official google.genai or google.generativeai SDK if available
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        
        prompt = f"""
System Role: You are CampusFix AI, an expert campus sustainability and facilities operations triage agent.
Analyze the following maintenance/sustainability issue report and output structured JSON.

Report Details:
- Title: {title}
- Description: {description}
- User Category: {category}
- Location: {location_name}
- Student Priority: {student_priority}

Return a valid JSON object matching this schema:
{{
  "recommended_category": "WASTE|WATER|ENERGY|CLEANLINESS|FOOD|TRANSPORT|INFRASTRUCTURE|OTHER",
  "recommended_priority": "LOW|MEDIUM|HIGH|CRITICAL",
  "confidence_score": 0.85,
  "sdg_mapping": "SDG code and name",
  "reasoning": "Factual non-fabricated justification",
  "suggested_action": "Actionable maintenance recommendation"
}}
"""
        model = genai.GenerativeModel(model_name)
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        raw_text = response.text
        data = json.loads(raw_text)
        structured = GeminiTriageResponse(**data)
        return structured, raw_text

    except Exception as e:
        err_str = str(e)
        if "400" in err_str or "invalid" in err_str.lower() or "401" in err_str or "403" in err_str:
            raise GeminiPermanentError(f"Permanent API error on {model_name}: {err_str}")
        elif "429" in err_str or "503" in err_str or "timeout" in err_str.lower():
            raise GeminiTransientError(f"Transient API error on {model_name}: {err_str}")
        else:
            raise GeminiTransientError(f"API execution failure on {model_name}: {err_str}")

# --- Main Resilient AI Triage Service Pipeline ---

def run_gemini_triage(
    title: str,
    description: str,
    category: str,
    location_name: Optional[str] = None,
    student_priority: str = "MEDIUM",
    api_key: Optional[str] = None,
    primary_model: Optional[str] = None,
    fallback_model: Optional[str] = None,
    timeout_seconds: Optional[int] = None,
    max_retries: Optional[int] = None,
    prompt_version: Optional[str] = None
) -> Dict[str, Any]:
    """
    Main resilient AI triage pipeline enforcing:
    1. PII Scrubbing
    2. Primary Model Execution with Exponential Backoff Retries on Transient Errors
    3. Automatic Model Fallback to Fallback Model if Primary Retries Exhaust
    4. Rule-Based Fallback if all AI models fail or permanent client errors occur
    5. Detailed Telemetry Recording
    """
    key = api_key if api_key is not None else settings.GEMINI_API_KEY
    pri_model = primary_model or settings.GEMINI_PRIMARY_MODEL
    fall_model = fallback_model or settings.GEMINI_FALLBACK_MODEL
    timeout = timeout_seconds if timeout_seconds is not None else settings.GEMINI_TIMEOUT_SECONDS
    retries_limit = max_retries if max_retries is not None else settings.GEMINI_MAX_RETRIES
    version = prompt_version or settings.GEMINI_PROMPT_VERSION

    # 1. PII Scrubbing
    clean_title, clean_desc, clean_loc = sanitize_triage_input(title, description, location_name)

    telemetry = {
        "prompt_version": version,
        "primary_model": pri_model,
        "model_used": pri_model,
        "fallback_used": False,
        "retry_count": 0,
        "failure_reason": None,
        "is_fallback": False,
        "raw_response": None
    }

    # If no API key provided, directly execute rule-based fallback
    if not key:
        telemetry["model_used"] = "rule-based-fallback"
        telemetry["is_fallback"] = True
        telemetry["failure_reason"] = "GEMINI_API_KEY is not configured."
        fallback_res = rule_based_fallback_triage(category, student_priority)
        return {**fallback_res.model_dump(), **telemetry}

    # 2. Attempt Primary Model Execution with Retries
    primary_attempts = 0
    last_primary_error: Optional[Exception] = None

    while primary_attempts <= retries_limit:
        try:
            res, raw = _call_model(
                model_name=pri_model,
                title=clean_title,
                description=clean_desc,
                category=category,
                location_name=clean_loc,
                student_priority=student_priority,
                api_key=key,
                timeout_seconds=timeout
            )
            telemetry["model_used"] = pri_model
            telemetry["retry_count"] = primary_attempts
            telemetry["raw_response"] = raw
            return {**res.model_dump(), **telemetry}

        except Exception as exc:
            last_primary_error = exc
            if not is_transient_error(exc):
                # Permanent error on primary model -> do not retry or model switch unnecessarily
                logger.warning(f"Permanent error on primary model {pri_model}: {exc}")
                telemetry["failure_reason"] = f"Permanent error on {pri_model}: {str(exc)}"
                break
            
            primary_attempts += 1
            if primary_attempts <= retries_limit:
                backoff_delay = 0.1 * (2 ** (primary_attempts - 1))
                time.sleep(backoff_delay)

    telemetry["retry_count"] = min(primary_attempts, retries_limit)

    # 3. Attempt Fallback Model Execution if Primary Error was Transient
    if last_primary_error and is_transient_error(last_primary_error):
        logger.info(f"Primary model {pri_model} failed transiently after {primary_attempts} retries. Switching to fallback model {fall_model}.")
        try:
            res, raw = _call_model(
                model_name=fall_model,
                title=clean_title,
                description=clean_desc,
                category=category,
                location_name=clean_loc,
                student_priority=student_priority,
                api_key=key,
                timeout_seconds=timeout
            )
            telemetry["model_used"] = fall_model
            telemetry["fallback_used"] = True
            telemetry["raw_response"] = raw
            telemetry["failure_reason"] = f"Primary model {pri_model} failed: {str(last_primary_error)}"
            return {**res.model_dump(), **telemetry}
        except Exception as exc:
            logger.warning(f"Fallback model {fall_model} failed: {exc}")
            telemetry["failure_reason"] = f"Primary error: {str(last_primary_error)} | Fallback error: {str(exc)}"

    # 4. Rule-Based Fallback Triage if all AI models failed or permanent error occurred
    telemetry["model_used"] = "rule-based-fallback"
    telemetry["is_fallback"] = True
    if not telemetry["failure_reason"] and last_primary_error:
        telemetry["failure_reason"] = str(last_primary_error)

    fallback_res = rule_based_fallback_triage(category, student_priority)
    return {**fallback_res.model_dump(), **telemetry}
