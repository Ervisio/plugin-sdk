import type { ReactElement } from 'react';

export type DestinationKind = 'remote' | 'local' | 'http' | 'drive' | 'repo' | 's3';
/** Ervisio 7.0.4 backup/delivery helper input. Secrets are write-only in views. */
export interface Destination {
  kind?: DestinationKind;
  connection: string;
  path: string;
  url?: string;
  method?: 'POST' | 'PUT';
  uploadMode?: 'multipart' | 'raw';
  field?: string;
  apiHeader?: string;
  authScheme?: 'bearer' | 'raw';
  allowHTTP?: boolean;
  folder?: string;
  owner?: string;
  repository?: string;
  target?: string;
  bucket?: string;
  region?: string;
  endpoint?: string;
  pathStyle?: boolean;
  retention?: boolean;
  credentialMode?: 'default' | 'keys';
  apiKey?: string;
  accessKey?: string;
  secretKey?: string;
  sessionToken?: string;
  hasAPIKey?: boolean;
  hasCredentials?: boolean;
  hasSessionToken?: boolean;
  clearAPIKey?: boolean;
  clearCredentials?: boolean;
  clearSessionToken?: boolean;
}
export interface DestinationConnection { id: string; name: string; kind: string; path?: string }
export interface DestinationFieldsProps {
  value: Destination;
  onChange(value: Destination): void;
  connections?: readonly DestinationConnection[];
  disabled?: boolean;
  /** One-off exports always disable retention, including S3. */
  allowRetention?: boolean;
}
/** Standard account-owned destination fields and the host file/folder picker.
 * This component does not perform uploads or grant filesystem access. Its plugin
 * must declare and invoke the trusted backup/delivery commands separately. */
export function DestinationFields(props: DestinationFieldsProps): ReactElement;
export function pickedDestination(path: string, connections: readonly DestinationConnection[]): Destination;
