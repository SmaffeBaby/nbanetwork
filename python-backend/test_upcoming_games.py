import unittest
from datetime import datetime, timezone
from upcoming_games import select_upcoming_games


def game(id, start, status=1, text='Scheduled'):
    return {'GAME_ID': id, 'GAME_TIME_UTC': start, 'GAME_STATUS_ID': status, 'GAME_STATUS': text}


class UpcomingGamesTests(unittest.TestCase):
    def test_moscow_midnight_does_not_drop_overnight_game(self):
        night = game('night', '2026-10-25T21:00:00Z')  # 00:00 Moscow
        before = datetime.fromisoformat('2026-10-25T20:59:00+00:00')
        after = datetime.fromisoformat('2026-10-25T21:01:00+00:00')
        self.assertEqual(select_upcoming_games([night], before), [night])
        self.assertEqual(select_upcoming_games([night], after), [night])
        night['GAME_STATUS_ID'] = 2
        self.assertEqual(select_upcoming_games([night], after), [night])
        night['GAME_STATUS_ID'] = 3
        self.assertEqual(select_upcoming_games([night], after), [])

    def test_live_first_and_limit_with_long_schedule_gap(self):
        now = datetime(2026, 7, 1, tzinfo=timezone.utc)
        games = [game(str(i), f'2026-10-{i:02d}T20:00:00Z') for i in range(1, 20)]
        live = game('live', '2026-07-01T00:00:00Z', 2, 'Q1')
        selected = select_upcoming_games(games + [live], now)
        self.assertEqual(len(selected), 6)
        self.assertEqual([g['GAME_ID'] for g in selected], ['live', '1', '2', '3', '4', '5'])

    def test_final_postponed_stale_invalid_and_duplicates(self):
        now = datetime(2026, 10, 25, tzinfo=timezone.utc)
        games = [game('final', '2026-10-25T00:00:00Z', 1, 'Final/OT'),
                 game('postponed', '2026-10-26T00:00:00Z', 1, 'Postponed'),
                 game('stale', '2026-10-20T00:00:00Z', 1),
                 game('invalid', 'TBD'), game('one', '2026-10-26T00:00:00Z')]
        games.append(games[-1])
        self.assertEqual([g['GAME_ID'] for g in select_upcoming_games(games, now)], ['one'])

if __name__ == '__main__':
    unittest.main()
