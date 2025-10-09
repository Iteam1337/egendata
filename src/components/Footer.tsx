import { Link } from "react-router-dom";
import { FileText, Github, ExternalLink, Package } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="border-t border-border bg-muted/30 mt-24">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* About */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <div className="w-5 h-5 bg-white rounded-sm" style={{ 
                  backgroundImage: `repeating-linear-gradient(90deg, hsl(195 100% 52%) 0px, hsl(195 100% 52%) 2px, transparent 2px, transparent 4px),
                                   repeating-linear-gradient(0deg, hsl(195 100% 52%) 0px, hsl(195 100% 52%) 2px, transparent 2px, transparent 4px)` 
                }} />
              </div>
              <h3 className="font-semibold">
                egen<span className="text-primary">DATA</span>
              </h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Decentralized self-sovereign data sharing protocol enabling users to maintain full control over their data.
            </p>
          </div>

          {/* Links */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm">Resources</h4>
            <nav className="flex flex-col gap-3">
              <Link 
                to="/get-started" 
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <Package className="w-4 h-4" />
                Get Started (npm)
              </Link>
              <Link 
                to="/write-nodes" 
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <Package className="w-4 h-4" />
                Write Nodes Demo
              </Link>
              <Link 
                to="/rfc" 
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <FileText className="w-4 h-4" />
                Technical RFC
              </Link>
              <a 
                href="https://ipfs.tech" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                IPFS Documentation
              </a>
              <a 
                href="https://github.com/Iteam1337/egendata" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <Github className="w-4 h-4" />
                View on GitHub
              </a>
            </nav>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm">About</h4>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                This demo illustrates the Egendata protocol for self-sovereign data management using cryptographic access control and decentralized storage.
              </p>
              <p className="text-xs">
                © 2025 Egendata. MIT License.
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};