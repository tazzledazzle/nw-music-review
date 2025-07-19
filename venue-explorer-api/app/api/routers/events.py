"""
Events API endpoints
"""

from fastapi import APIRouter, Depends, Path
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.error_handler import ErrorHandler
from app.schemas.models import EventResponse
from app.repositories.event_repository import EventRepository

router = APIRouter()


@router.get("/events/{event_id}", response_model=EventResponse)
async def get_event(
    event_id: int = Path(..., gt=0, description="Event ID"),
    db: Session = Depends(get_db)
):
    """Get detailed event information"""
    event_repo = EventRepository(db)
    
    event = await event_repo.find_by_id_with_details(event_id)
    
    if not event:
        raise ErrorHandler.not_found("Event", event_id)
    
    # Calculate days until event
    from datetime import datetime
    days_until = (event.event_datetime.date() - datetime.now().date()).days
    
    event_response = EventResponse.from_orm(event)
    event_response.days_until_event = days_until
    
    return event_response
