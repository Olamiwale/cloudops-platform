// K8s Resource Data Transfer Object
export interface K8sResourceDto {
  name: string;
  namespace: string;
  kind: string;
  status: string;
}

// Socket Event Types
export enum SocketEvent {
  POD_CREATED = 'pod:created',
  POD_DELETED = 'pod:deleted',
  METRICS_UPDATED = 'metrics:updated'
}
