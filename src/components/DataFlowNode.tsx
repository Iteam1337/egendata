import { memo, useState, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Database } from 'lucide-react';

export interface DataFlowNodeData {
  label: string;
  ipnsCid: string | null;
  listeningTo: string | null;
  onRefresh: () => void;
}

export const DataFlowNode = memo(({ data }: NodeProps<DataFlowNodeData>) => {
  const [isReading, setIsReading] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsReading(true);
      data.onRefresh();
      setTimeout(() => setIsReading(false), 300);
    }, 2000);

    return () => clearInterval(interval);
  }, [data]);

  return (
    <div className={`relative transition-all duration-300 ${isReading ? 'scale-105' : ''}`}>
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="!bg-primary !w-3 !h-3"
      />
      
      <Card className={`w-[250px] ${isReading ? 'ring-2 ring-primary shadow-lg' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="h-4 w-4" />
              {data.label}
            </CardTitle>
            {isReading && (
              <Activity className="h-4 w-4 text-primary animate-pulse" />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.ipnsCid && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">IPNS Output:</p>
              <Badge variant="outline" className="font-mono text-xs break-all">
                {data.ipnsCid.substring(0, 20)}...
              </Badge>
            </div>
          )}
          
          {data.listeningTo && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Listening to:</p>
              <Badge variant="secondary" className="font-mono text-xs break-all">
                {data.listeningTo.substring(0, 20)}...
              </Badge>
            </div>
          )}
          
          {!data.ipnsCid && !data.listeningTo && (
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
