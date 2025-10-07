import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataDisplay } from "./DataDisplay";
import { KeyRingDisplay } from "./KeyRingDisplay";
import { IPFSLink } from "./IPFSLink";
import type { KeyPair } from "@/lib/egendata";

interface ExplorePanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedActor: {
    name: string;
    keyPair: KeyPair | null;
    hasAccess: boolean;
    decryptedData: any;
  } | null;
  onReadAsActor?: (actorName: string, privateKey: CryptoKey) => Promise<void>;
  dataCID?: string;
  accessList: string[];
  allActors: Array<{ name: string; keyPair: KeyPair | null }>;
  onRemoveKey: (name: string) => Promise<void>;
  onAddKey: (name: string) => Promise<void>;
}

export const ExplorePanel = ({
  isOpen,
  onClose,
  selectedActor,
  onReadAsActor,
  dataCID,
  accessList,
  allActors,
  onRemoveKey,
  onAddKey,
}: ExplorePanelProps) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full md:w-[500px] bg-background border-l border-border z-50 shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between z-10">
          <h2 className="font-semibold text-lg">
            {selectedActor ? `${selectedActor.name}'s Details` : "Explore Data"}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {selectedActor && (
            <>
              {/* Actor Information */}
              <Card className="p-4 bg-muted/30">
                <h3 className="font-semibold mb-3">Actor Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span className="font-medium">{selectedActor.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Role:</span>
                    <span className="font-medium">
                      {selectedActor.name === "Alice" ? "Data Owner" : "Recipient"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Access:</span>
                    <span
                      className={`font-medium ${
                        selectedActor.hasAccess ? "text-primary" : "text-destructive"
                      }`}
                    >
                      {selectedActor.hasAccess ? "Granted" : "Denied"}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Key Pair Details */}
              {selectedActor.keyPair && (
                <Card className="p-4 bg-muted/30">
                  <h3 className="font-semibold mb-3">Cryptographic Keys</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Public Key (JWK)</p>
                      <DataDisplay
                        title=""
                        data={JSON.stringify(selectedActor.keyPair.publicKeyJWK, null, 2)}
                        variant="encrypted"
                        isEncrypted={false}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground italic">
                      Private key is securely stored in the actor's local environment and never shared.
                    </p>
                  </div>
                </Card>
              )}

              {/* Decrypted Data */}
              <Card className="p-4 bg-muted/30">
                <h3 className="font-semibold mb-3">Data View</h3>
                <DataDisplay
                  title={selectedActor.hasAccess ? "Decrypted Data" : "Access Denied"}
                  data={
                    selectedActor.decryptedData
                      ? JSON.stringify(selectedActor.decryptedData, null, 2)
                      : selectedActor.hasAccess
                      ? "Click 'Try to Read' to decrypt"
                      : "No access to decrypt data"
                  }
                  variant={selectedActor.hasAccess ? "decrypted" : "encrypted"}
                  isEncrypted={!selectedActor.hasAccess}
                />
                {selectedActor.hasAccess && !selectedActor.decryptedData && selectedActor.keyPair && onReadAsActor && (
                  <Button
                    onClick={() => onReadAsActor(selectedActor.name, selectedActor.keyPair!.privateKey)}
                    className="mt-3 w-full"
                    size="sm"
                  >
                    Try to Read as {selectedActor.name}
                  </Button>
                )}
              </Card>
            </>
          )}

          {/* Keyring Management */}
          <Card className="p-4 bg-muted/30">
            <h3 className="font-semibold mb-3">Access Control (Keyring)</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Manage who has access to the encrypted data by adding or removing recipients from the keyring.
            </p>
            <KeyRingDisplay
              recipients={accessList}
              getKeyPair={(name) => {
                const actor = allActors.find((a) => a.name === name);
                return actor?.keyPair ?? undefined;
              }}
              interactive={true}
              onRemoveKey={onRemoveKey}
              availableKeys={allActors
                .filter((a) => a.keyPair)
                .map((a) => ({ name: a.name, keyPair: a.keyPair! }))}
              onAddKey={onAddKey}
            />
          </Card>

          {/* IPFS Data Explorer */}
          {dataCID && (
            <Card className="p-4 bg-muted/30">
              <h3 className="font-semibold mb-3">IPFS Storage</h3>
              <p className="text-sm text-muted-foreground mb-3">
                The encrypted data is stored on IPFS with content-addressed immutable storage.
              </p>
              <IPFSLink cid={dataCID} title="View encrypted data on IPFS" />
            </Card>
          )}

          {/* How it Works */}
          <Card className="p-4 bg-primary/5 border-primary/20">
            <h3 className="font-semibold mb-2">How Access Control Works</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• Each recipient gets their own encrypted copy of the Data Encryption Key (DEK)</li>
              <li>• Removing a recipient from the keyring revokes their access instantly</li>
              <li>• The encrypted data itself never changes, only the keyring updates</li>
              <li>• Access changes are reflected via new IPFS CIDs</li>
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
};
