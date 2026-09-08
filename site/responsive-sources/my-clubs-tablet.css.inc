@media (max-width: 900px) {
  .myClubsGrid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .myClubCard {
    grid-template-columns: 82px minmax(0, 1fr);
    min-height: 108px;
  }

  .myClubLogoFrame {
    padding: 10px;
  }

  .myClubLogo {
    max-width: 58px;
    max-height: 66px;
  }

  .myClubLogoPlaceholder {
    width: 52px;
    height: 52px;
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
