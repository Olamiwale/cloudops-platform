export interface ClusterInfo {
  major: string;
  minor: string;
  gitVersion: string;
  platform: string;
}

export interface NodeInfo {
  name: string;
  status: string;
  roles: string[];
  kubeletVersion?: string;
  os?: string;
  architecture?: string;
}

export interface NamespaceInfo {
  name: string;
  status: string;
  createdAt?: Date;
}

export interface PodInfo {
  name: string;
  namespace: string;
  status?: string;
  node?: string;
  podIP?: string;
  hostIP?: string;
  restarts: number;
  createdAt?: Date;
}


export interface DeploymentInfo {
  name: string;
  namespace: string;
  replicas?: number;
  readyReplicas: number;
  availableReplicas: number;
  updatedReplicas: number;
  createdAt?: Date;
}

export interface ServicePortInfo {
  port: number;
  targetPort?: number | string;
  protocol?: string;
}

export interface ServiceInfo {
  name: string;
  namespace: string;
  type?: string;
  clusterIP?: string;
  externalIPs: string[];
  ports?: ServicePortInfo[];
}


export interface DashboardOverview {
  counts: {
    nodes: number;
    namespaces: number;
    pods: number;
    deployments: number;
    services: number;
  };
}