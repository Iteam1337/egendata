import { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { EgendataClient } from '@/lib/egendata';
import { toast } from 'sonner';
import { DataFlowNode } from '@/components/DataFlowNode';

const nodeTypes = {
  dataFlow: DataFlowNode,
};

export default function NodeVisualization() {
  const [client] = useState(() => new EgendataClient());
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [actorKeys, setActorKeys] = useState<Record<string, { publicKey: CryptoKey; privateKey: CryptoKey; publicKeyJWK: any }>>({});
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [ipfsId, setIpfsId] = useState<string>('');

  useEffect(() => {
    const initIPFS = async () => {
      try {
        const peerId = await client.getIPFSId();
        setIpfsId(peerId);
      } catch (error) {
        console.error('Failed to get IPFS ID:', error);
      }
    };
    initIPFS();
  }, [client]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const toggleNodeExpanded = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const createActor = async (name: string, position: { x: number; y: number }) => {
    try {
      const keyPair = await client.generateKeyPair(name);
      setActorKeys(prev => ({
        ...prev,
        [name]: { 
          publicKey: keyPair.publicKey, 
          privateKey: keyPair.privateKey,
          publicKeyJWK: keyPair.publicKeyJWK
        }
      }));

      const newNode: Node = {
        id: name,
        type: 'dataFlow',
        position,
        data: {
          label: name,
          ipnsCid: null,
          ipfsCid: null,
          listeningTo: null,
          onRefresh: () => handleRefreshNode(name),
          expanded: false,
          onToggleExpand: () => toggleNodeExpanded(name),
          decryptedData: null,
          publicKeyJWK: keyPair.publicKeyJWK,
          keyring: [],
          metadata: {},
          ipfsId,
          onCopyKey: () => handleCopyKey(name),
          onPasteKey: (pastedKeyJWK: string) => handlePasteKey(name, pastedKeyJWK),
        },
      };

      setNodes((nds) => [...nds, newNode]);
      toast.success(`Actor ${name} created with keys`);
    } catch (error) {
      toast.error(`Failed to create actor: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleRefreshNode = async (nodeName: string) => {
    console.info(`Node ${nodeName} is refreshing...`);
    const keyPair = actorKeys[nodeName];
    if (!keyPair) return;

    try {
      const metadata = await client.getMetadata(`${nodeName}-data`);
      if (!metadata) return;

      const decryptedData = await client.readData(
        `${nodeName}-data`,
        nodeName,
        keyPair.privateKey
      );

      const recipients = await client.listRecipients(`${nodeName}-data`);

      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeName
            ? {
                ...node,
                data: {
                  ...node.data,
                  decryptedData,
                  ipfsCid: metadata.ipnsName || null,
                  metadata: {
                    createdAt: metadata.createdAt,
                    updatedAt: metadata.updatedAt,
                    version: metadata.ipnsVersion,
                  },
                  keyring: recipients.map(name => ({ name })),
                  publicKeyJWK: keyPair.publicKeyJWK,
                },
              }
            : node
        )
      );
    } catch (error) {
      console.log(`Node ${nodeName} couldn't read data:`, error);
    }
  };

  const writeDataToNode = async (nodeName: string, data: object) => {
    try {
      const keyPair = actorKeys[nodeName];
      if (!keyPair) {
        toast.error('Actor keys not found');
        return;
      }

      // Get all other actors as potential recipients
      const recipients = Object.entries(actorKeys)
        .filter(([name]) => name !== nodeName)
        .map(([name, keys]) => ({
          name,
          publicKey: keys.publicKey,
        }));

      const result = await client.writeData(
        `${nodeName}-data`,
        data,
        nodeName,
        recipients
      );

      // Update node with IPNS CID if available
      if (result.cid) {
        setNodes((nds) =>
          nds.map((node) =>
            node.id === nodeName
              ? { ...node, data: { ...node.data, ipnsCid: result.cid } }
              : node
          )
        );
      }

      // Trigger refresh to update all data
      await handleRefreshNode(nodeName);

      toast.success(`Data written by ${nodeName}`);
    } catch (error) {
      toast.error(`Failed to write data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const grantAccess = async (fromNode: string, toNode: string) => {
    try {
      const fromKeys = actorKeys[fromNode];
      const toKeys = actorKeys[toNode];

      if (!fromKeys || !toKeys) {
        toast.error('Actor keys not found');
        return;
      }

      await client.reGrantAccess(
        `${fromNode}-data`,
        toNode,
        toKeys.publicKey,
        fromKeys.privateKey
      );

      // Create edge connection
      const newEdge: Edge = {
        id: `${fromNode}-${toNode}`,
        source: fromNode,
        target: toNode,
        sourceHandle: 'output',
        targetHandle: 'input',
        animated: true,
      };

      setEdges((eds) => [...eds, newEdge]);

      // Update target node to listen to source
      setNodes((nds) =>
        nds.map((node) =>
          node.id === toNode
            ? { 
                ...node, 
                data: { 
                  ...node.data, 
                  listeningTo: nodes.find(n => n.id === fromNode)?.data.ipnsCid 
                } 
              }
            : node
        )
      );

      // Refresh both nodes to update their data
      await handleRefreshNode(fromNode);
      await handleRefreshNode(toNode);

      toast.success(`Access granted from ${fromNode} to ${toNode}`);
    } catch (error) {
      toast.error(`Failed to grant access: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCopyKey = (nodeName: string) => {
    // Already handled in DataFlowNode component
    console.log(`Copy key for ${nodeName}`);
  };

  const handlePasteKey = async (toNodeName: string, pastedKeyJWK: string) => {
    try {
      const publicKeyJWK = JSON.parse(pastedKeyJWK);
      
      // Find which node this key belongs to
      const fromNodeEntry = Object.entries(actorKeys).find(([_, keys]) => 
        JSON.stringify(keys.publicKeyJWK) === pastedKeyJWK
      );

      if (!fromNodeEntry) {
        toast.error('Kunde inte hitta noden för denna nyckel');
        return;
      }

      const [fromNodeName] = fromNodeEntry;
      
      // Grant access from the found node to this node
      await grantAccess(fromNodeName, toNodeName);
    } catch (error) {
      toast.error(`Failed to create connection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header onOpenExplorer={() => window.location.href = '/'} />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-6 space-y-4">
          <h1 className="text-4xl font-bold">Egendata Node Visualization</h1>
          <p className="text-muted-foreground">
            Real-time visualization of egendata nodes with IPFS/IPNS connections
          </p>
          
          <div className="flex gap-2">
            <Button onClick={() => createActor('Alice', { x: 100, y: 250 })}>
              Create Alice
            </Button>
            <Button onClick={() => createActor('Bob', { x: 400, y: 150 })}>
              Create Bob
            </Button>
            <Button onClick={() => createActor('Charlie', { x: 400, y: 350 })}>
              Create Charlie
            </Button>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="secondary"
              onClick={() => writeDataToNode('Alice', { message: 'Hello from Alice', timestamp: Date.now() })}
              disabled={!actorKeys.Alice}
            >
              Alice Write Data
            </Button>
            <Button 
              variant="secondary"
              onClick={() => grantAccess('Alice', 'Bob')}
              disabled={!actorKeys.Alice || !actorKeys.Bob}
            >
              Grant Alice → Bob
            </Button>
            <Button 
              variant="secondary"
              onClick={() => grantAccess('Alice', 'Charlie')}
              disabled={!actorKeys.Alice || !actorKeys.Charlie}
            >
              Grant Alice → Charlie
            </Button>
          </div>
        </div>

        <div className="h-[600px] border rounded-lg bg-background">
          <ReactFlow
            nodes={nodes.map(node => ({
              ...node,
              data: {
                ...node.data,
                expanded: expandedNodes.has(node.id),
                onToggleExpand: () => toggleNodeExpanded(node.id),
                ipfsId,
                onCopyKey: () => handleCopyKey(node.id),
                onPasteKey: (pastedKeyJWK: string) => handlePasteKey(node.id, pastedKeyJWK),
              }
            }))}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
          >
            <Controls />
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          </ReactFlow>
        </div>
      </main>

      <Footer />
    </div>
  );
}
