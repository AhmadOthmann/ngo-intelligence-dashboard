from datetime import datetime, timezone
from typing import Any, Optional

from .ai_service import AIService
from .database import get_item, list_funding_items, list_items, update_item_fields
from .models import AnalyzeAllResponse, DigestResponse, Item


class AnalysisService:
    def __init__(self) -> None:
        self.ai = AIService()

    def analyze_item(self, item_id: int) -> Optional[Item]:
        item = get_item(item_id)
        if item is None:
            return None

        analysis = self.ai.analyze_item(item.model_dump(mode="json"))
        return update_item_fields(
            item_id,
            {
                "summary": analysis["summary"],
                "category": analysis["category"],
                "relevance_score": analysis["relevance_score"],
                "is_funding_opportunity": analysis["is_funding_opportunity"],
                "deadline": analysis["deadline"],
                "target_org": analysis["target_org"],
                "why_relevant": analysis["why_relevant"],
                "recommended_action": analysis["recommended_action"],
            },
        )

    def analyze_all(self, limit: int = 50) -> AnalyzeAllResponse:
        analyzed = 0
        errors: list[dict[str, Any]] = []
        for item in list_items(limit=limit, offset=0):
            try:
                updated = self.analyze_item(item.id)
                if updated is not None:
                    analyzed += 1
            except Exception as exc:
                errors.append({"item_id": item.id, "error": str(exc)})
        return AnalyzeAllResponse(analyzed=analyzed, errors=errors)

    def translate_item(self, item_id: int, target_language: str) -> Optional[Item]:
        item = get_item(item_id)
        if item is None:
            return None

        source_text = item.summary or item.raw_text or item.title
        result = self.ai.translate_text(source_text, target_language)
        return update_item_fields(
            item_id,
            {
                "translated_text": result["translated_text"],
                "translated_language": result["target_language"],
            },
        )

    def digest(self) -> DigestResponse:
        items = list_items(limit=100, offset=0)
        top_items = sorted(
            items,
            key=lambda item: (item.relevance_score or 0, item.created_at),
            reverse=True,
        )[:10]
        funding_items = list_funding_items(limit=10, offset=0)
        digest = self.ai.generate_digest(
            [item.model_dump(mode="json") for item in top_items],
            [item.model_dump(mode="json") for item in funding_items],
        )

        return DigestResponse(
            generated_at=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            top_items=top_items,
            funding_items=funding_items,
            **digest,
        )
