import styles from './brand-mark.module.css';

export function BrandMark({ className = '' }: { className?: string }) {
  return (
    <span className={`${styles.mark} ${className}`.trim()} aria-hidden="true">
      <span className={styles.monogram}>م</span>
      <svg className={styles.route} viewBox="0 0 52 52" focusable="false">
        <path d="M7 38 C14 38 14 31 20 31 C27 31 25 41 32 41 C39 41 37 26 45 26" />
        <circle className={styles.startNode} cx="7" cy="38" r="2.2" />
        <circle className={styles.middleNode} cx="20" cy="31" r="2.2" />
        <circle className={styles.endNode} cx="45" cy="26" r="3" />
      </svg>
    </span>
  );
}
