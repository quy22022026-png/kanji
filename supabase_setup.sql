-- ============================================================================
-- Kawaii JLPT - Supabase Database Setup Script
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.jlpt_words (
    id TEXT PRIMARY KEY,
    level TEXT NOT NULL CHECK (level IN ('N5', 'N4', 'N3', 'N2', 'N1')),
    topic TEXT DEFAULT 'Chung',
    kanji TEXT NOT NULL,
    furigana TEXT NOT NULL,
    romaji TEXT DEFAULT '',
    meaning TEXT NOT NULL,
    han_viet TEXT DEFAULT '',
    example JSONB DEFAULT NULL,
    related_ids TEXT[] DEFAULT '{}',
    audio_url TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jlpt_words_level ON public.jlpt_words (level);
CREATE INDEX IF NOT EXISTS idx_jlpt_words_topic ON public.jlpt_words (topic);
CREATE INDEX IF NOT EXISTS idx_jlpt_words_kanji ON public.jlpt_words (kanji);

CREATE TABLE IF NOT EXISTS public.jlpt_user_progress (
    user_key TEXT PRIMARY KEY,
    mastered_ids TEXT[] DEFAULT '{}',
    streak INTEGER NOT NULL DEFAULT 0,
    best_streak INTEGER NOT NULL DEFAULT 0,
    total_pairs_matched INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_jlpt_words_updated ON public.jlpt_words;
CREATE TRIGGER trg_jlpt_words_updated
    BEFORE UPDATE ON public.jlpt_words
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_jlpt_progress_updated ON public.jlpt_user_progress;
CREATE TRIGGER trg_jlpt_progress_updated
    BEFORE UPDATE ON public.jlpt_user_progress
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.jlpt_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jlpt_user_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read jlpt_words" ON public.jlpt_words;
CREATE POLICY "Allow public read jlpt_words" ON public.jlpt_words FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public write jlpt_words" ON public.jlpt_words;
CREATE POLICY "Allow public write jlpt_words" ON public.jlpt_words FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access jlpt_user_progress" ON public.jlpt_user_progress;
CREATE POLICY "Allow public access jlpt_user_progress" ON public.jlpt_user_progress FOR ALL USING (true) WITH CHECK (true);
