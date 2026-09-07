
  /* Mobile Player Note shares the Listing corner geometry and exact 14px icon scale. */
  .playerHeroIdentity .playerTitle > .playerTitleNoteIcon:empty {
    display: none;
  }

  .playerHeroIdentity .playerTitle > .playerTitleNoteIcon:not(:empty) {
    position: absolute;
    top: var(--mfl-player-panel-padding);
    right: var(--mfl-player-panel-padding);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    min-width: 14px;
    max-width: 14px;
    height: 14px;
    min-height: 14px;
    max-height: 14px;
    margin: 0;
    padding: 0;
    overflow: visible;
    line-height: 14px;
  }

  .playerHeroIdentity .playerTitle:has(> .playerListingBadge) > .playerTitleNoteIcon:not(:empty) {
    right: calc(var(--mfl-player-panel-padding) + 22px);
  }

  .playerHeroIdentity .playerTitle > .playerTitleNoteIcon > .playerNoteIcon {
    position: relative;
    display: inline-flex;
    flex: 0 0 14px;
    align-items: center;
    justify-content: center;
    width: 14px;
    min-width: 14px;
    max-width: 14px;
    height: 14px;
    min-height: 14px;
    max-height: 14px;
    margin: 0;
    padding: 0;
    overflow: visible;
    color: var(--text-soft);
    font-size: 0;
    line-height: 0;
  }

  .playerHeroIdentity .playerTitle > .playerTitleNoteIcon > .playerNoteIcon > .playerNoteIconSvg {
    display: block;
    flex: 0 0 14px;
    width: 14px;
    min-width: 14px;
    max-width: 14px;
    height: 14px;
    min-height: 14px;
    max-height: 14px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .playerHeroIdentity .playerTitle > .playerTitleNoteIcon > .playerNoteIcon[data-tooltip]::after {
    font-size: 12px;
    line-height: 1.35;
  }

