import json
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


class Pack(Base):
    __tablename__ = "packs"

    id = Column(Integer, primary_key=True)
    topic = Column(String(100), nullable=False)
    date = Column(String(10), nullable=False)  # YYYY-MM-DD
    status = Column(String(20), nullable=False, default="generating")
    total_duration = Column(Float, default=0.0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    stories = relationship("Story", back_populates="pack", order_by="Story.position")

    def to_dict(self, include_stories=False):
        d = {
            "id": self.id,
            "topic": self.topic,
            "date": self.date,
            "status": self.status,
            "total_duration": self.total_duration,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "story_count": len(self.stories) if self.stories else 0,
        }
        if include_stories:
            d["stories"] = [s.to_dict() for s in self.stories]
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
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    pack = relationship("Pack", back_populates="stories")

    def to_dict(self):
        return {
            "id": self.id,
            "pack_id": self.pack_id,
            "position": self.position,
            "headline": self.headline,
            "summary": self.summary,
            "source_urls": json.loads(self.source_urls) if self.source_urls else [],
            "script": self.script,
            "audio_filename": self.audio_filename,
            "audio_url": f"/audio/{self.audio_filename}" if self.audio_filename else None,
            "duration": self.duration,
        }
