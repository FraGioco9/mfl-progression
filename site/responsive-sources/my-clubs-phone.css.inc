@media (max-width: 640px) {
  .myClubsGrid {
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
  }

  .myClubCard {
    grid-template-columns: 104px minmax(0, 1fr);
    min-height: 128px;
  }

  .myClubLogoFrame {
    padding: 10px;
  }

  .myClubLogo {
    max-width: 82px;
    max-height: 90px;
  }

  .myClubCardBody {
    padding: 12px 13px;
  }

  .myClubName {
    font-size: var(--mfl-section-title-compact-font-size);
  }

  .myClubMeta {
    font-size: var(--mfl-metadata-compact-font-size);
  }

}
