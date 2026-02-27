import json
from datetime import UTC, datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


class Pack(Base):
    __tablename__ = "packs"

    id = Column(Integer, primary_key=True)
    topic = Column(String(100), nullable=False)
    date = Column(String(10), nullable=False)  # YYYY-MM-DD
    pack_type = Column(String(10), nullable=False, default="daily")  # "daily" or "weekly"
    status = Column(String(20), nullable=False, default="generating")
    total_duration = Column(Float, default=0.0)
    created_at = Column(DateTime, default=lambda: datetime.now(UTC))

    stories = relationship("Story", back_populates="pack", order_by="Story.position")

    def to_dict(self, include_stories=False, preview=False):
        d = {
            "id": self.id,
            "topic": self.topic,
            "date": self.date,
            "pack_type": self.pack_type or "daily",
            "status": self.status,
            "total_duration": self.total_duration,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "story_count": len(self.stories) if self.stories else 0,
        }
        if include_stories:
            d["stories"] = [s.to_dict() for s in self.stories]
        elif preview:
            d["stories"] = [
                {
                    "id": s.id,
                    "position": s.position,
                    "headline": s.headline,
                    "summary": s.summary or "",
                    "source_count": len(json.loads(s.source_urls)) if s.source_urls else 0,
                    "duration": s.duration,
                    "audio_url": f"/audio/{s.audio_filename}" if s.audio_filename else None,
                }
                for s in self.stories
            ]
        return d


class Story(Base):
    __tablename__ = "stories"

    id = Column(Integer, primary_key=True)
    pack_id = Column(Integer, ForeignKey("packs.id"), nullable=False)
    position = Column(Integer, nullable=False)
    headline = Column(String(500), nullable=False)
    summary = Column(Text, default="")
    source_urls = Column(Text, default="[]")  # JSON array
    script = Column(Text, default="")
    audio_filename = Column(String(200), default="")
    duration = Column(Float, default=0.0)
    created_at = Column(DateTime, default=lambda: datetime.now(UTC))

    pack = relationship("Pack", back_populates="stories")

    def to_dict(self):
        urls = json.loads(self.source_urls) if self.source_urls else []
        return {
            "id": self.id,
            "pack_id": self.pack_id,
            "position": self.position,
            "headline": self.headline,
            "summary": self.summary,
            "source_urls": urls,
            "source_count": len(urls),
            "script": self.script,
            "audio_filename": self.audio_filename,
            "audio_url": f"/audio/{self.audio_filename}" if self.audio_filename else None,
            "duration": self.duration,
        }
