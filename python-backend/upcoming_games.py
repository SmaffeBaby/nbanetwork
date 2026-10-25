"""Select a small rolling set of games, independent of Moscow midnight."""
from datetime import datetime, timedelta, timezone


def select_upcoming_games(games, now=None, limit=6):
    now = now or datetime.now(timezone.utc)
    selected = {}
    for game in games:
        status = str(game.get('GAME_STATUS', '')).lower()
        status_id = str(game.get('GAME_STATUS_ID', ''))
        if status_id == '3' or any(word in status for word in ('final', 'cancel', 'postpon', 'ppd')):
            continue
        try:
            start = datetime.fromisoformat(str(game.get('GAME_TIME_UTC', '')).replace('Z', '+00:00'))
            if start.tzinfo is None:
                start = start.replace(tzinfo=timezone.utc)
        except ValueError:
            continue
        # Retain overnight games after midnight, including a delayed tip-off.
        if start < now - timedelta(days=1):
            continue
        game_id = str(game.get('GAME_ID', ''))
        if game_id:
            selected[game_id] = (status_id == '2', start, game)
    return [item[2] for item in sorted(selected.values(), key=lambda item: (not item[0], item[1], str(item[2]['GAME_ID'])))[:limit]]
