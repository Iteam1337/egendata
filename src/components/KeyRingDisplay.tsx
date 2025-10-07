import { Key } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { encodeKeyForQR } from "@/lib/qr-key-exchange";
import type { KeyPair } from "@/lib/egendata";

interface KeyRingDisplayProps {
  recipients: string[];
  getKeyPair?: (name: string) => KeyPair | undefined;
  variant?: "full" | "compact";
}

export const KeyRingDisplay = ({ recipients, getKeyPair, variant = "full" }: KeyRingDisplayProps) => {
  if (recipients.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className={variant === "full" ? "space-y-2" : ""}>
        {variant === "full" && (
          <div className="flex items-center gap-2 text-sm font-medium">
            <Key className="w-4 h-4 text-primary" />
            <span>Nyckelring innehåller:</span>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {recipients.map((name) => {
            const keyPair = getKeyPair?.(name);
            const base45Key = keyPair ? encodeKeyForQR(name, keyPair.publicKeyJWK) : null;
            
            return (
              <Tooltip key={name}>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-primary/10 text-primary border border-primary/20 cursor-help">
                    <Key className="w-3 h-3" />
                    <span>{name}</span>
                  </div>
                </TooltipTrigger>
                {base45Key && (
                  <TooltipContent className="max-w-xs break-all font-mono text-xs">
                    <p className="font-semibold mb-1">Publik nyckel (Base45):</p>
                    <p className="opacity-80">{base45Key.substring(0, 100)}...</p>
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
};
