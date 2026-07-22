import { Controller, Get } from '@nestjs/common';
import { KubernetesService } from './kubernetes.services';

@Controller('kubernetes')
export class KubernetesController {
  constructor(
    private readonly kubernetesService: KubernetesService,
  ) {}

  @Get('version')
  async getVersion() {
    return this.kubernetesService.getVersion();
  }

  @Get('nodes')
  async getNodes() {
    return this.kubernetesService.getNodes();
  }

  @Get('namespaces')
   async getNamespaces() {
     return this.kubernetesService.getNamespaces();
   }

@Get('pods')
async getPods() {
  return this.kubernetesService.getPods();
}

@Get('deployments')
async getDeployments() {
  return this.kubernetesService.getDeployments();
}

@Get('services')
async getServices() {
  return this.kubernetesService.getServices();
}

@Get('overview')
async getOverview() {
  return this.kubernetesService.getOverview();
}

}