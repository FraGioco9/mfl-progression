
/* Desktop Player title controls align to the existing Player-name line without changing its geometry. */
@media (min-width: 901px) {
  .playerHeroIdentity .playerTitle {
    flex-wrap: nowrap;
  }

  .playerHeroIdentity .playerTitle > .playerTitleName {
    order: 0;
  }

  .playerHeroIdentity .playerTitle > .playerTitleNoteIcon {
    position: static;
    order: 1;
    display: grid;
    place-items: center;
    flex: 0 0 22px;
    align-self: center;
    width: 22px;
    min-width: 22px;
    max-width: 22px;
    height: 22px;
    min-height: 22px;
    max-height: 22px;
    margin: 0;
    padding: 0;
    line-height: 0;
  }

  .playerHeroIdentity .playerTitle > .playerTitleNoteIcon:empty {
    display: none;
  }

  .playerHeroIdentity .playerTitle > .playerTitleNoteIcon > .playerNoteIcon {
    position: relative;
    display: grid;
    place-items: center;
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
    margin: 0;
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
    display: inline-flex;
    align-items: center;
    align-self: center;
    height: 22px;
    min-height: 22px;
    max-height: 22px;
    margin: 0;
    line-height: 1;
  }

  .playerHeroIdentity .playerTitle > .playerListingBadge .listingCellIcon {
    display: block;
    margin: 0;
  }

  .playerHeroIdentity .playerTitle > .playerListingBadge .listingCellPrice {
    line-height: 1;
  }

  .playerNotesInput {
    min-height: 150px;
  }
}
