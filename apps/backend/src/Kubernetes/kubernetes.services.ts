import { Injectable } from '@nestjs/common';
import { ClusterInfo, NamespaceInfo, NodeInfo, PodInfo,} from './kubernetes.types';
import { versionApi, coreV1Api, appsV1Api } from './kubernetes.client';

@Injectable()
export class KubernetesService {

    async getVersion() {
        const version = await versionApi.getCode();
        return {
            major: version.major,
            minor: version.minor,
            gitVersion: version.gitVersion,
            platform: version.platform,
        };
    };



 async getNodes() {
    const { items } = await coreV1Api.listNode();

    return items.map((node) => ({
      name: node.metadata?.name,
      status:
        node.status?.conditions?.find(
          (condition) => condition.type === 'Ready',
        )?.status === 'True'
          ? 'Ready'
          : 'NotReady',
      roles: Object.keys(node.metadata?.labels || {})
        .filter((label) =>
          label.startsWith('node-role.kubernetes.io/'),
        )
        .map((label) =>
          label.replace('node-role.kubernetes.io/', ''),
        ),
      kubeletVersion: node.status?.nodeInfo?.kubeletVersion,
      os: node.status?.nodeInfo?.operatingSystem,
      architecture: node.status?.nodeInfo?.architecture,
    }));
  }


async getNamespaces() {
  const { items } = await coreV1Api.listNamespace();

  return items.map((namespace) => ({
    name: namespace.metadata?.name,
    status: namespace.status?.phase,
    createdAt: namespace.metadata?.creationTimestamp,
  }));
}


async getPods() {
  const { items } = await coreV1Api.listPodForAllNamespaces();

  return items.map((pod) => ({
    name: pod.metadata?.name,
    namespace: pod.metadata?.namespace,
    status: pod.status?.phase,
    node: pod.spec?.nodeName,
    podIP: pod.status?.podIP,
    hostIP: pod.status?.hostIP,
    restarts:
      pod.status?.containerStatuses?.reduce(
        (sum, container) => sum + container.restartCount,
        0,
      ) ?? 0,
    createdAt: pod.metadata?.creationTimestamp,
  }));
}


async getDeployments() {
  const { items } = await appsV1Api.listDeploymentForAllNamespaces();

  return items.map((deployment) => ({
    name: deployment.metadata?.name,
    namespace: deployment.metadata?.namespace,
    replicas: deployment.spec?.replicas,
    readyReplicas: deployment.status?.readyReplicas ?? 0,
    availableReplicas: deployment.status?.availableReplicas ?? 0,
    updatedReplicas: deployment.status?.updatedReplicas ?? 0,
    createdAt: deployment.metadata?.creationTimestamp,
  }));
}

async getServices() {
  const { items } = await coreV1Api.listServiceForAllNamespaces();

  return items.map((service) => ({
    name: service.metadata?.name,
    namespace: service.metadata?.namespace,
    type: service.spec?.type,
    clusterIP: service.spec?.clusterIP,
    externalIPs: service.spec?.externalIPs ?? [],
    ports: service.spec?.ports?.map((port) => ({
      port: port.port,
      targetPort: port.targetPort,
      protocol: port.protocol,
    })),
  }));
}


async getOverview() {
  const [nodes, namespaces, pods, deployments, services] =
    await Promise.all([
      coreV1Api.listNode(),
      coreV1Api.listNamespace(),
      coreV1Api.listPodForAllNamespaces(),
      appsV1Api.listDeploymentForAllNamespaces(),
      coreV1Api.listServiceForAllNamespaces(),
    ]);

  return {
    counts: {
      nodes: nodes.items.length,
      namespaces: namespaces.items.length,
      pods: pods.items.length,
      deployments: deployments.items.length,
      services: services.items.length,
    },
  };
}


}