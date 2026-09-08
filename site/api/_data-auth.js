const { performance } = require("node:perf_hooks");
const {
  normalizeWalletAddress,
  signedWalletFromRequest: verifySignedWalletFromRequest,
} = require("./_wallet-proof");
const { supabaseConfig, supabaseRequest } = require("./_supabase");

const WALLET_PERMISSION_CACHE = new Map();
const WALLET_PERMISSION_CACHE_TTL_MS = 60_000;

async function walletAllowed(wallet) {
  const normalizedWallet = normalizeWalletAddress(wallet);
  const cached = WALLET_PERMISSION_CACHE.get(normalizedWallet);
  if (cached?.expiresAt > Date.now()) return cached.allowed;
  if (!supabaseConfig()) return false;

  let rows;
  try {
    rows = await supabaseRequest(
      `wallet_permissions?select=wallet_address&wallet_address=eq.${encodeURIComponent(normalizedWallet)}&can_view_progression=eq.true&limit=1`,
      {
        cache: "no-store",
        headers: { Accept: "application/json" },
      },
    );
  } catch (error) {
    console.warn("Could not check wallet permissions.", error);
    return false;
  }

  const allowed = Array.isArray(rows) && rows.length > 0;
  WALLET_PERMISSION_CACHE.set(normalizedWallet, {
    allowed,
    expiresAt: Date.now() + WALLET_PERMISSION_CACHE_TTL_MS,
  });
  return allowed;
}

async function signedWalletFromRequest(request) {
  return verifySignedWalletFromRequest(request, {
    allowAccountProofFallback: true,
  });
}

function serverTimingHeader(startedAt, timings = {}) {
  const metrics = [];
  Object.entries(timings || {}).forEach(([name, duration]) => {
    const normalizedName = String(name || "").replace(/[^a-zA-Z0-9_-]/g, "");
    const numericDuration = Number(duration);
    if (!normalizedName || !Number.isFinite(numericDuration) || numericDuration < 0) return;
    metrics.push(`${normalizedName};dur=${numericDuration.toFixed(1)}`);
  });
  metrics.push(`total;dur=${Math.max(0, performance.now() - startedAt).toFixed(1)}`);
  return metrics.join(", ");
}

function sendJson(response, status, data, startedAt, timings = {}) {
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "private, no-store, no-cache, must-revalidate, max-age=0");
  response.setHeader("CDN-Cache-Control", "no-store, max-age=0");
  response.setHeader("Vercel-CDN-Cache-Control", "no-store, max-age=0");
  response.setHeader("Server-Timing", serverTimingHeader(startedAt, timings));
  response.status(status).json(data);
}

module.exports = {
  normalizeWalletAddress,
  walletAllowed,
  signedWalletFromRequest,
  serverTimingHeader,
  sendJson,
};
