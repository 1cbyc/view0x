import React from "react";
import { FileText } from "lucide-react";
import { contractExamples, type ContractExample } from "@/data/contractExamples";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (example: ContractExample) => void;
  trigger?: React.ReactNode;
};

function ExampleList({
  examples,
  onSelect,
}: {
  examples: ContractExample[];
  onSelect: (example: ContractExample) => void;
}) {
  if (examples.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        No examples in this category yet.
      </p>
    );
  }

  return (
    <div className="space-y-3 pb-2">
      {examples.map((example) => (
        <Card
          key={example.id}
          className="cursor-pointer hover:bg-muted/50 transition-colors bg-card border-border active:scale-[0.99]"
          onClick={() => onSelect(example)}
        >
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base sm:text-lg text-foreground leading-snug">
                  {example.name}
                </CardTitle>
                <CardDescription className="mt-1 text-xs sm:text-sm text-muted-foreground">
                  {example.description}
                </CardDescription>
              </div>
              <Badge variant="outline" className="w-fit shrink-0 capitalize">
                {example.difficulty}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4 sm:px-6 sm:pb-6">
            <div className="flex flex-wrap gap-1.5">
              {example.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px] sm:text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

const vulnerable = contractExamples.filter((e) => e.category === "vulnerable");
const basic = contractExamples.filter(
  (e) => e.category === "basic" || e.category === "erc20" || e.category === "erc721",
);
const bestPractice = contractExamples.filter((e) => e.category === "best-practice");

export const ContractExamplesDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  onSelect,
  trigger,
}) => {
  const handleSelect = (example: ContractExample) => {
    onSelect(example);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm" className="text-xs sm:text-sm">
            <FileText className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            Load Example
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-[95vw] sm:max-w-3xl max-h-[min(92dvh,900px)] flex flex-col p-4 sm:p-6 gap-0">
        <DialogHeader className="space-y-1 pr-8">
          <DialogTitle className="text-lg sm:text-xl">Contract Examples Library</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Browse vulnerable patterns and safe baselines. Tap a card to load it into the editor.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="vulnerable" className="flex-1 flex flex-col min-h-0 mt-3 sm:mt-4">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="vulnerable" className="text-[11px] sm:text-sm px-1 sm:px-3 py-2">
              Vulnerable ({vulnerable.length})
            </TabsTrigger>
            <TabsTrigger value="basic" className="text-[11px] sm:text-sm px-1 sm:px-3 py-2">
              Basic
            </TabsTrigger>
            <TabsTrigger value="best-practice" className="text-[11px] sm:text-sm px-1 sm:px-3 py-2">
              Best practice
            </TabsTrigger>
          </TabsList>
          <TabsContent value="vulnerable" className="flex-1 min-h-0 mt-3 data-[state=inactive]:hidden">
            <ScrollArea className="h-[min(55dvh,28rem)] pr-2 sm:pr-4">
              <ExampleList examples={vulnerable} onSelect={handleSelect} />
            </ScrollArea>
          </TabsContent>
          <TabsContent value="basic" className="flex-1 min-h-0 mt-3 data-[state=inactive]:hidden">
            <ScrollArea className="h-[min(55dvh,28rem)] pr-2 sm:pr-4">
              <ExampleList examples={basic} onSelect={handleSelect} />
            </ScrollArea>
          </TabsContent>
          <TabsContent value="best-practice" className="flex-1 min-h-0 mt-3 data-[state=inactive]:hidden">
            <ScrollArea className="h-[min(55dvh,28rem)] pr-2 sm:pr-4">
              <ExampleList examples={bestPractice} onSelect={handleSelect} />
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
