from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime


class Template(BaseModel):
    id: str
    name: str
    subject: str
    body_html: str
    body_text: Optional[str] = None
    preview_text: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class TemplateListResponse(BaseModel):
    data: List[Template]
    total: int


class TemplateCreateRequest(BaseModel):
    name: str
    subject: str
    body_html: str
    body_text: Optional[str] = None
    preview_text: Optional[str] = None


class TemplateUpdateRequest(BaseModel):
    name: Optional[str] = None
    subject: Optional[str] = None
    body_html: Optional[str] = None
    body_text: Optional[str] = None
    preview_text: Optional[str] = None