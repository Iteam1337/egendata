import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, ExternalLink, Network } from 'lucide-react';
import { ScopeIndexManager, ServiceDefinition } from '@/lib/egendata';
import { toast } from 'sonner';

interface WriteNodePanelProps {
  scopeIndexManager: ScopeIndexManager;
  onScopeIndexUpdate?: (services: ServiceDefinition[]) => void;
}

export const WriteNodePanel = ({ scopeIndexManager, onScopeIndexUpdate }: WriteNodePanelProps) => {
  const [services, setServices] = useState<ServiceDefinition[]>([]);
  const [newServiceId, setNewServiceId] = useState('');
  const [newServiceIpns, setNewServiceIpns] = useState('');
  const [newServiceScopes, setNewServiceScopes] = useState('');

  const handleAddService = () => {
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

    setServices([...services, service]);
    onScopeIndexUpdate?.([...services, service]);
    
    setNewServiceId('');
    setNewServiceIpns('');
    setNewServiceScopes('');
    
    toast.success('Write Node added');
  };

  const handleRemoveService = (serviceId: string) => {
    const updated = services.filter(s => s.id !== serviceId);
    setServices(updated);
    onScopeIndexUpdate?.(updated);
    toast.success('Write Node removed');
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
        {services.map((service) => (
          <Card key={service.id} className="p-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{service.id}</h4>
                  <Badge variant="secondary" className="text-xs">
                    {service.scopes.length} scopes
                  </Badge>
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
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveService(service.id)}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </Card>
        ))}

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
              Write Nodes allow external services to publish data to your IPFS network without accessing your Root IPNS key. Each service maintains its own IPNS identity and publishes Service Keystones that can be aggregated.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
