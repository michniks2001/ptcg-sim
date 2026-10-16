export class Rules {

  public setupCoinAfterSelection = false;

  public unlimitedRetreat = false;

  public historicalConfusion = false;

  // Ask for each paid retreat and validate Energy in the chosen discard order.
  public historicalRetreatPayment = false;

  public mulliganDrawMultiplier = 1;

  public firstTurnDrawCard = true;

  public firstTurnUseSupporter = true;
  public firstTurnUseTrainer = true;
  public unlimitedStadium = false;
  public replaceSameNameStadium = false;
  public legacyBurn = false;
  public pre2002PowerConditions = false;

  public attackFirstTurn = false;

  // If true, supporters remain in the play zone until end-turn cleanup.
  public supporterCleanupAtEndTurn = false;

  public unlimitedEnergyAttachments = false;

  public alternativeSetup = false;

  constructor(init: Partial<Rules> = {}) {
    Object.assign(this, init);
  }

}
