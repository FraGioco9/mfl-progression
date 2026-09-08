const { getGeneratedAt, queryRows, tableExists } = require("./_database");
const { normalizeWalletAddress } = require("./_data-auth");

const CLUB_LOGO_BASE_URL = "https://d13e14gtps4iwl.cloudfront.net/u/clubs";

function clubLogoUrl(clubId, logoVersion) {
  const id = String(clubId || "").trim();
  if (!id) return "";
  const version = String(logoVersion || "").trim();
  return `${CLUB_LOGO_BASE_URL}/${encodeURIComponent(id)}/logo.webp${version ? `?v=${encodeURIComponent(version)}` : ""}`;
}

function myClubsData(signedWallet) {
  const walletAddress = normalizeWalletAddress(signedWallet).toLowerCase();
  if (!walletAddress || !tableExists("runtime_clubs")) {
    return { clubs: [], generatedAt: getGeneratedAt(), source: "sqlite-runtime" };
  }

  const runtimeClubColumns = new Set(
    queryRows("PRAGMA table_info(runtime_clubs)").map((column) => String(column.name || "")),
  );
  const citySelect = runtimeClubColumns.has("city") ? "city" : "'' AS city";
  const nationSelect = runtimeClubColumns.has("country") ? "country AS nation" : "'' AS nation";

  const rows = queryRows(
    `SELECT
       club_id AS clubId,
       name,
       ${citySelect},
       ${nationSelect},
       division,
       logo_version AS logoVersion
     FROM runtime_clubs
     WHERE lower(owner_wallet_address) = ?
     ORDER BY
       CASE WHEN division BETWEEN 1 AND 10 THEN division ELSE 999 END,
       name,
       club_id`,
    [walletAddress],
  );

  return {
    clubs: rows.map((club) => ({
      ...club,
      logoUrl: clubLogoUrl(club.clubId, club.logoVersion),
    })),
    generatedAt: getGeneratedAt(),
    source: "sqlite-runtime",
  };
}

module.exports = {
  CLUB_LOGO_BASE_URL,
  clubLogoUrl,
  myClubsData,
};
