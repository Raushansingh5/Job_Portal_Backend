export function slugifyTitle(title) {
  return title
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // remove non-alphanumeric except spaces & hyphen
    .replace(/\s+/g, "-") // spaces -> hyphens
    .replace(/-+/g, "-") // collapse multiple hyphens
    .replace(/^-|-$/g, ""); // trim leading/trailing hyphen
}


export async function generateUniqueSlug(Model, title) {
  const base = slugifyTitle(title) || "post";
  let slug = base;
  let i = 0;

  while (true) {
    // exists returns a doc or null depending on mongoose version; using countDocuments is safe but slower
    const exists = await Model.exists({ slug });
    if (!exists) return slug;
    i += 1;
    slug = `${base}-${i}`;
    if (i > 1000) throw new Error("Unable to generate unique slug");
  }
}

export default { slugifyTitle, generateUniqueSlug };
