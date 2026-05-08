"""
File uploads API routes
"""
from fastapi import APIRouter, HTTPException, UploadFile, File
import base64
import uuid
from datetime import datetime

router = APIRouter()

@router.post("/image")
async def upload_image(file: UploadFile = File(...)):
    """Upload image via file upload"""
    try:
        # Read file content
        content = await file.read()
        
        # Generate unique filename
        file_ext = file.filename.split('.')[-1] if '.' in file.filename else 'png'
        unique_filename = f"emails/{uuid.uuid4()}.{file_ext}"
        
        # In a real implementation, you would:
        # 1. Save the file to cloud storage (S3, etc.)
        # 2. Return the public URL
        
        # For now, return a mock URL
        mock_url = f"https://your-storage-bucket.s3.amazonaws.com/{unique_filename}"
        
        return {"url": mock_url}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Alternative endpoint for base64 uploads (as in the original Node.js code)
@router.post("/image-base64")
async def upload_image_base64(data: dict):
    """Upload image via base64 payload"""
    try:
        filename = data.get("filename")
        content_type = data.get("contentType")
        data_base64 = data.get("data")
        
        if not filename or not content_type or not data_base64:
            raise HTTPException(status_code=400, detail="filename, contentType, and data (base64) are required")
        
        # Decode base64
        try:
            file_content = base64.b64decode(data_base64)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid base64 data")
        
        # Generate unique filename
        file_ext = filename.split('.')[-1] if '.' in filename else 'png'
        unique_filename = f"emails/{uuid.uuid4()}.{file_ext}"
        
        # In a real implementation, you would:
        # 1. Save the file to cloud storage (S3, etc.)
        # 2. Return the public URL
        
        # For now, return a mock URL
        mock_url = f"https://your-storage-bucket.s3.amazonaws.com/{unique_filename}"
        
        return {"url": mock_url}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))