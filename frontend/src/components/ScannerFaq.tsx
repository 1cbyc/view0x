import React from "react";
import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CHAIN_NAMES =
  "Ethereum, BNB Smart Chain, Base, Arbitrum, Polygon, Optimism, and Avalanche";

const FAQ_ITEMS: { id: string; question: string; answer: React.ReactNode }[] = [
  {
    id: "comprehensive",
    question: "How comprehensive is Scanner?",
    answer: (
      <>
        Scanner checks deployed contracts on-chain using explorer data and security
        heuristics (proxy patterns, ownership, verification, trading limits, and more).
        Paste-source mode runs Slither when you are signed in. Results are indicative —
        always verify critical findings before acting on funds.
      </>
    ),
  },
  {
    id: "chains",
    question: "What chains does Scanner support?",
    answer: (
      <>
        Address scanning works on {CHAIN_NAMES}. Pick the chain that matches where the
        contract is deployed before you scan.
      </>
    ),
  },
  {
    id: "beginner",
    question: "Is it beginner-friendly?",
    answer: (
      <>
        Yes. Enter a contract address and chain, tap Scan address, and read the risk
        score and flags in plain language. Quick picks below the form suggest notable
        examples and recent scans. No wallet connection is required for address scans.
      </>
    ),
  },
  {
    id: "why",
    question: "Why did you create Scanner?",
    answer: (
      <>
        view0x started as a contract analysis tool for builders. Scanner brings
        De.Fi-style “check before you interact” access so anyone can assess a token or
        protocol contract in seconds, not only developers auditing source code.
      </>
    ),
  },
  {
    id: "tools",
    question: "What other security tools do you offer?",
    answer: (
      <>
        <Link to="/shield" className="text-primary underline">
          Shield
        </Link>{" "}
        scans your connected wallet&apos;s approvals and revokes them on-chain (including
        EIP-7702 delegations on Ethereum). The{" "}
        <Link to="/rekt" className="text-primary underline">
          Rekt Database
        </Link>{" "}
        tracks major exploits. Signed-in users get dashboards, history, and optional
        Slither queues on verified contracts.
      </>
    ),
  },
];

export const ScannerFaq: React.FC = () => {
  return (
    <Card className="bg-muted/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">FAQs</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <Accordion type="single" collapsible className="w-full space-y-2">
          {FAQ_ITEMS.map((item) => (
            <AccordionItem
              key={item.id}
              value={item.id}
              className="rounded-lg border border-border bg-card px-3 sm:px-4 border-b-0"
            >
              <AccordionTrigger className="py-3 sm:py-4 hover:no-underline [&>svg:last-child]:hidden">
                <span className="flex items-start gap-3 text-left font-semibold text-sm sm:text-base">
                  <Plus className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                  {item.question}
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-sm pl-7 pr-1 pb-4">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
};
