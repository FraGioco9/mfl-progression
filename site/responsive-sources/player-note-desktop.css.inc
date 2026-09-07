
/* Desktop Player title controls share one inline slot immediately to the right of the name. */
@media (min-width: 901px) {
  .playerHeroIdentity .playerTitle {
    display: flex;
    align-items: center;
    flex-wrap: nowrap;
    gap: 8px;
  }

  .playerHeroIdentity .playerTitle > .playerTitleName {
    order: 0;
  }

  .playerHeroIdentity .playerTitle > .playerTitleNoteIcon {
    position: static;
    order: 1;
    display: inline-flex;
    flex: 0 0 18px;
    align-items: center;
    justify-content: center;
    width: 18px;
    min-width: 18px;
    max-width: 18px;
    height: 18px;
    min-height: 18px;
    max-height: 18px;
    margin: 0;
    padding: 0;
    line-height: 18px;
  }

  .playerHeroIdentity .playerTitle > .playerTitleNoteIcon:empty {
    display: none;
  }

  .playerHeroIdentity .playerTitle > .playerTitleNoteIcon > .playerNoteIcon {
    position: relative;
    display: inline-flex;
    flex: 0 0 18px;
    align-items: center;
    justify-content: center;
    width: 18px;
    min-width: 18px;
    max-width: 18px;
    height: 18px;
    min-height: 18px;
    max-height: 18px;
    margin: 0;
    padding: 0;
    overflow: visible;
    color: var(--text-soft);
    font-size: 0;
    line-height: 0;
  }

  .playerHeroIdentity .playerTitle > .playerTitleNoteIcon > .playerNoteIcon > .playerNoteIconSvg {
    display: block;
    flex: 0 0 18px;
    width: 18px;
    min-width: 18px;
    max-width: 18px;
    height: 18px;
    min-height: 18px;
    max-height: 18px;
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

  .playerHeroIdentity .playerTitle > .playerListingBadge {
    position: static;
    top: auto;
    right: auto;
    order: 2;
    align-self: center;
    margin-left: 0;
  }
}
