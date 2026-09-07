
  /* Player title note/listing placement inside the canonical <=900px cascade. */
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
    line-height: 14px;
  }

  .playerHeroIdentity .playerTitle:has(> .playerListingBadge) > .playerTitleNoteIcon:not(:empty) {
    right: calc(var(--mfl-player-panel-padding) + 22px);
  }

