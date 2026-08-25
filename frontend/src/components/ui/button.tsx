import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold-bright)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-[var(--gold)] px-5 py-3 text-[var(--ink)] hover:bg-[var(--gold-bright)]',
        outline:
          'border border-[rgba(244,239,227,0.3)] bg-transparent px-4 py-2 text-[var(--paper)] hover:border-[var(--gold)]',
        quiet: 'bg-transparent px-3 py-2 text-[var(--paper)] hover:text-[var(--gold-bright)]',
      },
    },
    defaultVariants: {
      variant: 'primary',
    },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({ className, variant, type = 'button', ...properties }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant }), className)} type={type} {...properties} />
  );
}
