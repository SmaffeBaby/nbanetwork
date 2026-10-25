BEGIN;
CREATE TABLE IF NOT EXISTS public.nba_team_contract_seasons (
    team_abbr text NOT NULL CHECK (team_abbr ~ '^[A-Z]{3}$'),
    season text NOT NULL CHECK (season ~ '^[0-9]{4}-[0-9]{2}$'),
    source_url text NOT NULL CHECK (source_url ~ '^https://(eu\.|www\.)?hoopshype\.com/'),
    source_season text NOT NULL,
    payload jsonb NOT NULL CHECK (jsonb_typeof(payload->'players') = 'array' AND jsonb_array_length(payload->'players') > 0),
    fetched_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (team_abbr, season)
);
ALTER TABLE public.nba_team_contract_seasons ENABLE ROW LEVEL SECURITY;
-- Only the application service role imports data; browser reads go through the API.
GRANT ALL ON public.nba_team_contract_seasons TO service_role;
CREATE INDEX IF NOT EXISTS nba_contracts_fetched_at_idx ON public.nba_team_contract_seasons (fetched_at);
NOTIFY pgrst, 'reload schema';
COMMIT;
