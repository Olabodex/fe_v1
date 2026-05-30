import { useEffect } from "react";
import { CheckCircle, ExternalLink } from "lucide-react";
import { ETHERSCAN_BASE_URL } from "../contracts";
import type { RecentActivity } from "../types";

export function RecentActivityToast({
  activity,
  onDone,
}: {
  activity?: RecentActivity;
  onDone: (id: number) => void;
}) {
  useEffect(() => {
    if (!activity) return;
    const timer = window.setTimeout(() => onDone(activity.id), 4200);
    return () => window.clearTimeout(timer);
  }, [activity, onDone]);

  if (!activity) return null;

  return (
    <div className="recent-activity-toast" role="status" aria-live="polite">
      <CheckCircle size={18} />
      <div>
        <span>Recent activity</span>
        <strong>{activity.title}</strong>
        <small>{activity.message}</small>
      </div>
      {activity.txHash && (
        <a href={`${ETHERSCAN_BASE_URL}/tx/${activity.txHash}`} target="_blank" rel="noreferrer" aria-label="View recent transaction">
          <ExternalLink size={15} />
        </a>
      )}
    </div>
  );
}
