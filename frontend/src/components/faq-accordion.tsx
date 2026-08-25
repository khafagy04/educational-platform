'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import styles from './faq-accordion.module.css';

export function FaqAccordion({
  items,
}: {
  items: { id: string; question: string; answer: string }[];
}) {
  const [open, setOpen] = useState<string | null>(items[0]?.id ?? null);
  return (
    <div className={styles.list}>
      {items.map((item) => (
        <article className="faq-item" key={item.id}>
          <button
            type="button"
            aria-expanded={open === item.id}
            aria-controls={`faq-panel-${item.id}`}
            onClick={() => setOpen(open === item.id ? null : item.id)}
          >
            <span>{item.question}</span>
            <ChevronDown
              className={open === item.id ? styles.chevronOpen : styles.chevron}
              aria-hidden="true"
              size={20}
            />
          </button>
          {open === item.id && <p id={`faq-panel-${item.id}`}>{item.answer}</p>}
        </article>
      ))}
    </div>
  );
}
