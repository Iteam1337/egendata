import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit, Save, X } from "lucide-react";

interface DataEditorProps {
  data: {
    ssn: string;
    creditCard: string;
    address: string;
  };
  onSave: (newData: { ssn: string; creditCard: string; address: string }) => void;
  disabled?: boolean;
}

export const DataEditor = ({ data, onSave, disabled = false }: DataEditorProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState(data);

  const handleSave = () => {
    onSave(editedData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedData(data);
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <Card className="p-4 border-primary/30 bg-primary/5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-card-foreground">Alice's Original Data</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
            disabled={disabled}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Data
          </Button>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">SSN:</span>
            <span className="font-mono">{data.ssn}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Credit Card:</span>
            <span className="font-mono">{data.creditCard}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Address:</span>
            <span className="font-mono">{data.address}</span>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 border-primary/30 bg-primary/5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-card-foreground">Edit Alice's Data</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save & Re-encrypt
          </Button>
        </div>
      </div>
      <div className="space-y-4">
        <div>
          <Label htmlFor="ssn">SSN</Label>
          <Input
            id="ssn"
            value={editedData.ssn}
            onChange={(e) => setEditedData({ ...editedData, ssn: e.target.value })}
            className="font-mono"
          />
        </div>
        <div>
          <Label htmlFor="creditCard">Credit Card</Label>
          <Input
            id="creditCard"
            value={editedData.creditCard}
            onChange={(e) => setEditedData({ ...editedData, creditCard: e.target.value })}
            className="font-mono"
          />
        </div>
        <div>
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            value={editedData.address}
            onChange={(e) => setEditedData({ ...editedData, address: e.target.value })}
            className="font-mono"
          />
        </div>
      </div>
    </Card>
  );
};
