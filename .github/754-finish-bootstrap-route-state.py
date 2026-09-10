from pathlib import Path

path = Path("site/bootstrap.js")
text = path.read_text(encoding="utf-8").replace("\r\n", "\n").replace("\r", "\n")

old_agent = '''    const parts = routeParts(urlLike);
    if (page === "agents") {
      const wallet = String(parts[1] || "").trim();
      try {
        const decodedWallet = wallet ? decodeURIComponent(wallet) : "";
        if (!decodedWallet) return "Agents";
        const normalizedWallet = normalizeWalletAddress(decodedWallet).toLowerCase();
        const agentName = firstPaintAgentNameForWallet(normalizedWallet);
        return agentName ? `${agentName} - ${normalizedWallet}` : normalizedWallet;
      } catch {
        const normalizedWallet = normalizeWalletAddress(wallet).toLowerCase();
        if (!normalizedWallet) return "Agents";
        const agentName = firstPaintAgentNameForWallet(normalizedWallet);
        return agentName ? `${agentName} - ${normalizedWallet}` : normalizedWallet;
      }
    }
'''
new_agent = '''    if (page === "agents") {
      const request = canonicalBootstrapRequest(urlLike);
      const normalizedWallet = normalizeWalletAddress(request?.pageName === "agents" ? request.options?.walletAddress : "").toLowerCase();
      if (!normalizedWallet) return "Agents";
      const agentName = firstPaintAgentNameForWallet(normalizedWallet);
      return agentName ? `${agentName} - ${normalizedWallet}` : normalizedWallet;
    }
'''
if text.count(old_agent) != 1:
    raise RuntimeError(f"Expected one Agent route-title parser, found {text.count(old_agent)}")
text = text.replace(old_agent, new_agent, 1)
text = text.replace('    const config = tableViewConfig()[page];\n', '    const config = APP_CONFIG.routes.tableViews[page];\n', 1)
text = text.replace('    const normalizedPage = String(page || "").toLowerCase();\n', '    const normalizedPage = APP_CONFIG.routes.normalizePageName(page);\n', 1)
text = text.replace('    const config = tableViewConfig()[normalizedPage];\n', '    const config = APP_CONFIG.routes.tableViews[normalizedPage];\n', 1)
for retired in ["routeParts(", "tableViewConfig()"]:
    if retired in text:
        raise RuntimeError(f"Retired Bootstrap route helper still used: {retired}")
path.write_text(text, encoding="utf-8", newline="\n")
