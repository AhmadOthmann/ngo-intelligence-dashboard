from __future__ import annotations

import ipaddress
import os
import socket
from dataclasses import dataclass
from typing import Iterable
from urllib.parse import urldefrag, urljoin, urlparse

import requests


DEFAULT_MAX_RESPONSE_BYTES = 2_000_000
DEFAULT_MAX_REDIRECTS = 5
REDIRECT_STATUSES = {301, 302, 303, 307, 308}


class UnsafeUrlError(ValueError):
    pass


class ResponseTooLargeError(RuntimeError):
    pass


class UnsupportedContentTypeError(RuntimeError):
    pass


@dataclass(frozen=True)
class PublicHttpResponse:
    url: str
    content: bytes
    content_type: str
    encoding: str

    @property
    def text(self) -> str:
        return self.content.decode(self.encoding, errors="replace")


def configured_source_domains() -> tuple[str, ...]:
    raw = os.environ.get("SOURCE_DOMAIN_ALLOWLIST", "")
    return _normalize_allowed_domains(raw.split(","))


def validate_public_url(
    url: str,
    *,
    allowed_domains: Iterable[str] | None = None,
    require_allowlist_in_production: bool = True,
) -> str:
    normalized = normalize_http_url(url)
    parsed = urlparse(normalized)
    port = parsed.port
    hostname = _ascii_hostname(parsed.hostname or "")

    domains = (
        _normalize_allowed_domains(allowed_domains)
        if allowed_domains is not None
        else configured_source_domains()
    )
    if (
        require_allowlist_in_production
        and os.environ.get("APP_ENV", "development").strip().lower()
        in {"prod", "production"}
        and not domains
    ):
        raise UnsafeUrlError("SOURCE_DOMAIN_ALLOWLIST is required in production")
    if domains and hostname not in domains:
        raise UnsafeUrlError("URL hostname is not in SOURCE_DOMAIN_ALLOWLIST")

    _assert_public_host(hostname, port or (443 if parsed.scheme == "https" else 80))
    return normalized


def normalize_http_url(url: str) -> str:
    normalized, _fragment = urldefrag((url or "").strip())
    if len(normalized) > 2_048:
        raise UnsafeUrlError("URL exceeds the 2048-character limit")
    if "\\" in normalized or any(
        ord(character) < 32 or ord(character) == 127 for character in normalized
    ):
        raise UnsafeUrlError("URL contains unsafe characters")
    try:
        parsed = urlparse(normalized)
        port = parsed.port
    except ValueError as exc:
        raise UnsafeUrlError("URL contains an invalid port") from exc

    if parsed.scheme not in {"http", "https"}:
        raise UnsafeUrlError("Only HTTP and HTTPS URLs are allowed")
    if not parsed.hostname:
        raise UnsafeUrlError("URL must include a hostname")
    if parsed.username is not None or parsed.password is not None:
        raise UnsafeUrlError("URLs containing credentials are not allowed")
    if port is not None and port not in {80, 443}:
        raise UnsafeUrlError("Only ports 80 and 443 are allowed")

    hostname = _ascii_hostname(parsed.hostname)
    if hostname == "localhost" or hostname.endswith((".localhost", ".local")):
        raise UnsafeUrlError("Local hostnames are not allowed")

    try:
        literal = ipaddress.ip_address(hostname.split("%", 1)[0])
    except ValueError:
        pass
    else:
        _assert_safe_public_ip(literal)
    return normalized


def _ascii_hostname(hostname: str) -> str:
    try:
        return hostname.encode("idna").decode("ascii").lower().rstrip(".")
    except UnicodeError as exc:
        raise UnsafeUrlError("URL hostname is invalid") from exc


def _normalize_allowed_domains(domains: Iterable[str]) -> tuple[str, ...]:
    normalized: list[str] = []
    for domain in domains:
        candidate = domain.strip().lstrip(".").rstrip(".")
        if not candidate:
            continue
        hostname = _ascii_hostname(candidate)
        if hostname not in normalized:
            normalized.append(hostname)
    return tuple(normalized)


