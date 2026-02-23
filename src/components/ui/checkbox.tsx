import * as React from 'react';
import clsx from 'clsx';

export type CheckboxProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      type="checkbox"
      className={clsx('h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400', className)}
      {...props}
    />
  );
});
