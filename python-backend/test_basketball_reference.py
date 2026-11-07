import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock, patch

from fastapi import HTTPException
import basketball_reference as archive


class ArchiveReaderTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.cache = patch.object(archive, "CACHE_DIR", Path(self.directory.name))
        self.cache.start()
        self.addCleanup(self.cache.stop)
        self.sleep = patch.object(archive.time, "sleep")
        self.sleep.start()
        self.addCleanup(self.sleep.stop)

    def test_caches_valid_html_and_reuses_it_without_network(self):
        response = Mock(text="<html><h1>2026-27 NBA</h1></html>")
        response.content = response.text.encode()
        with patch.object(archive.requests, "get", return_value=response) as get:
            first = archive.read_page("/leagues/NBA_2027.html")
            self.assertEqual(archive.read_page("/leagues/NBA_2027.html"), first)
            get.assert_called_once()
            self.assertEqual(get.call_args.kwargs["impersonate"], "chrome")

    def test_preserves_last_good_archive_after_refresh_failure(self):
        response = Mock(text="<html><h1>Coach</h1></html>")
        response.content = response.text.encode()
        with patch.object(archive.requests, "get", return_value=response):
            expected = archive.read_page("/coaches/kiddja01c.html")
        for filename in Path(self.directory.name).iterdir():
            os.utime(filename, (0, 0))
        with patch.object(archive.requests, "get", side_effect=RuntimeError("403")):
            self.assertEqual(archive.read_page("/coaches/kiddja01c.html"), expected)

    def test_challenge_is_not_saved_as_archive(self):
        response = Mock(text="<html>Just a moment</html>")
        response.content = response.text.encode()
        with patch.object(archive.requests, "get", return_value=response):
            with self.assertRaises(HTTPException) as error:
                archive.read_page("/teams/HOU/2027.html")
        self.assertEqual(error.exception.status_code, 503)
        self.assertEqual(list(Path(self.directory.name).iterdir()), [])

    def test_rejects_external_urls_and_traversal_before_network(self):
        with patch.object(archive.requests, "get") as get:
            for path in ["https://example.com/", "/teams/../secret", "//example.com", "/leagues/NBA_2027.html?x=1"]:
                with self.assertRaises(HTTPException) as error:
                    archive.read_page(path)
                self.assertEqual(error.exception.status_code, 400)
            get.assert_not_called()


if __name__ == "__main__":
    unittest.main()
