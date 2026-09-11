ALTER TABLE generation_runs DROP CONSTRAINT IF EXISTS generation_runs_user_id_fkey;
ALTER TABLE generation_runs ADD CONSTRAINT generation_runs_user_id_fkey FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE film_bibles DROP CONSTRAINT IF EXISTS film_bibles_user_id_fkey;
ALTER TABLE film_bibles ADD CONSTRAINT film_bibles_user_id_fkey FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE film_characters DROP CONSTRAINT IF EXISTS film_characters_user_id_fkey;
ALTER TABLE film_characters ADD CONSTRAINT film_characters_user_id_fkey FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE storyboard_shots DROP CONSTRAINT IF EXISTS storyboard_shots_user_id_fkey;
ALTER TABLE storyboard_shots ADD CONSTRAINT storyboard_shots_user_id_fkey FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE timeline_items DROP CONSTRAINT IF EXISTS timeline_items_user_id_fkey;
ALTER TABLE timeline_items ADD CONSTRAINT timeline_items_user_id_fkey FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE NOT VALID;
