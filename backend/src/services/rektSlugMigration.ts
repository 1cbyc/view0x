import { Op } from "sequelize";
import { RektIncident } from "../models/RektIncident";
import { logger } from "../utils/logger";
import {
  DEFILLAMA_SLUG_PREFIX,
  stripDefillamaSlugPrefix,
} from "./rektSlug";

/** Rename `defillama-*` slugs and drop the defillama tag from imported rows. */
export async function migrateRektDefillamaSlugs(): Promise<number> {
  const rows = await RektIncident.findAll({
    where: { slug: { [Op.like]: `${DEFILLAMA_SLUG_PREFIX}%` } },
    attributes: ["id", "slug", "tags"],
  });

  let updated = 0;
  for (const row of rows) {
    const nextSlug = stripDefillamaSlugPrefix(row.slug);
    if (!nextSlug || nextSlug === row.slug) continue;

    const conflict = await RektIncident.findOne({
      where: { slug: nextSlug, id: { [Op.ne]: row.id } },
    });
    const finalSlug = conflict ? `${nextSlug}-${row.id}` : nextSlug;

    const tags = (row.tags || []).filter(
      (tag) => tag.toLowerCase() !== "defillama",
    );

    await row.update({ slug: finalSlug, tags });
    updated += 1;
  }

  if (updated > 0) {
    logger.info(`[REKT] Migrated ${updated} incident slugs off defillama- prefix`);
  }
  return updated;
}
