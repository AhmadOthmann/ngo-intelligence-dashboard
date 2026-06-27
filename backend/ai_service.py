import json
import os
from typing import Optional


class AIService:
    def __init__(self) -> None:
        self.provider = os.environ.get("AI_PROVIDER", "none").strip().lower() or "none"

    def generate_text(self, *, system: str, prompt: str, max_tokens: int = 500) -> Optional[str]:
        if self.provider == "openai":
            return self._openai(system=system, prompt=prompt, max_tokens=max_tokens)
        if self.provider == "bedrock":
            return self._bedrock(system=system, prompt=prompt, max_tokens=max_tokens)
        return None

    def _openai(self, *, system: str, prompt: str, max_tokens: int) -> Optional[str]:
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            return None
        try:
            from openai import OpenAI

            client = OpenAI(api_key=api_key)
            response = client.chat.completions.create(
                model=os.environ.get("OPENAI_MODEL", "gpt-4o-mini"),
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=max_tokens,
                temperature=0.2,
            )
            return response.choices[0].message.content
        except Exception:
            return None

    def _bedrock(self, *, system: str, prompt: str, max_tokens: int) -> Optional[str]:
        model_id = os.environ.get("AWS_BEDROCK_MODEL_ID")
        region = os.environ.get("AWS_REGION") or os.environ.get("AWS_DEFAULT_REGION")
        if not model_id or not region:
            return None
        try:
            import boto3

            client = boto3.client("bedrock-runtime", region_name=region)
            body = {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": max_tokens,
                "system": system,
                "messages": [{"role": "user", "content": prompt}],
            }
            response = client.invoke_model(
                modelId=model_id,
                body=json.dumps(body),
                contentType="application/json",
                accept="application/json",
            )
            payload = json.loads(response["body"].read())
            parts = payload.get("content", [])
            text_parts = [part.get("text", "") for part in parts if part.get("type") == "text"]
            return "\n".join(text_parts).strip() or None
        except Exception:
            return None
