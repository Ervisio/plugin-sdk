import type { InputHTMLAttributes, ReactElement, ReactNode } from 'react';
export interface PathInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'|'value'|'onChange'> {
  value: string;
  onPathChange(path: string): void;
  mode?: 'file'|'folder'|'save';
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  end?: ReactNode;
  icon?: string;
  mono?: boolean;
  compact?: boolean;
  fieldClassName?: string;
}
/** Shared host chooser. Does not grant filesystem access or select container paths. */
export function PathInput(props: PathInputProps): ReactElement;
export function localPickedPath(path: string): string;
