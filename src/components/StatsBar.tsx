import { useApp } from "../AppContext";
import { eth, phaseLabels } from "../utils";

export function StatsBar() {
  const { stats } = useApp();

  return (
    <div className="stats-row">
      <div>
        <span>Active Phase</span>
        <strong><i className="phase-dot" />{stats ? phaseLabels[stats.activePhase] : "..."}</strong>
      </div>
      <div>
        <span>Worlds Minted</span>
        <strong>{stats ? `${stats.totalMinted}/${stats.maxSupply}` : "..."}</strong>
      </div>
      <div>
        <span>Pass Claims</span>
        <strong>{stats ? `${stats.initialPassMinted}/${stats.initialPassSupply}` : "..."}</strong>
      </div>
      <div className={stats?.rewardPoolFunded === 0n ? "dimmed" : ""}>
        <span>Reward Pool</span>
        <strong>{stats ? eth(stats.rewardPoolFunded) : "..."}</strong>
      </div>
    </div>
  );
}
