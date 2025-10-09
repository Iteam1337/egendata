import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle2, XCircle, Clock, Layers } from 'lucide-react';
import { AggregationKeystone } from '@/lib/egendata';

interface AggregationPanelProps {
  onAggregate?: () => Promise<void>;
  lastAggregation?: AggregationKeystone | null;
  isAggregating?: boolean;
}

export const AggregationPanel = ({ onAggregate, lastAggregation, isAggregating }: AggregationPanelProps) => {
  const [localAggregating, setLocalAggregating] = useState(false);

  const handleAggregate = async () => {
    if (!onAggregate) return;
    
    setLocalAggregating(true);
    try {
      await onAggregate();
    } finally {
      setLocalAggregating(false);
    }
  };

  const aggregating = isAggregating || localAggregating;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Aggregation</h3>
        </div>
        <Button
          onClick={handleAggregate}
          disabled={aggregating}
          size="sm"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${aggregating ? 'animate-spin' : ''}`} />
          {aggregating ? 'Aggregating...' : 'Force Aggregate'}
        </Button>
      </div>

      {lastAggregation ? (
        <div className="space-y-3">
          {/* Status Card */}
          <Card className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-medium">Latest Aggregation</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3" />
                  {new Date(lastAggregation.metadata.created).toLocaleString()}
                </p>
              </div>
              <Badge variant="outline">
                v{lastAggregation.metadata.version}
              </Badge>
            </div>

            {/* Services Status */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Services Included</span>
                <div className="flex items-center gap-1 text-success">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="font-medium">
                    {lastAggregation.metadata.aggregation.servicesIncluded.length}
                  </span>
                </div>
              </div>

              {lastAggregation.metadata.aggregation.servicesIncluded.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {lastAggregation.metadata.aggregation.servicesIncluded.map(service => (
                    <Badge key={service} variant="secondary" className="text-xs">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      {service}
                    </Badge>
                  ))}
                </div>
              )}

              {lastAggregation.metadata.aggregation.missingServices.length > 0 && (
                <>
                  <div className="flex items-center justify-between text-sm mt-3">
                    <span className="text-muted-foreground">Missing Services</span>
                    <div className="flex items-center gap-1 text-destructive">
                      <XCircle className="w-4 h-4" />
                      <span className="font-medium">
                        {lastAggregation.metadata.aggregation.missingServices.length}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {lastAggregation.metadata.aggregation.missingServices.map(service => (
                      <Badge key={service} variant="destructive" className="text-xs">
                        <XCircle className="w-3 h-3 mr-1" />
                        {service}
                      </Badge>
                    ))}
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* Scope Index CID */}
          <Card className="p-3 bg-muted/30">
            <p className="text-xs font-medium mb-1">Scope Index CID</p>
            <p className="text-xs font-mono break-all text-muted-foreground">
              {lastAggregation.metadata.aggregation.scopeIndexCid}
            </p>
          </Card>

          {lastAggregation.metadata.mountIndexCid && (
            <Card className="p-3 bg-muted/30">
              <p className="text-xs font-medium mb-1">Mount Index CID</p>
              <p className="text-xs font-mono break-all text-muted-foreground">
                {lastAggregation.metadata.mountIndexCid}
              </p>
            </Card>
          )}
        </div>
      ) : (
        <Card className="p-6 text-center border-dashed">
          <Layers className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No aggregation yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Click "Force Aggregate" to combine all Write Node data
          </p>
        </Card>
      )}
    </div>
  );
};
