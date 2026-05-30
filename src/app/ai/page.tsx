"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { IPL_VENUES, getVenueLabel, VENUE_COUNTRIES } from "@/data/iplVenues";
import { parseBothTeams, validateTeamNameInputs } from "@/lib/ai/teamInputParser";
import type { MatchResult } from "@/lib/ai/matchSchema";
import {
  loadMatchHistory,
  saveMatchToHistory,
  downloadPdfFromBase64,
  type MatchHistoryEntry,
} from "@/lib/ai/matchHistory";
import {
  buildSimModeConfig,
  FRANCHISE_COMPETITIONS,
  FRANCHISE_EXAMPLE_TEAM_A,
  FRANCHISE_EXAMPLE_TEAM_B,
  getFranchiseMeta,
  LEGENDS_EXAMPLE_TEAM_A,
  LEGENDS_EXAMPLE_TEAM_B,
  type FranchiseCompetition,
  type SimTab,
} from "@/lib/ai/simModes";
import { ParsedPreview } from "@/components/ai/ParsedPreview";
import { MatchHistoryList, MatchPdfPreview } from "@/components/ai/MatchHistoryList";

export default function AiMatchPage() {
  const [simTab, setSimTab] = useState<SimTab>("franchise");
  const [competition, setCompetition] = useState<FranchiseCompetition>("ipl");

  const [teamAText, setTeamAText] = useState("");
  const [teamBText, setTeamBText] = useState("");
  const [teamAName, setTeamAName] = useState("");
  const [teamBName, setTeamBName] = useState("");
  const [overs, setOvers] = useState(20);
  const [venueId, setVenueId] = useState("chepauk");
  const [stage, setStage] = useState("League");
  const [venueSearch, setVenueSearch] = useState("");

  const [step, setStep] = useState<"idle" | "parsing" | "ai" | "pdf" | "done">("idle");
  const [error, setError] = useState("");
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [pdfBase64, setPdfBase64] = useState("");
  const [pdfFileName, setPdfFileName] = useState("");
  const [history, setHistory] = useState<MatchHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [lastSimulationMode, setLastSimulationMode] = useState<string>("");

  const simMode = useMemo(
    () => buildSimModeConfig(simTab, competition, stage),
    [simTab, competition, stage],
  );

  const franchiseStages = useMemo(
    () => getFranchiseMeta(competition).stageOptions,
    [competition],
  );

  useEffect(() => {
    setHistory(loadMatchHistory());
  }, []);

  const applyTabDefaults = useCallback((tab: SimTab, comp: FranchiseCompetition = competition) => {
    const mode = buildSimModeConfig(tab, comp);
    setVenueId(mode.defaultVenueId);
    if (tab === "legends") {
      setStage("Legends League");
      setTeamAName("Sunrisers Hyderabad");
      setTeamBName("Royal Challengers Bangalore");
    } else {
      const meta = getFranchiseMeta(comp);
      setStage(meta.stageOptions[0]);
      if (!teamAText.trim() && !teamBText.trim()) {
        setTeamAName("");
        setTeamBName("");
      }
    }
  }, [competition, teamAText, teamBText]);

  const switchTab = (tab: SimTab) => {
    setSimTab(tab);
    setMatch(null);
    setPdfBase64("");
    setError("");
    setStep("idle");
    if (tab === "legends") {
      applyTabDefaults("legends");
    } else {
      applyTabDefaults("franchise", competition);
    }
  };

  const onCompetitionChange = (comp: FranchiseCompetition) => {
    setCompetition(comp);
    const meta = getFranchiseMeta(comp);
    setStage(meta.stageOptions[0]);
    setVenueId(meta.defaultVenue);
  };

  const parsed = useMemo(() => {
    if (!teamAText.trim() && !teamBText.trim()) {
      return { teamA: null, teamB: null, errors: [] as string[], warnings: [] as string[] };
    }
    return parseBothTeams(teamAText, teamBText, teamAName, teamBName, overs);
  }, [teamAText, teamBText, teamAName, teamBName, overs]);

  const filteredVenues = useMemo(() => {
    const q = venueSearch.toLowerCase();
    if (!q) return IPL_VENUES;
    return IPL_VENUES.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.city.toLowerCase().includes(q) ||
        v.shortName.toLowerCase().includes(q) ||
        v.country.toLowerCase().includes(q),
    );
  }, [venueSearch]);

  const refreshHistory = useCallback(() => {
    setHistory(loadMatchHistory());
  }, []);

  const handleAnalyze = async () => {
    setError("");
    setMatch(null);
    setPdfBase64("");
    setStep("parsing");

    const nameErrors = validateTeamNameInputs(teamAText, teamBText, teamAName, teamBName);
    if (parsed.errors.length || nameErrors.length || !parsed.teamA || !parsed.teamB) {
      setError([...nameErrors, ...parsed.errors].join("; ") || "Could not parse team sheets");
      setStep("idle");
      return;
    }

    setStep("ai");

    const pairKey = `sim-margins:${simTab}:${teamAName || parsed.teamA?.name}:${teamBName || parsed.teamB?.name}`;
    let avoidMargins: string[] = [];
    try {
      const raw = sessionStorage.getItem(pairKey);
      if (raw) avoidMargins = JSON.parse(raw) as string[];
    } catch {
      avoidMargins = [];
    }

    try {
      const res = await fetch("/api/ai/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamAText,
          teamBText,
          teamAName: parsed.teamA.name,
          teamBName: parsed.teamB.name,
          overs,
          venueId,
          stage: simMode.stage,
          simTab,
          competition: simTab === "franchise" ? competition : undefined,
          avoidMargins,
        }),
      });

      setStep("pdf");
      const data = (await res.json()) as {
        success: boolean;
        error?: string;
        details?: string[];
        match?: MatchResult;
        pdfBase64?: string;
        pdfFileName?: string;
        simulationId?: string;
        simulationMode?: string;
        llmFallbackReason?: string;
      };

      if (!res.ok || !data.success || !data.match || !data.pdfBase64) {
        const detail = data.details?.join("; ");
        setError(detail ? `${data.error}: ${detail}` : data.error || "Simulation failed");
        setStep("idle");
        return;
      }

      setMatch(data.match);
      setPdfBase64(data.pdfBase64);
      setPdfFileName(data.pdfFileName || "Match_Scorecard.pdf");
      setLastSimulationMode(data.simulationMode ?? "local");
      setStep("done");

      if (data.match?.result?.margin) {
        const next = [data.match.result.margin, ...avoidMargins].slice(0, 5);
        try {
          sessionStorage.setItem(pairKey, JSON.stringify(next));
        } catch {
          /* ignore */
        }
      }

      const venue = IPL_VENUES.find((v) => v.id === venueId);
      const entry: MatchHistoryEntry = {
        id: data.simulationId || String(Date.now()),
        createdAt: Date.now(),
        teamNames: [data.match.innings[0].teamName, data.match.innings[1].teamName],
        overs,
        venue: venue ? getVenueLabel(venue) : venueId,
        winner: data.match.result.winner,
        pdfBase64: data.pdfBase64,
        match: data.match,
      };
      saveMatchToHistory(entry);
      refreshHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
      setStep("idle");
    }
  };

  const handleViewHistory = (entry: MatchHistoryEntry) => {
    if (entry.match) setMatch(entry.match);
    if (entry.pdfBase64) {
      setPdfBase64(entry.pdfBase64);
      setPdfFileName(`Match_${entry.id}.pdf`);
    }
    setShowHistory(false);
    setStep("done");
  };

  const loadExample = () => {
    if (simTab === "legends") {
      setTeamAText(LEGENDS_EXAMPLE_TEAM_A);
      setTeamBText(LEGENDS_EXAMPLE_TEAM_B);
      setTeamAName("Sunrisers Hyderabad");
      setTeamBName("Royal Challengers Bangalore");
      setVenueId("chinnaswamy");
      setStage("Legends League");
    } else {
      setTeamAText(FRANCHISE_EXAMPLE_TEAM_A);
      setTeamBText(FRANCHISE_EXAMPLE_TEAM_B);
      setTeamAName("Chennai Super Kings");
      setTeamBName("Delhi Capitals");
      setVenueId(getFranchiseMeta(competition).defaultVenue);
      setStage(getFranchiseMeta(competition).stageOptions[0]);
    }
  };

  const stepLabel =
    step === "parsing"
      ? "Validating squads…"
      : step === "ai"
        ? "Simulating match…"
        : step === "pdf"
          ? "Generating scorecard PDF…"
          : "";

  const tabBtn = (tab: SimTab, label: string, sub: string) => (
    <button
      type="button"
      onClick={() => switchTab(tab)}
      className={`flex-1 py-2.5 px-3 rounded-xl border text-left transition-colors ${
        simTab === tab
          ? "border-ipl-gold/60 bg-ipl-gold/15 text-ipl-gold"
          : "border-ipl-border/50 bg-ipl-purple/10 text-gray-400 hover:border-ipl-border"
      }`}
    >
      <span className="block text-xs font-bold tracking-wide">{label}</span>
      <span className="block text-[9px] opacity-80 mt-0.5">{sub}</span>
    </button>
  );

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link href="/" className="text-xs text-gray-400 hover:text-ipl-gold">
          ← Home
        </Link>
        <div className="text-center flex-1 px-2">
          <h1 className="text-sm font-black tracking-tight">
            <span className="bg-gradient-to-r from-ipl-gold via-yellow-300 to-ipl-gold bg-clip-text text-transparent">
              AI Match Simulator
            </span>
          </h1>
          <p className="text-[9px] text-gray-500 tracking-wider uppercase">
            {simTab === "legends" ? "Legends League" : `${simMode.competitionLabel} · T20`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/ai/points" className="text-[10px] text-green-400 border border-green-500/30 rounded-lg px-2 py-0.5">
            Points
          </Link>
          <button
            type="button"
            onClick={() => setShowHistory((s) => !s)}
            className="text-xs text-ipl-gold"
          >
            History
          </button>
        </div>
      </header>

      <main className="app-main overflow-y-auto px-3 py-3 space-y-3">
        {showHistory ? (
          <div>
            <p className="text-xs text-gray-400 mb-2">Recent simulations (stored locally)</p>
            <MatchHistoryList entries={history} onRefresh={refreshHistory} onView={handleViewHistory} />
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              {tabBtn("franchise", "Franchise Leagues", "IPL · BBL · Hundred · SA20")}
              {tabBtn("legends", "Legends League", "All-time fantasy XI")}
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={loadExample}
                className="text-[10px] px-3 py-1.5 rounded-lg border border-ipl-border/60 text-gray-400"
              >
                Load {simTab === "legends" ? "Legends" : competition.toUpperCase()} example
              </button>
              {lastSimulationMode && step === "done" && (
                <span className="text-[9px] text-gray-500 self-center">
                  Engine: {lastSimulationMode === "llm" ? "AI + stats" : "Local stats"}
                </span>
              )}
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                  Team A sheet
                </label>
                <input
                  type="text"
                  value={teamAName}
                  onChange={(e) => setTeamAName(e.target.value)}
                  placeholder="Team name (required, e.g. SRH)"
                  className="pro-input text-xs py-2"
                  required
                />
                <textarea
                  value={teamAText}
                  onChange={(e) => setTeamAText(e.target.value)}
                  placeholder="Playing XI, impact player, bowling quota…"
                  rows={12}
                  className="pro-input text-xs font-mono leading-relaxed resize-y min-h-[180px]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                  Team B sheet
                </label>
                <input
                  type="text"
                  value={teamBName}
                  onChange={(e) => setTeamBName(e.target.value)}
                  placeholder="Team name (required, e.g. KKR)"
                  className="pro-input text-xs py-2"
                  required
                />
                <textarea
                  value={teamBText}
                  onChange={(e) => setTeamBText(e.target.value)}
                  placeholder="Playing XI, impact player, bowling quota…"
                  rows={12}
                  className="pro-input text-xs font-mono leading-relaxed resize-y min-h-[180px]"
                />
              </div>
            </div>

            <div className={`grid gap-3 ${simTab === "franchise" ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
              {simTab === "franchise" && (
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold block mb-1">
                    Competition
                  </label>
                  <select
                    value={competition}
                    onChange={(e) => onCompetitionChange(e.target.value as FranchiseCompetition)}
                    className="pro-input text-sm py-2"
                  >
                    {FRANCHISE_COMPETITIONS.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold block mb-1">
                  Overs (1–20)
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={overs}
                  onChange={(e) => setOvers(Math.min(20, Math.max(1, Number(e.target.value) || 20)))}
                  className="pro-input text-sm py-2"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold block mb-1">
                  Stage
                </label>
                <select
                  value={stage}
                  onChange={(e) => setStage(e.target.value)}
                  className="pro-input text-sm py-2"
                  disabled={simTab === "legends"}
                >
                  {(simTab === "legends" ? ["Legends League", "Legends Final"] : franchiseStages).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold block mb-1">
                  Stadium
                </label>
                <input
                  type="text"
                  value={venueSearch}
                  onChange={(e) => setVenueSearch(e.target.value)}
                  placeholder="Search venue…"
                  className="pro-input text-xs py-2 mb-1"
                />
                <select
                  value={venueId}
                  onChange={(e) => setVenueId(e.target.value)}
                  className="pro-input text-xs py-2"
                >
                  {venueSearch.trim()
                    ? filteredVenues.map((v) => (
                        <option key={v.id} value={v.id}>{getVenueLabel(v)}</option>
                      ))
                    : VENUE_COUNTRIES.map((country) => (
                        <optgroup key={country} label={country}>
                          {IPL_VENUES.filter((v) => v.country === country).map((v) => (
                            <option key={v.id} value={v.id}>{v.shortName} — {v.city}</option>
                          ))}
                        </optgroup>
                      ))}
                </select>
              </div>
            </div>

            {simTab === "legends" && (
              <p className="text-[10px] text-gray-500 border border-ipl-border/30 rounded-lg px-3 py-2">
                Legends mode uses a dedicated AI prompt and IPL Legends Fantasy PDF layout — higher scores,
                cinematic match summary, and all-time star narratives.
              </p>
            )}

            <ParsedPreview
              teamA={parsed.teamA}
              teamB={parsed.teamB}
              errors={parsed.errors}
              warnings={parsed.warnings}
            />

            <button
              type="button"
              onClick={handleAnalyze}
              disabled={step !== "idle" && step !== "done"}
              className="w-full py-3.5 bid-btn rounded-2xl text-black font-black text-sm disabled:opacity-50"
            >
              {step !== "idle" && step !== "done" ? stepLabel : `Simulate ${simMode.competitionLabel} Match`}
            </button>

            {error && (
              <p className="text-red-400 text-xs text-center bg-red-500/10 border border-red-500/20 rounded-lg py-2 px-3">
                {error}
              </p>
            )}

            {match && step === "done" && (
              <div className="rounded-2xl border border-ipl-gold/30 bg-ipl-purple/20 p-4 space-y-3">
                <div>
                  <p className="text-lg font-bold text-ipl-gold">
                    {match.result.summary || `${match.result.winner} won ${match.result.margin}`}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {match.innings[0].teamName} {match.innings[0].totalRuns}/{match.innings[0].totalWickets} vs{" "}
                    {match.innings[1].teamName} {match.innings[1].totalRuns}/{match.innings[1].totalWickets}
                  </p>
                  <p className="text-xs text-gray-500">
                    {match.leagueBanner ?? match.stage} · Toss: {match.toss.winner} ({match.toss.decisionText})
                  </p>
                  <p className="text-xs text-ipl-gold mt-1">
                    Player of the Match:{" "}
                    {Array.isArray(match.playerOfTheMatch)
                      ? match.playerOfTheMatch.join(" & ")
                      : match.playerOfTheMatch}
                  </p>
                </div>

                {pdfBase64 && (
                  <>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => downloadPdfFromBase64(pdfBase64, pdfFileName)}
                        className="text-xs px-4 py-2 rounded-xl bg-ipl-gold text-black font-bold"
                      >
                        Download PDF
                      </button>
                    </div>
                    <MatchPdfPreview pdfBase64={pdfBase64} />
                  </>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
