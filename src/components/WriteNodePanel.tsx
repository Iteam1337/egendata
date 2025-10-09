import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, ExternalLink, Network, Play, Pause, Activity } from 'lucide-react';
import { AuthorizedServicesManager, ServiceDefinition, WriteNode, IPFSStorage } from '@/lib/egendata';
import { toast } from 'sonner';

interface ServiceStatus {
  id: string;
  isRunning: boolean;
  lastUpdate?: Date;
  updateCount: number;
}

interface WriteNodePanelProps {
  authorizedServicesManager: AuthorizedServicesManager;
  ipfsStorage: IPFSStorage;
  ownerPublicKey?: CryptoKey;
  onAuthorizedServicesUpdate?: (services: ServiceDefinition[]) => void;
}

export const WriteNodePanel = ({ 
  authorizedServicesManager, 
  ipfsStorage,
  ownerPublicKey,
  onAuthorizedServicesUpdate 
}: WriteNodePanelProps) => {
  const [services, setServices] = useState<ServiceDefinition[]>([]);
  const [servicesStatus, setServicesStatus] = useState<Map<string, ServiceStatus>>(new Map());
  const [newServiceId, setNewServiceId] = useState('');
  const [newServiceIpns, setNewServiceIpns] = useState('');
  const [newServiceScopes, setNewServiceScopes] = useState('');
  
  const writeNodesRef = useRef<Map<string, WriteNode>>(new Map());
  const intervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      intervalsRef.current.forEach(interval => clearInterval(interval));
    };
  }, []);

  const generateMockData = (serviceId: string) => {
    const dataTypes: Record<string, any> = {
      'svc:mail:gmail': {
        type: 'email',
        count: Math.floor(Math.random() * 10),
        subjects: ['Meeting reminder', 'Project update', 'Invoice'],
        timestamp: new Date().toISOString()
      },
      'svc:calendar:google': {
        type: 'calendar',
        events: Math.floor(Math.random() * 5),
        nextEvent: 'Team standup',
        timestamp: new Date().toISOString()
      },
      'svc:fitness:strava': {
        type: 'activity',
        distance: Math.floor(Math.random() * 10000),
        calories: Math.floor(Math.random() * 500),
        timestamp: new Date().toISOString()
      }
    };

    return dataTypes[serviceId] || {
      type: 'generic',
      value: Math.random(),
      timestamp: new Date().toISOString()
    };
  };

  const handleAddService = async () => {
    if (!newServiceId || !newServiceIpns) {
      toast.error('Service ID and IPNS are required');
      return;
    }

    const service: ServiceDefinition = {
      id: newServiceId,
      serviceIpns: newServiceIpns.startsWith('/ipns/') ? newServiceIpns : `/ipns/${newServiceIpns}`,
      scopes: newServiceScopes.split(',').map(s => s.trim()).filter(Boolean),
      policy: { merge: 'by-id' }
    };

    // Create WriteNode for this service
    const writeNode = new WriteNode(service.id, 'egendata.app', ipfsStorage);
    writeNodesRef.current.set(service.id, writeNode);
    
    // Generate IPNS key for this service
    try {
      await writeNode.generateIPNSKey();
    } catch (error) {
      console.error('Failed to generate IPNS key:', error);
    }

    setServices([...services, service]);
    setServicesStatus(new Map(servicesStatus.set(service.id, {
      id: service.id,
      isRunning: false,
      updateCount: 0
    })));
    onAuthorizedServicesUpdate?.([...services, service]);
    
    setNewServiceId('');
    setNewServiceIpns('');
    setNewServiceScopes('');
    
    toast.success('Write Node added');
  };

  const handleRemoveService = (serviceId: string) => {
    // Stop if running
    if (servicesStatus.get(serviceId)?.isRunning) {
      handleStopService(serviceId);
    }

    // Cleanup
    writeNodesRef.current.delete(serviceId);
    
    const updated = services.filter(s => s.id !== serviceId);
    setServices(updated);
    
    const newStatus = new Map(servicesStatus);
    newStatus.delete(serviceId);
    setServicesStatus(newStatus);
    
    onAuthorizedServicesUpdate?.(updated);
    toast.success('Write Node removed');
  };

  const handleStartService = async (serviceId: string) => {
    if (!ownerPublicKey) {
      toast.error('Owner public key not available');
      return;
    }

    const writeNode = writeNodesRef.current.get(serviceId);
    if (!writeNode) return;

    // Update status
    const status = servicesStatus.get(serviceId);
    if (status) {
      status.isRunning = true;
      setServicesStatus(new Map(servicesStatus));
    }

    // Publish immediately
    await publishServiceData(serviceId);

    // Setup interval for regular updates (every 10 seconds)
    const interval = setInterval(async () => {
      await publishServiceData(serviceId);
    }, 10000);

    intervalsRef.current.set(serviceId, interval);
    toast.success(`${serviceId} started`);
  };

  const handleStopService = (serviceId: string) => {
    const interval = intervalsRef.current.get(serviceId);
    if (interval) {
      clearInterval(interval);
      intervalsRef.current.delete(serviceId);
    }

    const status = servicesStatus.get(serviceId);
    if (status) {
      status.isRunning = false;
      setServicesStatus(new Map(servicesStatus));
    }

    toast.info(`${serviceId} stopped`);
  };

  const publishServiceData = async (serviceId: string) => {
    if (!ownerPublicKey) return;

    const writeNode = writeNodesRef.current.get(serviceId);
    if (!writeNode) return;

    try {
      const mockData = generateMockData(serviceId);
      
      await writeNode.publishServiceKeystone(
        mockData,
        [{ name: 'Owner', publicKey: ownerPublicKey }]
      );

      // Update status
      const status = servicesStatus.get(serviceId);
      if (status) {
        status.lastUpdate = new Date();
        status.updateCount++;
        setServicesStatus(new Map(servicesStatus));
      }

      console.log(`✅ ${serviceId} published data:`, mockData);
    } catch (error) {
      console.error(`❌ ${serviceId} publish failed:`, error);
      toast.error(`${serviceId} publish failed`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Network className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Write Nodes</h3>
        <Badge variant="outline">{services.length}</Badge>
      </div>

      {/* Service List */}
      <div className="space-y-2">
        {services.map((service) => {
          const status = servicesStatus.get(service.id);
          return (
            <Card key={service.id} className="p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium">{service.id}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {service.scopes.length} scopes
                    </Badge>
                    {status?.isRunning && (
                      <Badge variant="default" className="text-xs animate-pulse">
                        <Activity className="w-3 h-3 mr-1" />
                        Running
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 font-mono break-all">
                    {service.serviceIpns}
                  </p>
                  {service.scopes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {service.scopes.map(scope => (
                        <Badge key={scope} variant="outline" className="text-xs">
                          {scope}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {status && (
                    <div className="mt-2 text-xs text-muted-foreground space-y-1">
                      <p>Updates: {status.updateCount}</p>
                      {status.lastUpdate && (
                        <p>Last: {status.lastUpdate.toLocaleTimeString()}</p>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {status?.isRunning ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStopService(service.id)}
                    >
                      <Pause className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStartService(service.id)}
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveService(service.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}

        {services.length === 0 && (
          <Card className="p-6 text-center border-dashed">
            <Network className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No Write Nodes configured</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add external services to publish data on your behalf
            </p>
          </Card>
        )}
      </div>

      {/* Add Service Form */}
      <Card className="p-4 space-y-3">
        <h4 className="text-sm font-medium">Add Write Node</h4>
        
        <Input
          placeholder="Service ID (e.g., svc:mail:gmail)"
          value={newServiceId}
          onChange={(e) => setNewServiceId(e.target.value)}
        />
        
        <Input
          placeholder="Service IPNS (e.g., k51qzi5uqu5d...)"
          value={newServiceIpns}
          onChange={(e) => setNewServiceIpns(e.target.value)}
        />
        
        <Input
          placeholder="Scopes (comma-separated, e.g., mail.inbox, mail.sent)"
          value={newServiceScopes}
          onChange={(e) => setNewServiceScopes(e.target.value)}
        />

        <Button onClick={handleAddService} className="w-full" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Write Node
        </Button>
      </Card>

      {/* Info Card */}
      <Card className="p-4 bg-muted/50 border-primary/20">
        <div className="flex items-start gap-3">
          <ExternalLink className="w-4 h-4 text-primary mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-medium">About Write Nodes</p>
            <p className="text-xs text-muted-foreground mt-1">
              Write Nodes allow external services to publish data to your IPFS network without accessing your Root IPNS key. 
              Click Play to simulate a service publishing data every 10 seconds.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
