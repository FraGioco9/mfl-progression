
/* Desktop Player title controls stay immediately to the right of the name. */
@media (min-width: 901px) {
  .playerHeroIdentity .playerTitle {
    display: flex;
    align-items: center;
  }

  .playerHeroIdentity .playerTitle > .playerTitleName {
    order: 0;
  }

  .playerHeroIdentity .playerTitle > .playerTitleNoteIcon {
    order: 1;
    margin-left: 0;
  }

  .playerHeroIdentity .playerTitle > .playerListingBadge {
    order: 2;
    margin-left: 0;
  }

  .playerHeroIdentity .playerTitle > .playerTitleNoteIcon:empty {
    display: none;
  }
}
