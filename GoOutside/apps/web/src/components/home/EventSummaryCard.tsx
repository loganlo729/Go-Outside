
import styles from "./EventSummaryCard.module.css";

type EventSummaryCardProps = {
  title: string;
  count: number;
  description: string;
  icon: string;
};

export default function EventSummaryCard({
  title,
  count,
  description,
  icon,
}: EventSummaryCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.icon}>{icon}</span>
        <h2>{title}</h2>
      </div>

      <div className={styles.count}>{count}</div>
      <p className={styles.description}>{description}</p>
    </div>
  );
}
