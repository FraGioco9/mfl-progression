
  /* Mobile Player Note shares the Listing corner geometry and uses a compact line icon. */
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
    color: var(--text-soft);
    font-size: 0;
    line-height: 0;
  }

  .playerHeroIdentity .playerTitle > .playerTitleNoteIcon > .playerNoteIcon::before {
    content: "";
    display: block;
    width: 14px;
    height: 14px;
    background: currentColor;
    -webkit-mask: url("/player-note.svg") center / 14px 14px no-repeat;
    mask: url("/player-note.svg") center / 14px 14px no-repeat;
  }

  .playerHeroIdentity .playerTitle > .playerTitleNoteIcon > .playerNoteIcon[data-tooltip]::after {
    font-size: 12px;
    line-height: 1.35;
  }

