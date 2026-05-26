module.exports = function handler(request, response) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

  response.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=3600");
  response.status(200).json({
    ready: Boolean(url && anonKey),
    url,
    anonKey,
  });
};
