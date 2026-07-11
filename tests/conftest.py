import os
import shutil
import tempfile
from pathlib import Path

from pytest import Config


_TEST_DIRECTORY: Path | None = None


def pytest_configure(config: Config) -> None:
    del config
    global _TEST_DIRECTORY
    _TEST_DIRECTORY = Path(tempfile.mkdtemp(prefix="impact-atlas-tests-"))
    os.environ["AI_PROVIDER"] = "none"
    os.environ["DATABASE_PATH"] = str(_TEST_DIRECTORY / "items.db")


def pytest_unconfigure(config: Config) -> None:
    del config
    if _TEST_DIRECTORY is not None:
        shutil.rmtree(_TEST_DIRECTORY, ignore_errors=True)
