import { Key, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { encodeKeyForQR } from "@/lib/qr-key-exchange";
import type { KeyPair } from "@/lib/egendata";
import { Button } from "@/components/ui/button";

interface KeyRingDisplayProps {
  recipients: string[];
  getKeyPair?: (name: string) => KeyPair | undefined;
  variant?: "full" | "compact";
  interactive?: boolean;
  onRemoveKey?: (name: string) => void;
  availableKeys?: Array<{ name: string; keyPair: KeyPair }>;
  onAddKey?: (name: string) => void;
}

export const KeyRingDisplay = ({ 
  recipients, 
  getKeyPair, 
  variant = "full", 
  interactive = false,
  onRemoveKey,
  availableKeys = [],
  onAddKey
}: KeyRingDisplayProps) => {
  if (recipients.length === 0 && !interactive) {
    return null;
  }

  // Nycklar som inte finns i nyckelringen men finns tillgängliga
  const availableToAdd = availableKeys.filter(
    key => !recipients.includes(key.name)
  );

  return (
    <TooltipProvider>
      <div className={variant === "full" ? "space-y-3" : ""}>
        {variant === "full" && (
          <div className="flex items-center gap-2 text-sm font-medium">
            <Key className="w-4 h-4 text-primary" />
            <span>Keyring contains:</span>
          </div>
        )}
        
        {/* Nuvarande nycklar */}
        <div className="flex flex-wrap gap-2">
          {recipients.length === 0 ? (
            <div className="text-xs text-muted-foreground italic">
              Keyring is empty
            </div>
          ) : (
            recipients.map((name) => {
              const keyPair = getKeyPair?.(name);
              const base45Key = keyPair ? encodeKeyForQR(name, keyPair.publicKeyJWK) : null;
              
              return (
                <Tooltip key={name}>
                  <TooltipTrigger asChild>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-primary/10 text-primary border border-primary/20 ${interactive ? 'pr-1' : ''}`}>
                      <Key className="w-3 h-3" />
                      <span>{name}</span>
                      {interactive && onRemoveKey && name !== "Alice" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveKey(name);
                          }}
                          className="ml-1 hover:bg-destructive/20 rounded p-0.5 transition-colors"
                          aria-label={`Remove ${name}`}
                        >
                          <X className="w-3 h-3 text-destructive" />
                        </button>
                      )}
                    </div>
                  </TooltipTrigger>
                  {base45Key && (
                    <TooltipContent className="max-w-xs break-all font-mono text-xs">
                      <p className="font-semibold mb-1">Public key (Base45):</p>
                      <p className="opacity-80">{base45Key.substring(0, 100)}...</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })
          )}
        </div>

        {/* Lägg till nycklar (endast i interaktivt läge) */}
        {interactive && availableToAdd.length > 0 && onAddKey && (
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">Available keys to add:</p>
            <div className="flex flex-wrap gap-2">
              {availableToAdd.map((key) => (
                <Button
                  key={key.name}
                  onClick={() => onAddKey(key.name)}
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                >
                  <Key className="w-3 h-3 mr-1" />
                  Add {key.name}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};
