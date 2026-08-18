import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Sparkles,
  Zap,
  Clock,
  Database,
  ArrowDown,
  Layers,
  Scissors,
  Cpu,
} from "lucide-react";
import {
  compressContext,
  estimateTokens,
  formatLatency,
  formatTokens,
  splitSentences,
  type CompressionResult,
} from "@/lib/compression";

const DEFAULT_QUERY =
  "What is the impact of context length on LLM latency in RAG systems?";

const DEFAULT_CONTEXT = `Large language models process input tokens sequentially through a transformer architecture, making context length a primary cost driver for inference. Retrieval-Augmented Generation systems retrieve candidate documents from a vector database and concatenate them into a long prompt. In many production deployments, the retrieved context contains redundant explanations, hedging language, and transitional filler that do not contribute to answering the user query. Studies show that up to 60% of retrieved tokens can be removed without degrading answer quality. Context compression pipelines score sentences by semantic relevance, lexical density, and factual content. Sentences that contain numbers, named entities, technical terms, and explicit definitions receive higher retention scores. Conversely, sentences starting with filler phrases such as "It is important to note" or "In conclusion" are penalized and removed. The compressed context is then passed to the LLM, which reduces the number of forward passes and lowers time-to-first-token. Latency improvements of 30-50% are commonly observed when the input context is cut by half. Token-Diet additionally preserves the semantic flow of the retained sentences so that the answer remains coherent and grounded. The retained context acts as a dynamic, query-specific filter rather than a static truncation strategy. This is especially useful for long-document question answering and customer-support knowledge bases. Reducing context also decreases the memory pressure on the KV cache, allowing higher throughput per GPU. The scoring function is lightweight and runs on the CPU before the LLM call, adding negligible overhead to the pipeline. Overall, context-aware compression improves both the economics and responsiveness of deployed RAG applications.`;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      {
        title: "Smart Context Compression Dashboard | Token-Diet",
      },
      {
        name: "description",
        content:
          "Post-retrieval optimization pipeline that scores RAG sentences, strips filler, and sends dense semantic context to the LLM — saving tokens and reducing latency.",
      },
      {
        property: "og:title",
        content: "Smart Context Compression Dashboard | Token-Diet",
      },
      {
        property: "og:description",
        content:
          "Post-retrieval optimization pipeline that scores RAG sentences, strips filler, and sends dense semantic context to the LLM — saving tokens and reducing latency.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [context, setContext] = useState(DEFAULT_CONTEXT);
  const [result, setResult] = useState<CompressionResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [traditionalProgress, setTraditionalProgress] = useState(0);
  const [optimizedProgress, setOptimizedProgress] = useState(0);
  const [traditionalElapsed, setTraditionalElapsed] = useState(0);
  const [optimizedElapsed, setOptimizedElapsed] = useState(0);

  const timersRef = useRef<ReturnType<typeof setInterval>[]>([]);

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach((t) => clearInterval(t));
    timersRef.current = [];
  }, []);

  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  const handleCompress = useCallback(() => {
    clearAllTimers();
    setIsRunning(true);
    setResult(null);
    setTraditionalProgress(0);
    setOptimizedProgress(0);
    setTraditionalElapsed(0);
    setOptimizedElapsed(0);

    // Simulate preprocessing + scoring.
    setTimeout(() => {
      const res = compressContext(context, query);
      setResult(res);

      const startTime = Date.now();

      const traditional = setInterval(() => {
        const elapsed = Date.now() - startTime;
        setTraditionalElapsed(elapsed);
        const progress = Math.min((elapsed / res.latencyMsTraditional) * 100, 100);
        setTraditionalProgress(progress);
        if (elapsed >= res.latencyMsTraditional) {
          clearInterval(traditional);
        }
      }, 60);

      const optimized = setInterval(() => {
        const elapsed = Date.now() - startTime;
        setOptimizedElapsed(elapsed);
        const progress = Math.min((elapsed / res.latencyMsOptimized) * 100, 100);
        setOptimizedProgress(progress);
        if (elapsed >= res.latencyMsOptimized) {
          clearInterval(optimized);
        }
      }, 60);

      timersRef.current.push(traditional, optimized);

      setTimeout(() => {
        setIsRunning(false);
      }, Math.max(res.latencyMsTraditional, res.latencyMsOptimized) + 300);
    }, 400);
  }, [clearAllTimers, context, query]);

  const originalSentences = splitSentences(context);
  const originalTokens = estimateTokens(context);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />

      <main className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 text-center">
          <Badge
            variant="secondary"
            className="mb-3 px-3 py-1 text-xs font-medium tracking-wide text-primary"
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            Token-Diet Dynamic Context Compressor
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Smart Context Compression Dashboard
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground">
            Strip filler, keep meaning. Reduce token spend and LLM latency by
            sending only the dense, semantic sentences retrieved from your RAG
            pipeline.
          </p>
        </header>

        <section className="mb-8 grid gap-6 lg:grid-cols-12">
          <Card className="glow-card border border-border bg-card/80 backdrop-blur lg:col-span-4">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Database className="h-4 w-4 text-primary" />
                Input Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="query"
                  className="text-sm font-medium text-foreground"
                >
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
                <label
                  htmlFor="context"
                  className="text-sm font-medium text-foreground"
                >
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
                  {formatTokens(originalTokens)} estimated tokens ·{" "}
                  {originalSentences.length} sentences
                </p>
              </div>
              <Button
                onClick={handleCompress}
                disabled={isRunning || !context.trim() || !query.trim()}
                className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <Scissors className="mr-2 h-4 w-4" />
                {isRunning ? "Compressing..." : "Compress Context & Generate"}
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-6 lg:col-span-8">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                icon={ArrowDown}
                label="Token Savings"
                value={
                  result ? `${result.compressionRatio}%` : "—"
                }
                subtext={
                  result
                    ? `${formatTokens(result.tokenSavings)} tokens removed`
                    : "Waiting for input"
                }
                accent="success"
              />
              <MetricCard
                icon={Zap}
                label="Latency Drop"
                value={
                  result
                    ? `-${result.latencyMsTraditional - result.latencyMsOptimized}ms`
                    : "—"
                }
                subtext={
                  result
                    ? `${formatLatency(result.latencyMsTraditional)} → ${formatLatency(result.latencyMsOptimized)}`
                    : "Waiting for input"
                }
                accent="primary"
              />
              <MetricCard
                icon={Layers}
                label="Original Tokens"
                value={result ? formatTokens(result.originalTokens) : formatTokens(originalTokens)}
                subtext={"Raw retrieved context"}
                accent="warning"
              />
              <MetricCard
                icon={Cpu}
                label="New Tokens"
                value={
                  result ? formatTokens(result.compressedTokens) : "—"
                }
                subtext={"Dense context passed to LLM"}
                accent="info"
              />
            </div>

            {result && (
              <Card className="border border-border bg-card/80 backdrop-blur">
                <CardContent className="pt-6">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Token usage</span>
                    <span className="font-medium text-foreground">
                      {formatTokens(result.compressedTokens)} /{" "}
                      {formatTokens(result.originalTokens)}
                    </span>
                  </div>
                  <div className="relative h-4 overflow-hidden rounded-full bg-muted">
                    <div
                      className="absolute left-0 top-0 h-full rounded-full bg-primary transition-all duration-700"
                      style={{
                        width: `${(result.compressedTokens / result.originalTokens) * 100}%`,
                      }}
                    />
                    <div
                      className="absolute top-0 h-full rounded-full bg-success transition-all duration-700"
                      style={{
                        left: `${(result.compressedTokens / result.originalTokens) * 100}%`,
                        width: `${(1 - result.compressedTokens / result.originalTokens) * 100}%`,
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
                <CardTitle className="text-base font-semibold">
                  Pipeline Comparison
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid gap-0 md:grid-cols-2">
                  <div className="border-b border-border p-5 md:border-b-0 md:border-r">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                          <Layers className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">
                            Traditional RAG
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            Full context fed to LLM
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        Slow
                      </Badge>
                    </div>

                    <div className="mb-4 rounded-lg border border-border bg-background/50 p-4 text-sm leading-relaxed text-foreground">
                      {isRunning && !result ? (
                        <div className="space-y-2">
                          <div className="h-3 w-3/4 rounded bg-muted" />
                          <div className="h-3 w-1/2 rounded bg-muted" />
                          <div className="h-3 w-5/6 rounded bg-muted" />
                        </div>
                      ) : (
                        <p>{context}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          Time to first token
                        </span>
                        <span className="font-medium text-foreground">
                          {isRunning && !result
                            ? formatLatency(traditionalElapsed)
                            : result
                              ? formatLatency(result.latencyMsTraditional)
                              : "—"}
                        </span>
                      </div>
                      <Progress
                        value={isRunning ? traditionalProgress : result ? 100 : 0}
                        className="h-2 bg-muted"
                      />
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20">
                          <Zap className="h-4 w-4 text-accent" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">
                            Token-Diet RAG
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            Compressed context only
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-success text-xs text-success-foreground">
                        Fast
                      </Badge>
                    </div>

                    <div className="mb-4 rounded-lg border border-border bg-background/50 p-4 text-sm leading-relaxed text-foreground">
                      {isRunning && !result ? (
                        <div className="space-y-2">
                          <div className="h-3 w-3/4 rounded bg-muted" />
                          <div className="h-3 w-1/2 rounded bg-muted" />
                          <div className="h-3 w-5/6 rounded bg-muted" />
                        </div>
                      ) : result ? (
                        <CompressedText
                          sentences={originalSentences}
                          keptIndices={result.keptIndices}
                        />
                      ) : (
                        <p className="text-muted-foreground">
                          Compressed output will appear here.
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          Time to first token
                        </span>
                        <span className="font-medium text-foreground">
                          {isRunning && !result
                            ? formatLatency(optimizedElapsed)
                            : result
                              ? formatLatency(result.latencyMsOptimized)
                              : "—"}
                        </span>
                      </div>
                      <Progress
                        value={isRunning ? optimizedProgress : result ? 100 : 0}
                        className="h-2 bg-muted"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <footer className="mt-8 text-center text-xs text-muted-foreground">
          <p>
            Token-Diet is a simulated demo. Latency and compression metrics are
            approximated for illustration.
          </p>
        </footer>
      </main>
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
            <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">
              {value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{subtext}</p>
          </div>
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-lg ${accentClasses[accent]}`}
          >
            <Icon className="h-4.5 w-4.5" />
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
  const keptSet = new Set(keptIndices);
  return (
    <p>
      {sentences.map((sentence, index) => {
        const isKept = keptSet.has(index);
        return (
          <span
            key={index}
            className={
              isKept
                ? "rounded-sm bg-success/20 px-0.5 font-semibold text-success"
                : ""
            }
          >
            {sentence}{" "}
          </span>
        );
      })}
    </p>
  );
}
