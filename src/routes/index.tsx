import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles,
  Zap,
  Database,
  ArrowDown,
  Layers,
  Scissors,
  Cpu,
  Loader2,
  AlertTriangle,
  MessageSquareText,
  Gauge,
  Timer,
} from "lucide-react";
import {
  estimateTokens,
  formatLatency,
  formatTokens,
  splitSentences,
} from "@/lib/compression";
import { runCompressionPipeline, type PipelineResult } from "@/lib/ai-compress.functions";

const DEFAULT_QUERY = "What is the impact of context length on LLM latency in RAG systems?";

const DEFAULT_CONTEXT = `Large language models process input tokens sequentially through a transformer architecture, making context length a primary cost driver for inference. Retrieval-Augmented Generation systems retrieve candidate documents from a vector database and concatenate them into a long prompt. In many production deployments, the retrieved context contains redundant explanations, hedging language, and transitional filler that do not contribute to answering the user query. Studies show that up to 60% of retrieved tokens can be removed without degrading answer quality. Context compression pipelines score sentences by semantic relevance, lexical density, and factual content. Sentences that contain numbers, named entities, technical terms, and explicit definitions receive higher retention scores. Conversely, sentences starting with filler phrases such as "It is important to note" or "In conclusion" are penalized and removed. The compressed context is then passed to the LLM, which reduces the number of forward passes and lowers time-to-first-token. Latency improvements of 30-50% are commonly observed when the input context is cut by half. Token-Diet additionally preserves the semantic flow of the retained sentences so that the answer remains coherent and grounded. The retained context acts as a dynamic, query-specific filter rather than a static truncation strategy. This is especially useful for long-document question answering and customer-support knowledge bases. Reducing context also decreases the memory pressure on the KV cache, allowing higher throughput per GPU. The scoring function is lightweight and runs on the CPU before the LLM call, adding negligible overhead to the pipeline. Overall, context-aware compression improves both the economics and responsiveness of deployed RAG applications.`;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Smart Context Compression Dashboard | Token-Diet" },
      {
        name: "description",
        content:
          "Live RAG context compression: an LLM scores retrieved sentences, strips filler, and answers from dense context — with real token and latency measurements.",
      },
      { property: "og:title", content: "Smart Context Compression Dashboard | Token-Diet" },
      {
        property: "og:description",
        content:
          "Live RAG context compression: an LLM scores retrieved sentences, strips filler, and answers from dense context — with real token and latency measurements.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const compress = useServerFn(runCompressionPipeline);

  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [context, setContext] = useState(DEFAULT_CONTEXT);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleCompress = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRunning(true);
    setResult(null);
    setError(null);
    setElapsed(0);

    const start = Date.now();
    timerRef.current = setInterval(() => setElapsed(Date.now() - start), 60);

    try {
      const res = await compress({ data: { query, context } });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Compression failed. Please try again.");
    } finally {
      if (timerRef.current) clearInterval(timerRef.current);
      setIsRunning(false);
    }
  }, [compress, context, query]);

  const originalSentences = splitSentences(context);
  const originalTokens = result?.traditional.promptTokens ?? estimateTokens(context);
  const compressedTokens = result?.optimized.promptTokens ?? 0;
  const tokenSavings = result ? Math.max(0, originalTokens - compressedTokens) : 0;
  const compressionRatio = result && originalTokens ? Math.round((tokenSavings / originalTokens) * 100) : 0;
  const latencyDrop = result ? result.traditional.latencyMs - result.optimized.latencyMs : 0;

  const maxLatency = result ? Math.max(result.traditional.latencyMs, result.optimized.latencyMs) : 1;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />

      <main className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 text-center">
          <Badge
            variant="secondary"
            className="mb-3 px-3 py-1 text-xs font-medium tracking-wide text-primary"
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Token-Diet Dynamic Context Compressor
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Smart Context Compression Dashboard
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground">
            A live LLM pipeline scores your retrieved sentences, strips filler, and answers twice —
            once from the full context, once from the compressed one — so you can measure the real
            token and latency savings.
          </p>
        </header>

        <section className="mb-8 grid gap-6 lg:grid-cols-12">
          <Card className="glow-card border border-border bg-card/80 backdrop-blur lg:col-span-4">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Database className="h-4 w-4 text-primary" aria-hidden />
                Input Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="query" className="text-sm font-medium text-foreground">
                  User Query
                </label>
                <Input
                  id="query"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask a question that the RAG system should answer..."
                  className="border-input bg-background/50 text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="context" className="text-sm font-medium text-foreground">
                  Raw Retrieved RAG Context
                </label>
                <Textarea
                  id="context"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  rows={12}
                  placeholder="Paste the retrieved context here..."
                  className="resize-none border-input bg-background/50 text-foreground placeholder:text-muted-foreground"
                />
                <p className="text-xs text-muted-foreground">
                  ~{formatTokens(estimateTokens(context))} estimated tokens ·{" "}
                  {originalSentences.length} sentences
                </p>
              </div>
              <Button
                onClick={handleCompress}
                disabled={isRunning || !context.trim() || !query.trim()}
                className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {isRunning ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Scissors className="mr-2 h-4 w-4" aria-hidden />
                )}
                {isRunning ? `Running pipeline… ${formatLatency(elapsed)}` : "Compress Context & Generate"}
              </Button>

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span>{error}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6 lg:col-span-8">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                icon={ArrowDown}
                label="Token Savings"
                value={result ? `${compressionRatio}%` : "—"}
                subtext={
                  result ? `${formatTokens(tokenSavings)} prompt tokens removed` : "Waiting for run"
                }
                accent="success"
              />
              <MetricCard
                icon={Zap}
                label="Latency Drop"
                value={result ? `-${latencyDrop}ms` : "—"}
                subtext={
                  result
                    ? `${formatLatency(result.traditional.latencyMs)} → ${formatLatency(result.optimized.latencyMs)}`
                    : "Measured end-to-end"
                }
                accent="primary"
              />
              <MetricCard
                icon={Layers}
                label="Original Tokens"
                value={formatTokens(originalTokens)}
                subtext={result ? "Measured by the model" : "Estimated from raw context"}
                accent="warning"
              />
              <MetricCard
                icon={Cpu}
                label="New Tokens"
                value={result ? formatTokens(compressedTokens) : "—"}
                subtext="Dense context sent to the LLM"
                accent="info"
              />
            </div>

            {result && (
              <Card className="border border-border bg-card/80 backdrop-blur">
                <CardContent className="pt-6">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Gauge className="h-4 w-4" aria-hidden />
                      Token usage
                    </span>
                    <span className="font-medium text-foreground">
                      {formatTokens(compressedTokens)} / {formatTokens(originalTokens)}
                    </span>
                  </div>
                  <div className="relative h-4 overflow-hidden rounded-full bg-muted">
                    <div
                      className="absolute left-0 top-0 h-full rounded-full bg-primary transition-all duration-700"
                      style={{ width: `${(compressedTokens / originalTokens) * 100}%` }}
                    />
                    <div
                      className="absolute top-0 h-full rounded-full bg-success transition-all duration-700"
                      style={{
                        left: `${(compressedTokens / originalTokens) * 100}%`,
                        width: `${(1 - compressedTokens / originalTokens) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block h-2 w-2 rounded-full bg-primary" />
                      <span className="text-muted-foreground">Retained</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block h-2 w-2 rounded-full bg-success" />
                      <span className="text-muted-foreground">Saved</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border border-border bg-card/80 backdrop-blur">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Timer className="h-4 w-4 text-primary" aria-hidden />
                  Pipeline Comparison
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid gap-0 md:grid-cols-2">
                  <PipelineColumn
                    title="Traditional RAG"
                    subtitle="Full context fed to the LLM"
                    icon={Layers}
                    iconWrapClass="bg-muted"
                    iconClass="text-muted-foreground"
                    badge={<Badge variant="secondary" className="text-xs">Slow</Badge>}
                    isRunning={isRunning}
                    latencyMs={result?.traditional.latencyMs}
                    progress={result ? (result.traditional.latencyMs / maxLatency) * 100 : 0}
                    className="border-b border-border md:border-b-0 md:border-r"
                    contextNode={<p>{context}</p>}
                    answer={result?.traditional.answer}
                  />
                  <PipelineColumn
                    title="Token-Diet RAG"
                    subtitle="Compressed context only"
                    icon={Zap}
                    iconWrapClass="bg-accent/20"
                    iconClass="text-accent"
                    badge={<Badge className="bg-success text-xs text-success-foreground">Fast</Badge>}
                    isRunning={isRunning}
                    latencyMs={result?.optimized.latencyMs}
                    progress={result ? (result.optimized.latencyMs / maxLatency) * 100 : 0}
                    contextNode={
                      result ? (
                        <CompressedText
                          sentences={originalSentences}
                          keptIndices={result.keptIndices}
                        />
                      ) : (
                        <p className="text-muted-foreground">
                          Compressed output will appear here.
                        </p>
                      )
                    }
                    answer={result?.optimized.answer}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <footer className="mt-8 text-center text-xs text-muted-foreground">
          <p>
            Token counts and latencies are measured from real model calls made through Lovable AI.
          </p>
        </footer>
      </main>
    </div>
  );
}

function PipelineColumn({
  title,
  subtitle,
  icon: Icon,
  iconWrapClass,
  iconClass,
  badge,
  isRunning,
  latencyMs,
  progress,
  className = "",
  contextNode,
  answer,
}: {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  iconWrapClass: string;
  iconClass: string;
  badge: React.ReactNode;
  isRunning: boolean;
  latencyMs?: number;
  progress: number;
  className?: string;
  contextNode: React.ReactNode;
  answer?: string;
}) {
  return (
    <div className={`p-5 ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconWrapClass}`}
          >
            <Icon className={`h-4 w-4 ${iconClass}`} aria-hidden />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        {badge}
      </div>

      <div className="mb-4 max-h-52 overflow-y-auto rounded-lg border border-border bg-background/50 p-4 text-sm leading-relaxed text-foreground">
        {isRunning ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-3 w-3/4 rounded bg-muted" />
            <div className="h-3 w-1/2 rounded bg-muted" />
            <div className="h-3 w-5/6 rounded bg-muted" />
          </div>
        ) : (
          contextNode
        )}
      </div>

      <div className="mb-4 rounded-lg border border-border bg-card/60 p-4">
        <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <MessageSquareText className="h-3.5 w-3.5" aria-hidden />
          Model answer
        </p>
        {isRunning ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            Generating…
          </p>
        ) : (
          <p className="text-sm leading-relaxed text-foreground">
            {answer ?? <span className="text-muted-foreground">Run the pipeline to compare answers.</span>}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">End-to-end response time</span>
          <span className="font-medium text-foreground">
            {latencyMs !== undefined ? formatLatency(latencyMs) : "—"}
          </span>
        </div>
        <Progress value={isRunning ? 0 : progress} className="h-2 bg-muted" />
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  subtext,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subtext: string;
  accent: "primary" | "success" | "warning" | "info";
}) {
  const accentClasses = {
    primary: "text-primary bg-primary/10",
    success: "text-success bg-success/10",
    warning: "text-warning bg-warning/10",
    info: "text-info bg-info/10",
  };

  return (
    <Card className="border border-border bg-card/80 backdrop-blur transition-transform hover:-translate-y-0.5">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{subtext}</p>
          </div>
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-lg ${accentClasses[accent]}`}
          >
            <Icon className="h-5 w-5" aria-hidden />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CompressedText({
  sentences,
  keptIndices,
}: {
  sentences: string[];
  keptIndices: number[];
}) {
  const keptSentences = keptIndices.map((i) => sentences[i]).filter(Boolean);

  return (
    <p>
      {keptSentences.map((sentence, index) => (
        <span key={index} className="rounded-sm bg-success/20 px-0.5 font-semibold text-success">
          {sentence}{" "}
        </span>
      ))}
    </p>
  );
}