def _assert_public_host(hostname: str, port: int) -> None:
    try:
        literal = ipaddress.ip_address(hostname.split("%", 1)[0])
    except ValueError:
        try:
            addresses = {
                entry[4][0].split("%", 1)[0]
                for entry in socket.getaddrinfo(hostname, port, type=socket.SOCK_STREAM)
            }
        except socket.gaierror as exc:
            raise UnsafeUrlError("URL hostname could not be resolved") from exc
        if not addresses:
            raise UnsafeUrlError("URL hostname did not resolve to an address")
    else:
        addresses = {str(literal)}

    for address in addresses:
        try:
            ip = ipaddress.ip_address(address)
        except ValueError as exc:
            raise UnsafeUrlError("URL resolved to an invalid address") from exc
        _assert_safe_public_ip(ip)


def _assert_safe_public_ip(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> None:
    if (
        not ip.is_global
        or ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
    ):
        raise UnsafeUrlError("URL resolves to a non-public network address")


def fetch_public_url(
    session: requests.Session,
    url: str,
    *,
    timeout: int | tuple[int, int],
    max_bytes: int = DEFAULT_MAX_RESPONSE_BYTES,
    accepted_content_types: Iterable[str] | None = None,
    max_redirects: int = DEFAULT_MAX_REDIRECTS,
    allow_cross_origin_redirects: bool = True,
) -> PublicHttpResponse:
    current_url = validate_public_url(url)
    accepted = tuple(value.lower() for value in (accepted_content_types or ()))

    for redirect_count in range(max_redirects + 1):
        response = session.get(
            current_url,
            timeout=timeout,
            allow_redirects=False,
            stream=True,
        )
        try:
            if response.status_code in REDIRECT_STATUSES:
                if redirect_count >= max_redirects:
                    raise UnsafeUrlError("Maximum redirect count exceeded")
                location = response.headers.get("location")
                if not location:
                    raise UnsafeUrlError("Redirect response did not include a location")
                next_url = validate_public_url(urljoin(current_url, location))
                if (
                    urlparse(current_url).scheme == "https"
                    and urlparse(next_url).scheme == "http"
                ):
                    raise UnsafeUrlError("HTTPS redirects may not downgrade to HTTP")
                if (
                    not allow_cross_origin_redirects
                    and _url_origin(current_url) != _url_origin(next_url)
                ):
                    raise UnsafeUrlError("Cross-origin redirects are not allowed")
                current_url = next_url
                continue

            response.raise_for_status()
            content_type = response.headers.get("content-type", "").lower()
            if accepted and not any(value in content_type for value in accepted):
                raise UnsupportedContentTypeError(
                    f"Unsupported response content type: {content_type or 'unknown'}"
                )

            content_length = response.headers.get("content-length")
            if content_length:
                try:
                    declared_size = int(content_length)
                except ValueError:
                    declared_size = 0
                if declared_size > max_bytes:
                    raise ResponseTooLargeError(
                        f"Response exceeds the {max_bytes}-byte limit"
                    )

            chunks: list[bytes] = []
            total = 0
            for chunk in response.iter_content(chunk_size=65_536):
                if not chunk:
                    continue
                total += len(chunk)
                if total > max_bytes:
                    raise ResponseTooLargeError(
                        f"Response exceeds the {max_bytes}-byte limit"
                    )
                chunks.append(chunk)

            encoding = requests.utils.get_encoding_from_headers(response.headers) or "utf-8"
            return PublicHttpResponse(
                url=current_url,
                content=b"".join(chunks),
                content_type=content_type,
                encoding=encoding,
            )
        finally:
            response.close()

    raise UnsafeUrlError("Maximum redirect count exceeded")


def _url_origin(url: str) -> tuple[str, str, int]:
    parsed = urlparse(url)
    return (
        parsed.scheme,
        _ascii_hostname(parsed.hostname or ""),
        parsed.port or (443 if parsed.scheme == "https" else 80),
    )
