ALTER TABLE film_characters DROP CONSTRAINT IF EXISTS film_characters_reference_asset_id_fkey;
ALTER TABLE film_characters ADD CONSTRAINT film_characters_reference_asset_id_fkey FOREIGN KEY ("referenceAssetId") REFERENCES media_assets(id) ON DELETE SET NULL NOT VALID;

ALTER TABLE storyboard_shots DROP CONSTRAINT IF EXISTS storyboard_shots_frame_asset_id_fkey;
ALTER TABLE storyboard_shots ADD CONSTRAINT storyboard_shots_frame_asset_id_fkey FOREIGN KEY ("frameAssetId") REFERENCES media_assets(id) ON DELETE SET NULL NOT VALID;

ALTER TABLE storyboard_shots DROP CONSTRAINT IF EXISTS storyboard_shots_clip_asset_id_fkey;
ALTER TABLE storyboard_shots ADD CONSTRAINT storyboard_shots_clip_asset_id_fkey FOREIGN KEY ("clipAssetId") REFERENCES media_assets(id) ON DELETE SET NULL NOT VALID;

ALTER TABLE timeline_items DROP CONSTRAINT IF EXISTS timeline_items_asset_id_fkey;
ALTER TABLE timeline_items ADD CONSTRAINT timeline_items_asset_id_fkey FOREIGN KEY ("assetId") REFERENCES media_assets(id) ON DELETE SET NULL NOT VALID;
