@media (max-width: 640px) {
  .myClubsGrid {
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
  }

  .myClubCard {
    grid-template-columns: 88px minmax(0, 1fr);
    min-height: 120px;
  }

  .myClubLogoFrame {
    padding: 11px;
  }

  .myClubLogo {
    max-width: 64px;
    max-height: 70px;
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
