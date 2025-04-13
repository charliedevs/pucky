/**
 * Configuration for debug behavior and overlays.
 * Use this to toggle hitboxes, labels, debug overlays, etc.
 */
class DebugConfig {
  private showAllHitboxes = false;
  //private showPlayerHitbox = false;
  //private showSolidHitboxes = false;
  private showLabels = true;

  /** Toggle global hitbox visibility */
  public toggleHitboxes() {
    this.showAllHitboxes = !this.showAllHitboxes;
  }

  /** Whether to show labels (only applies if hitboxes are shown) */
  public getShowLabels() {
    return this.showAllHitboxes && this.showLabels;
  }

  /** Set hitbox label visibility */
  public setShowLabels(value: boolean) {
    this.showLabels = value;
  }

  /** Whether to show hitboxes */
  public getShowHitboxes() {
    return this.showAllHitboxes;
  }
}

/** Shared instance for debug config flags */
export const debugConfig = new DebugConfig();
