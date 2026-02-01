"""File service for handling file uploads to OpenAI Files API"""

import os
import re
import logging
from typing import Optional, List
from uuid import UUID
from sqlalchemy.orm import Session
from openai import AsyncOpenAI

from app.config import settings
from app.models import ProjectFile, Project

logger = logging.getLogger(__name__)

# Allowed file extensions for upload (security allowlist)
ALLOWED_EXTENSIONS = {"txt", "md", "json", "pdf", "csv"}
MAX_FILENAME_LENGTH = 255
SAFE_FILENAME_PATTERN = re.compile(r"[^a-zA-Z0-9._-]")


def sanitize_filename(filename: str) -> str:
    """
    Sanitize a filename: strip path, null bytes, limit length, allow only safe chars.
    Returns empty string if result would be invalid.
    """
    if not filename or not filename.strip():
        return ""
    base = os.path.basename(filename).replace("\x00", "").strip()
    if not base:
        return ""
    safe = SAFE_FILENAME_PATTERN.sub("_", base)
    safe = re.sub(r"_+", "_", safe).strip("._-")
    if not safe:
        return ""
    return safe[:MAX_FILENAME_LENGTH]


class FileService:
    """Service for managing file uploads with OpenAI Files API"""
    
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None
    
    async def upload_file(
        self,
        file_content: bytes,
        filename: str,
        purpose: str = "assistants"
    ) -> Optional[str]:
        """
        Upload a file to OpenAI Files API
        
        Args:
            file_content: File content as bytes
            filename: Original filename
            purpose: File purpose (default: "assistants")
            
        Returns:
            OpenAI file ID if successful, None otherwise
        """
        if not self.client:
            raise ValueError("OpenAI API key not configured")
        
        try:
            # Upload file to OpenAI
            file_obj = await self.client.files.create(
                file=(filename, file_content),
                purpose=purpose
            )
            
            logger.info(f"File uploaded to OpenAI: {file_obj.id} ({filename})")
            return file_obj.id
            
        except Exception as e:
            logger.error(f"Error uploading file to OpenAI: {str(e)}")
            raise
    
    async def delete_file(self, openai_file_id: str) -> bool:
        """
        Delete a file from OpenAI Files API
        
        Args:
            openai_file_id: OpenAI file ID
            
        Returns:
            True if successful, False otherwise
        """
        if not self.client:
            raise ValueError("OpenAI API key not configured")
        
        try:
            await self.client.files.delete(openai_file_id)
            logger.info(f"File deleted from OpenAI: {openai_file_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting file from OpenAI: {str(e)}")
            raise
    
    async def get_file_info(self, openai_file_id: str) -> Optional[dict]:
        """
        Get file information from OpenAI
        
        Args:
            openai_file_id: OpenAI file ID
            
        Returns:
            File information dict or None
        """
        if not self.client:
            raise ValueError("OpenAI API key not configured")
        
        try:
            file_obj = await self.client.files.retrieve(openai_file_id)
            return {
                "id": file_obj.id,
                "filename": file_obj.filename,
                "bytes": file_obj.bytes,
                "purpose": file_obj.purpose,
                "created_at": file_obj.created_at
            }
        except Exception as e:
            logger.error(f"Error retrieving file info from OpenAI: {str(e)}")
            return None
    
    def validate_file_size(self, file_size: int) -> bool:
        """
        Validate file size against configured limit
        
        Args:
            file_size: File size in bytes
            
        Returns:
            True if valid, False if exceeds limit
        """
        max_size = settings.MAX_FILE_SIZE
        if file_size > max_size:
            logger.warning(f"File size {file_size} exceeds limit {max_size}")
            return False
        return True
    
    def get_file_type(self, filename: str) -> str:
        """
        Determine file type from filename

        Args:
            filename: File name

        Returns:
            File type/extension
        """
        if "." in filename:
            return filename.rsplit(".", 1)[1].lower()
        return "unknown"

    @staticmethod
    def is_allowed_extension(filename: str) -> bool:
        """Return True only if the file extension is in the allowlist."""
        ext = filename.rsplit(".", 1)[1].lower() if "." in filename else "unknown"
        return ext in ALLOWED_EXTENSIONS


# Create singleton instance
file_service = FileService()
