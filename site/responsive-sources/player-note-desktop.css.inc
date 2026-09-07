
/* Desktop Player title controls stay immediately to the right of the name. */
@media (min-width: 901px) {
  .playerHeroIdentity .playerTitle > .playerTitleName {
    order: 0;
  }

  .playerHeroIdentity .playerTitle > .playerTitleNoteIcon {
    order: 1;
  }

  .playerHeroIdentity .playerTitle > .playerListingBadge {
    order: 2;
  }

  .playerHeroIdentity .playerTitle > .playerTitleNoteIcon:empty {
    display: none;
  }
}
