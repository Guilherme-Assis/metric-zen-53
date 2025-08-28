import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/utils/formatters";
import { Calculator, TrendingUp, Target, DollarSign } from "lucide-react";

interface DetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  value: string | number;
  details: {
    description: string;
    formula?: string;
    breakdown?: Array<{ label: string; value: number }>;
    explanation: string;
  };
}

export function DetailModal({ open, onOpenChange, title, value, details }: DetailModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Calculator className="w-6 h-6 text-primary" />
            Como calculamos: {title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Current Value */}
          <div className="card-glass p-4 rounded-xl">
            <h3 className="text-sm text-foreground-muted mb-2">Valor Atual</h3>
            <p className="text-3xl font-bold text-foreground">{value}</p>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">O que significa?</h3>
            <p className="text-foreground-muted leading-relaxed">{details.description}</p>
          </div>

          {/* Formula */}
          {details.formula && (
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Como é calculado?</h3>
              <div className="card-glass p-4 rounded-xl">
                <code className="text-primary font-mono">{details.formula}</code>
              </div>
            </div>
          )}

          {/* Breakdown */}
          {details.breakdown && details.breakdown.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">Detalhamento</h3>
              <div className="space-y-2">
                {details.breakdown.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-foreground">{item.label}</span>
                    <span className="font-semibold text-foreground">{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Explanation */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Por que é importante?</h3>
            <p className="text-foreground-muted leading-relaxed">{details.explanation}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}