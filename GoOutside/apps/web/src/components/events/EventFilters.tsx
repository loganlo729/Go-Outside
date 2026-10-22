
import type {
  CategoryRecord,
  DateFilter,
} from "../../types/event";

import styles from "./EventDashboard.module.css";

export default function EventFilters({
  categories,
  selectedCategory,
  onCategoryChange,
  dateFilter,
  onDateChange,
}: {
  categories: CategoryRecord[];
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  dateFilter: DateFilter;
  onDateChange: (value: DateFilter) => void;
}) {
  return (
    <div className={styles.filters}>
      {/* Category Filters */}

      <div
        className={styles.filterRail}
        aria-label="Categories"
      >
        <button
          type="button"
          aria-pressed={selectedCategory === "all"}
          onClick={() => onCategoryChange("all")}
          className={styles.chip}
        >
          All Categories
        </button>

        {categories.map((category) => (
          <button
            key={category.categoryID}
            type="button"
            aria-pressed={
              selectedCategory === category.categoryID
            }
            onClick={() =>
              onCategoryChange(category.categoryID)
            }
            className={styles.chip}
          >
            {category.categoryName}
          </button>
        ))}
      </div>

      {/* Date Filters */}

      <div
        className={styles.filterRail}
        aria-label="Dates"
      >
        {(
          [
            ["all", "Any Date"],
            ["twoWeeks", "Within 2 Weeks"],
            ["month", "Within 1 Month"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={dateFilter === value}
            onClick={() => onDateChange(value)}
            className={styles.chip}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
