import { memo, useState, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Database, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

export interface DataFlowNodeData {
  label: string;
  ipnsCid: string | null;
  ipfsCid: string | null;
  listeningTo: string | null;
  onRefresh: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
  decryptedData: any | null;
  publicKeyJWK: any | null;
  keyring: Array<{ name: string }>;
  metadata: {
    createdAt?: number;
    updatedAt?: number;
    version?: number;
  };
}

export const DataFlowNode = memo(({ data }: NodeProps<DataFlowNodeData>) => {
  const [isReading, setIsReading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const interval = setInterval(() => {
      setIsReading(true);
      data.onRefresh();
      setTimeout(() => setIsReading(false), 300);
    }, 2000);

    return () => clearInterval(interval);
  }, [data]);

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast({
      title: "Kopierat!",
      description: `${field} kopierad till urklipp`,
    });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString('sv-SE');
  };

  return (
    <div className={`relative transition-all duration-300 ${isReading ? 'scale-105' : ''}`}>
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="!bg-primary !w-3 !h-3"
      />
      
      <Card className={`${data.expanded ? 'w-[400px]' : 'w-[250px]'} ${isReading ? 'ring-2 ring-primary shadow-lg' : ''} transition-all`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="h-4 w-4" />
              {data.label}
            </CardTitle>
            <div className="flex items-center gap-2">
              {isReading && (
                <Activity className="h-4 w-4 text-primary animate-pulse" />
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={data.onToggleExpand}
                className="h-6 w-6 p-0"
              >
                {data.expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-2">
          {/* Compact View */}
          {data.ipnsCid && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">IPNS Output:</p>
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="font-mono text-xs flex-1 truncate">
                  {data.expanded ? data.ipnsCid : `${data.ipnsCid.substring(0, 20)}...`}
                </Badge>
                {data.expanded && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(data.ipnsCid!, 'IPNS CID')}
                    className="h-6 w-6 p-0"
                  >
                    {copiedField === 'IPNS CID' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                )}
              </div>
            </div>
          )}

          {data.ipfsCid && data.expanded && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">IPFS CID:</p>
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="font-mono text-xs flex-1 truncate">
                  {data.ipfsCid}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(data.ipfsCid!, 'IPFS CID')}
                  className="h-6 w-6 p-0"
                >
                  {copiedField === 'IPFS CID' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
            </div>
          )}
          
          {data.listeningTo && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Listening to:</p>
              <Badge variant="secondary" className="font-mono text-xs break-all">
                {data.expanded ? data.listeningTo : `${data.listeningTo.substring(0, 20)}...`}
              </Badge>
            </div>
          )}

          {/* Expanded View */}
          {data.expanded && (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-3 pt-2">
                {data.decryptedData && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-xs font-semibold">📦 Decrypted Data</p>
                      <pre className="bg-muted p-2 rounded text-xs overflow-auto">
                        {JSON.stringify(data.decryptedData, null, 2)}
                      </pre>
                    </div>
                  </>
                )}

                {data.publicKeyJWK && (
                  <>
                    <Separator />
                    <Collapsible>
                      <CollapsibleTrigger className="flex items-center gap-2 text-xs font-semibold hover:underline">
                        <ChevronDown className="h-3 w-3" />
                        🔑 Public Key (JWK)
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <pre className="bg-muted p-2 rounded text-xs overflow-auto mt-2">
                          {JSON.stringify(data.publicKeyJWK, null, 2)}
                        </pre>
                      </CollapsibleContent>
                    </Collapsible>
                  </>
                )}

                {data.keyring.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-xs font-semibold">👥 Access Granted To</p>
                      <div className="flex flex-wrap gap-1">
                        {data.keyring.map((recipient) => (
                          <Badge key={recipient.name} variant="secondary" className="text-xs">
                            {recipient.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {(data.metadata.createdAt || data.metadata.updatedAt || data.metadata.version) && (
                  <>
                    <Separator />
                    <div className="space-y-1">
                      <p className="text-xs font-semibold">ℹ️ Metadata</p>
                      <div className="text-xs space-y-0.5 text-muted-foreground">
                        {data.metadata.createdAt && (
                          <p>Created: {formatDate(data.metadata.createdAt)}</p>
                        )}
                        {data.metadata.updatedAt && (
                          <p>Updated: {formatDate(data.metadata.updatedAt)}</p>
                        )}
                        {data.metadata.version && (
                          <p>Version: {data.metadata.version}</p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          )}
          
          {!data.ipnsCid && !data.listeningTo && !data.expanded && (
            <p className="text-xs text-muted-foreground">No data yet</p>
          )}
        </CardContent>
      </Card>

      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="!bg-primary !w-3 !h-3"
      />
    </div>
  );
});

DataFlowNode.displayName = 'DataFlowNode';
