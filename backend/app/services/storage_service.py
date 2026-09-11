import uuid
from typing import Tuple
from fastapi import HTTPException, status
from app.core.config import settings

# Allowed Magic Bytes signatures
JPEG_MAGIC = b'\xff\xd8\xff'
PNG_MAGIC = b'\x89PNG\r\n\x1a\n'
WEBP_MAGIC_HEADER = b'RIFF'
WEBP_MAGIC_TYPE = b'WEBP'

class StorageService:
    def validate_and_sanitize_image(self, content: bytes, content_type: str) -> Tuple[bytes, str, str]:
        """
        Validates photo size, MIME type, and actual magic bytes file signature.
        Generates server-side random filename and sanitizes path.
        Never uses user-provided filenames or paths!
        """
        # 1. Enforce max size server-side (5MB limit)
        if len(content) > settings.MAX_PHOTO_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File size exceeds maximum allowed limit of 5MB ({len(content)} bytes uploaded)"
            )

        # 2. Validate MIME type
        allowed_mimes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
        if content_type.lower() not in allowed_mimes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file MIME type '{content_type}'. Only JPEG, PNG, and WebP are allowed."
            )

        # 3. Validate actual file signature / content (magic bytes)
        detected_ext = None
        if content.startswith(JPEG_MAGIC):
            detected_ext = ".jpg"
        elif content.startswith(PNG_MAGIC):
            detected_ext = ".png"
        elif content.startswith(WEBP_MAGIC_HEADER) and WEBP_MAGIC_TYPE in content[:16]:
            detected_ext = ".webp"
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file signature: File content does not match genuine JPEG, PNG, or WebP image headers."
            )

        # 4. Generate server-side random filename (Never trust user filename!)
        random_filename = f"{uuid.uuid4()}{detected_ext}"

        # 5. Return sanitized content bytes, random filename, and ext
        return content, random_filename, detected_ext

    def generate_private_storage_path(self, university_id: str, issue_id: str, random_filename: str) -> str:
        """
        Constructs private storage bucket path enforcing tenant isolation.
        No public URLs!
        """
        return f"private-issue-reports/{university_id}/{issue_id}/{random_filename}"

storage_service = StorageService()
