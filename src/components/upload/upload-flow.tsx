"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeader } from "./section-header";
import { Step1Assignment } from "./step1-assignment";
import { Step2As } from "./step2-as";
import { Step3Compare, type CompareResult } from "./step3-compare";
import type {
  AsPreviewResult,
  AssignmentPreviewResult,
} from "@/types/sync";

export function UploadFlow() {
  const [step1Result, setStep1Result] =
    useState<AssignmentPreviewResult | null>(null);
  const [step2Result, setStep2Result] = useState<AsPreviewResult | null>(null);
  const [step3Result, setStep3Result] = useState<CompareResult | null>(null);

  const step1Done = step1Result?.ok === true;
  const step2Done = step2Result?.ok === true;
  const canCompare = step1Done && step2Done;
  const step3Done = step3Result !== null;

  return (
    <div className="space-y-8">
      {/* Step 1 / Step 2 좌우 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="space-y-3">
          <SectionHeader
            num={1}
            title="작업배정 업로드"
            state={step1Done ? "done" : "current"}
          />
          <Step1Assignment result={step1Result} onResult={setStep1Result} />
        </section>

        <section className="space-y-3">
          <SectionHeader
            num={2}
            title="AS 업로드"
            state={step2Done ? "done" : step1Done ? "current" : "locked"}
          />
          {step1Done ? (
            <Step2As result={step2Result} onResult={setStep2Result} />
          ) : (
            <LockedPanel label="작업배정 업로드를 먼저 완료해주세요" />
          )}
        </section>
      </div>

      {/* Step 3 비교 */}
      <section className="space-y-3">
        <SectionHeader
          num={3}
          title="비교 시작"
          state={step3Done ? "done" : canCompare ? "current" : "locked"}
        />
        <Step3Compare
          assignment={step1Result?.ok ? step1Result : null}
          as={step2Result?.ok ? step2Result : null}
          canCompare={canCompare}
          result={step3Result}
          onResult={setStep3Result}
        />
      </section>
    </div>
  );
}

function LockedPanel({ label }: { label: string }) {
  return (
    <Card className="border-dashed bg-muted/20 h-[420px]">
      <CardContent className="h-full flex flex-col items-center justify-center text-center gap-2 px-4">
        <Lock className="h-6 w-6 text-muted-foreground/60" />
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
