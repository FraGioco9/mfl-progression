@media (max-width: 900px) {
  .myClubsGrid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .myClubCard {
    grid-template-columns: 96px minmax(0, 1fr);
    min-height: 120px;
  }

  .myClubLogoFrame {
    padding: 9px;
  }

  .myClubLogo {
    max-width: 76px;
    max-height: 84px;
  }

  .myClubCardBody {
    padding: 11px 12px;
  }

  .myClubFacts {
    gap: 8px;
    margin-top: 10px;
    padding-top: 9px;
  }
}
