import pytest

from backend.http_client import (
    ResponseTooLargeError,
    UnsafeUrlError,
    fetch_public_url,
    validate_public_url,
)


class FakeResponse:
    def __init__(
        self,
        *,
        status_code: int = 200,
        headers: dict[str, str] | None = None,
        chunks: list[bytes] | None = None,
    ) -> None:
        self.status_code = status_code
        self.headers = headers or {}
        self._chunks = chunks or []
        self.closed = False

    def raise_for_status(self) -> None:
        return None

    def iter_content(self, chunk_size: int):
        yield from self._chunks

    def close(self) -> None:
        self.closed = True


class FakeSession:
    def __init__(self, responses: list[FakeResponse]) -> None:
        self.responses = responses
        self.requested_urls: list[str] = []

    def get(self, url: str, **kwargs) -> FakeResponse:
        self.requested_urls.append(url)
        return self.responses.pop(0)


@pytest.mark.parametrize(
    "url",
    [
        "http://127.0.0.1/admin",
        "http://10.0.0.4/",
        "http://169.254.169.254/latest/meta-data/",
        "http://[::1]/",
        "http://224.0.0.1/",
        "http://239.255.255.250/",
        "http://[ff02::1]/",
        "http://[ff0e::1]/",
        "http://[64:ff9b::7f00:1]/",
        "http://localhost/",
        "file:///etc/passwd",
        "https://user:password@8.8.8.8/",
        "https://8.8.8.8:8443/",
        "https://8.8.8.8/path\\to\\resource",
    ],
)
def test_private_and_unsafe_urls_are_rejected(url: str) -> None:
    with pytest.raises(UnsafeUrlError):
        validate_public_url(url)


def test_public_ip_url_is_allowed() -> None:
    assert validate_public_url("https://8.8.8.8/feed.xml") == (
        "https://8.8.8.8/feed.xml"
    )


def test_hostname_is_resolved_again_for_each_validation(monkeypatch) -> None:
    answers = iter(["8.8.8.8", "127.0.0.1"])

    def fake_getaddrinfo(*args, **kwargs):
        del args, kwargs
        address = next(answers)
        return [(2, 1, 6, "", (address, 443))]

    monkeypatch.setattr("backend.http_client.socket.getaddrinfo", fake_getaddrinfo)

    assert validate_public_url("https://example.org/feed.xml") == (
        "https://example.org/feed.xml"
    )
    with pytest.raises(UnsafeUrlError, match="non-public"):
        validate_public_url("https://example.org/feed.xml")


def test_configured_domain_allowlist_is_enforced(monkeypatch) -> None:
    monkeypatch.setenv("SOURCE_DOMAIN_ALLOWLIST", "example.org")

    with pytest.raises(UnsafeUrlError, match="SOURCE_DOMAIN_ALLOWLIST"):
        validate_public_url("https://8.8.8.8/feed.xml")


def test_production_requires_domain_allowlist(monkeypatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.delenv("SOURCE_DOMAIN_ALLOWLIST", raising=False)

    with pytest.raises(UnsafeUrlError, match="required in production"):
        validate_public_url("https://8.8.8.8/feed.xml")


def test_non_fetch_link_can_skip_production_allowlist(monkeypatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("SOURCE_DOMAIN_ALLOWLIST", "feeds.example.org")

    assert validate_public_url(
        "https://8.8.8.8/article",
        allowed_domains=(),
        require_allowlist_in_production=False,
    ) == "https://8.8.8.8/article"


def test_redirect_to_private_address_is_rejected() -> None:
    response = FakeResponse(
        status_code=302,
        headers={"location": "http://127.0.0.1/private"},
    )
    session = FakeSession([response])

    with pytest.raises(UnsafeUrlError):
        fetch_public_url(session, "https://8.8.8.8/feed.xml", timeout=5)

    assert response.closed is True


def test_https_redirect_may_not_downgrade_to_http() -> None:
    response = FakeResponse(
        status_code=302,
        headers={"location": "http://8.8.8.8/feed.xml"},
    )
    session = FakeSession([response])

    with pytest.raises(UnsafeUrlError, match="downgrade"):
        fetch_public_url(session, "https://8.8.8.8/feed.xml", timeout=5)


def test_cross_origin_redirect_can_be_disabled() -> None:
    response = FakeResponse(
        status_code=302,
        headers={"location": "https://1.1.1.1/article"},
    )
    session = FakeSession([response])

    with pytest.raises(UnsafeUrlError, match="Cross-origin"):
        fetch_public_url(
            session,
            "https://8.8.8.8/article",
            timeout=5,
            allow_cross_origin_redirects=False,
        )


def test_declared_oversized_response_is_rejected() -> None:
    response = FakeResponse(
        headers={
            "content-type": "text/html; charset=utf-8",
            "content-length": "2000001",
        }
    )
    session = FakeSession([response])

    with pytest.raises(ResponseTooLargeError):
        fetch_public_url(
            session,
            "https://8.8.8.8/",
            timeout=5,
            accepted_content_types=("text/html",),
        )

    assert response.closed is True
