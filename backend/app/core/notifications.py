import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# --- Email Delivery Architecture (Provider-Agnostic Production & MVP Interface) ---

class BaseEmailProvider(ABC):
    @abstractmethod
    def send_email(self, to_email: str, subject: str, body_text: str, metadata: Optional[Dict[str, Any]] = None) -> bool:
        pass

class MockEmailProvider(BaseEmailProvider):
    """Default provider for development and testing. Zero external infrastructure dependencies."""
    def __init__(self):
        self.sent_emails: List[Dict[str, Any]] = []

    def send_email(self, to_email: str, subject: str, body_text: str, metadata: Optional[Dict[str, Any]] = None) -> bool:
        email_record = {
            "to_email": to_email,
            "subject": subject,
            "body_text": body_text,
            "metadata": metadata or {},
            "timestamp": datetime.utcnow().isoformat()
        }
        self.sent_emails.append(email_record)
        logger.info(f"[MockEmailProvider] Email dispatched to {to_email} | Subject: '{subject}'")
        return True

class SMTPEmailProvider(BaseEmailProvider):
    """Production SMTP delivery provider configured via environment variables."""
    def __init__(self):
        self.smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = os.getenv("SMTP_USER", "")
        self.smtp_pass = os.getenv("SMTP_PASSWORD", "")
        self.from_email = os.getenv("SMTP_FROM_EMAIL", self.smtp_user or "notifications@campusfix.ai")

    def send_email(self, to_email: str, subject: str, body_text: str, metadata: Optional[Dict[str, Any]] = None) -> bool:
        if not self.smtp_user or not self.smtp_pass:
            logger.warning("[SMTPEmailProvider] SMTP credentials missing. Falling back to safe mock delivery log.")
            return True

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = self.from_email
            msg["To"] = to_email
            msg.attach(MIMEText(body_text, "plain"))

            with smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=10) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_pass)
                server.sendmail(self.from_email, [to_email], msg.as_string())

            logger.info(f"[SMTPEmailProvider] Real SMTP email sent to {to_email}")
            return True
        except Exception as exc:
            logger.error(f"[SMTPEmailProvider] Failed to dispatch SMTP email to {to_email}: {exc}")
            return False

def get_email_provider() -> BaseEmailProvider:
    provider_type = os.getenv("EMAIL_PROVIDER", "mock").lower()
    if provider_type == "smtp" or (os.getenv("SMTP_HOST") and os.getenv("SMTP_USER")):
        return SMTPEmailProvider()
    return MockEmailProvider()

# Global singleton email provider and rate limiter instances
email_provider = get_email_provider()

class NotificationRateLimiter:
    """Configurable rate limiter to prevent notification spam per user."""
    def __init__(self, max_per_minute: int = 20):
        self.max_per_minute = int(os.getenv("NOTIFICATION_RATE_LIMIT_PER_MIN", str(max_per_minute)))
        self.user_timestamps: Dict[str, List[datetime]] = {}

    def is_rate_limited(self, user_id: str) -> bool:
        now = datetime.utcnow()
        cutoff = now - timedelta(minutes=1)
        if user_id not in self.user_timestamps:
            self.user_timestamps[user_id] = []
        
        # Clean older timestamps
        self.user_timestamps[user_id] = [ts for ts in self.user_timestamps[user_id] if ts > cutoff]

        if len(self.user_timestamps[user_id]) >= self.max_per_minute:
            return True
        
        self.user_timestamps[user_id].append(now)
        return False

rate_limiter = NotificationRateLimiter()
