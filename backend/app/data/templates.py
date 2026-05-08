"""
Templates data service with Redis integration
"""
import json
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid

from app.data.redis_client import get_redis_client
from app.models.template import Template

TEMPLATES_KEY = "templates:list"

class TemplatesService:
    def __init__(self):
        self.redis_client = None
    
    async def _get_redis_client(self):
        """Get Redis client instance"""
        if self.redis_client is None:
            self.redis_client = await get_redis_client()
        return self.redis_client
    
    def _template_key(self, template_id: str) -> str:
        """Get template key"""
        # Handle bytes from Redis
        if isinstance(template_id, bytes):
            template_id = template_id.decode()
        return f"template:{template_id}"
    
    async def list_templates(self) -> List[Template]:
        """List all templates"""
        redis_client = await self._get_redis_client()
        
        template_ids = await redis_client.zrange(TEMPLATES_KEY, 0, -1)
        if not template_ids:
            return []
        
        # zrange returns tuples (id, score) when withscores=True
        template_id_list = [tid[0] if isinstance(tid, tuple) else tid for tid in template_ids]
        template_keys = [self._template_key(template_id) for template_id in template_id_list]
        templates_json = await redis_client.mget(*template_keys)
        
        templates = []
        for template_json in templates_json:
            if template_json:
                templates.append(Template(**json.loads(template_json)))
        
        # Reverse to get newest first
        return templates[::-1]
    
    async def get_template(self, template_id: str) -> Optional[Template]:
        """Get template by ID"""
        redis_client = await self._get_redis_client()
        
        template_json = await redis_client.get(self._template_key(template_id))
        if not template_json:
            return None
        
        return Template(**json.loads(template_json))
    
    async def create_template(self, data: Dict[str, Any]) -> Template:
        """Create a new template"""
        redis_client = await self._get_redis_client()
        
        now = datetime.now().isoformat()
        template = Template(
            id=str(uuid.uuid4()),
            name=data['name'],
            subject=data['subject'],
            body_html=data['body_html'],
            body_text=data.get('body_text'),
            preview_text=data.get('preview_text'),
            created_at=now,
            updated_at=now
        )
        
        # Save template
        await redis_client.set(self._template_key(template.id), template.json())
        
        # Add to templates list
        await redis_client.zadd(TEMPLATES_KEY, {template.id: datetime.now().timestamp()})
        
        return template
    
    async def update_template(self, template_id: str, data: Dict[str, Any]) -> Optional[Template]:
        """Update an existing template"""
        redis_client = await self._get_redis_client()
        
        existing = await self.get_template(template_id)
        if not existing:
            return None
        
        # Update template fields
        update_data = data.copy()
        if 'body_text' in update_data:
            update_data['body_text'] = update_data['body_text'] or None
        if 'preview_text' in update_data:
            update_data['preview_text'] = update_data['preview_text'] or None
        
        updated = existing.copy(update={
            **update_data,
            'updated_at': datetime.now().isoformat()
        })
        
        # Save updated template
        await redis_client.set(self._template_key(template_id), updated.json())
        
        return updated
    
    async def delete_template(self, template_id: str) -> None:
        """Delete a template"""
        redis_client = await self._get_redis_client()
        
        # Delete template
        await redis_client.delete(self._template_key(template_id))
        
        # Remove from templates list
        await redis_client.zrem(TEMPLATES_KEY, template_id)

# Global service instance
templates_service = TemplatesService()