import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import Layout from "../components/layout/Layout.js";
import { DEEP_BLUE_THEME } from "../design-system.js";
import useCurrentUser from "../hooks/use-current-user.js";

export interface CurriculumTopicRecord {
  id: string;
  program: string;
  gradeLevel: number;
  subject: string;
  unit: string;
  title: string;
  description?: string;
  objectives?: string;
  standards?: string;
  prerequisiteIds?: string[];
  durationMinutes?: number;
  difficulty?: string;
  sortOrder?: number;
}

type ViewMode = "catalog" | "roadmap";

const GRADE_OPTIONS = ["all", "0", "1", "2", "3", "4", "5", "6", "7", "8"];

function formatGradeLabel(grade: number): string {
  return grade === 0 ? "Kindergarten (K)" : `Grade ${grade}`;
}

export default function CurriculumRoute() {
  const { user, loading: userLoading, refresh: refreshUser } = useCurrentUser();

  const [topics, setTopics] = useState<CurriculumTopicRecord[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>("catalog");
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedUnit, setSelectedUnit] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Tutor/Admin quick-add topic state
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [savingTopic, setSavingTopic] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [newTopic, setNewTopic] = useState({
    program: "K-8 Core & Coding",
    gradeLevel: 4,
    subject: "Mathematics",
    unit: "Fractions & Decimals",
    title: "",
    description: "",
    objectives: "",
    standards: "CCSS.MATH",
    durationMinutes: 45,
    difficulty: "Core",
    prerequisiteIds: [] as string[],
  });

  const canManageCurriculum = user?.role === "tutor" || user?.role === "admin";

  const loadCurriculum = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/curriculum/topics", {
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      if (res.status === 404) {
        setTopics([]);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        throw new Error(`Unable to load curriculum topics (${res.status})`);
      }

      const payload = await res.json();
      const rawItems = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.data?.items)
          ? payload.data.items
          : Array.isArray(payload?.topics)
            ? payload.topics
            : [];

      const sorted = [...rawItems].sort(
        (a: CurriculumTopicRecord, b: CurriculumTopicRecord) =>
          (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.title.localeCompare(b.title),
      );
      setTopics(sorted);

      if (Array.isArray(payload?.meta?.completedTopicIds)) {
        setCompletedIds(new Set<string>(payload.meta.completedTopicIds));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load curriculum");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCurriculum();
  }, [loadCurriculum]);

  const topicById = useMemo(() => {
    const map = new Map<string, CurriculumTopicRecord>();
    for (const t of topics) {
      map.set(t.id, t);
    }
    return map;
  }, [topics]);

  const subjects = useMemo(() => {
    const set = new Set<string>([
      "Mathematics",
      "English Language Arts",
      "Science",
      "Social Studies",
      "Coding",
    ]);
    for (const item of topics) {
      if (item.subject) set.add(item.subject);
    }
    return ["all", ...Array.from(set)];
  }, [topics]);

  const availableUnits = useMemo(() => {
    const set = new Set<string>();
    for (const item of topics) {
      if (selectedGrade !== "all" && String(item.gradeLevel) !== selectedGrade) continue;
      if (selectedSubject !== "all" && item.subject !== selectedSubject) continue;
      if (item.unit) set.add(item.unit);
    }
    return ["all", ...Array.from(set)];
  }, [topics, selectedGrade, selectedSubject]);

  useEffect(() => {
    if (selectedUnit !== "all" && !availableUnits.includes(selectedUnit)) {
      setSelectedUnit("all");
    }
  }, [availableUnits, selectedUnit]);

  const prerequisiteCandidates = useMemo(() => {
    return topics.filter(
      (t) =>
        t.gradeLevel === Number(newTopic.gradeLevel) &&
        t.subject.toLowerCase() === newTopic.subject.trim().toLowerCase(),
    );
  }, [topics, newTopic.gradeLevel, newTopic.subject]);

  const filteredTopics = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return topics.filter((topic) => {
      if (selectedGrade !== "all" && String(topic.gradeLevel) !== selectedGrade) {
        return false;
      }
      if (selectedSubject !== "all" && topic.subject !== selectedSubject) {
        return false;
      }
      if (selectedUnit !== "all" && topic.unit !== selectedUnit) {
        return false;
      }
      if (q) {
        const haystack = `${topic.title} ${topic.unit} ${topic.subject} ${topic.description ?? ""} ${topic.objectives ?? ""} ${topic.standards ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [topics, selectedGrade, selectedSubject, selectedUnit, searchQuery]);

  const hierarchyTree = useMemo(() => {
    const gradeMap = new Map<
      number,
      {
        gradeLevel: number;
        subjects: Map<
          string,
          {
            subject: string;
            units: Map<string, { unit: string; items: CurriculumTopicRecord[] }>;
          }
        >;
      }
    >();

    for (const topic of filteredTopics) {
      let gradeNode = gradeMap.get(topic.gradeLevel);
      if (!gradeNode) {
        gradeNode = { gradeLevel: topic.gradeLevel, subjects: new Map() };
        gradeMap.set(topic.gradeLevel, gradeNode);
      }

      let subjectNode = gradeNode.subjects.get(topic.subject);
      if (!subjectNode) {
        subjectNode = { subject: topic.subject, units: new Map() };
        gradeNode.subjects.set(topic.subject, subjectNode);
      }

      let unitNode = subjectNode.units.get(topic.unit);
      if (!unitNode) {
        unitNode = { unit: topic.unit, items: [] };
        subjectNode.units.set(topic.unit, unitNode);
      }

      unitNode.items.push(topic);
    }

    return Array.from(gradeMap.values())
      .sort((a, b) => a.gradeLevel - b.gradeLevel)
      .map((g) => ({
        gradeLevel: g.gradeLevel,
        subjects: Array.from(g.subjects.values()).map((s) => ({
          subject: s.subject,
          units: Array.from(s.units.values()),
        })),
      }));
  }, [filteredTopics]);

  const getRoadmapStatus = useCallback(
    (topic: CurriculumTopicRecord): "completed" | "active" | "locked" => {
      if (completedIds.has(topic.id)) return "completed";
      const prereqs = topic.prerequisiteIds ?? [];
      const unmet = prereqs.some((prereqId) => !completedIds.has(prereqId));
      return unmet ? "locked" : "active";
    },
    [completedIds],
  );

  function togglePrerequisiteSelection(prereqId: string) {
    setNewTopic((prev) => {
      const exists = prev.prerequisiteIds.includes(prereqId);
      return {
        ...prev,
        prerequisiteIds: exists
          ? prev.prerequisiteIds.filter((id) => id !== prereqId)
          : [...prev.prerequisiteIds, prereqId],
      };
    });
  }

  async function handleCreateTopic(e: React.FormEvent) {
    e.preventDefault();
    if (!canManageCurriculum) return;
    if (!newTopic.title.trim() || !newTopic.unit.trim()) {
      setFormError("Topic title and unit are required.");
      return;
    }

    setSavingTopic(true);
    setFormError(null);
    try {
      const res = await fetch("/api/v1/curriculum/topics", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newTopic,
          title: newTopic.title.trim(),
          unit: newTopic.unit.trim(),
          description: newTopic.description.trim() || undefined,
          objectives: newTopic.objectives.trim() || undefined,
          gradeLevel: Number(newTopic.gradeLevel),
          durationMinutes: Number(newTopic.durationMinutes) || 45,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error?.message || `Failed to create topic (${res.status})`);
      }

      setNewTopic((prev) => ({
        ...prev,
        title: "",
        description: "",
        objectives: "",
        prerequisiteIds: [],
      }));
      setShowCreateForm(false);
      await loadCurriculum();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save curriculum topic");
    } finally {
      setSavingTopic(false);
    }
  }

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F172A] text-white text-sm">
        Loading curriculum workspace...
      </div>
    );
  }

  return (
    <Layout
      title="Academic & Coding Curriculum"
      breadcrumbs={[
        { label: "Home", to: "/" },
        { label: "Curriculum" },
      ]}
      currentUser={user}
      onSignOut={() => {
        void refreshUser();
      }}
      headerActions={
        canManageCurriculum ? (
          <button
            type="button"
            onClick={() => setShowCreateForm((prev) => !prev)}
            className="rounded-lg px-3.5 py-2 text-xs sm:text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: DEEP_BLUE_THEME.colors.royal700 }}
          >
            {showCreateForm ? "Close Form" : "+ Add Topic"}
          </button>
        ) : undefined
      }
    >
      <div className="space-y-6">
        {/* Deep Blue / Navy Overview Banner */}
        <div
          className="rounded-xl p-5 sm:p-6 text-white flex flex-col md:flex-row md:items-center md:justify-between gap-4"
          style={{
            background: `linear-gradient(120deg, ${DEEP_BLUE_THEME.colors.navy900} 0%, ${DEEP_BLUE_THEME.colors.navy800} 100%)`,
          }}
        >
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-sky-300">
              Grade → Subject → Unit → Topic Hierarchy
            </div>
            <h2 className="mt-1 text-xl font-bold">
              Curriculum Hierarchy & Prerequisite Roadmap
            </h2>
            <p className="mt-1 text-sm text-blue-100/90 max-w-2xl">
              Navigate structured grade bands, subjects, units, learning objectives, standards
              alignment, and topic prerequisites across core academics and coding.
            </p>
          </div>

          {/* View Switcher */}
          <div className="inline-flex rounded-lg bg-[#071126]/70 p-1 self-start md:self-auto border border-white/10">
            <button
              type="button"
              onClick={() => setViewMode("catalog")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                viewMode === "catalog"
                  ? "bg-white text-[#0F172A]"
                  : "text-blue-100 hover:text-white"
              }`}
            >
              Hierarchy Catalog
            </button>
            <button
              type="button"
              onClick={() => setViewMode("roadmap")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                viewMode === "roadmap"
                  ? "bg-white text-[#0F172A]"
                  : "text-blue-100 hover:text-white"
              }`}
            >
              Prerequisite Roadmap
            </button>
          </div>
        </div>

        {/* Tutor / Admin Create Topic Drawer */}
        {canManageCurriculum && showCreateForm && (
          <form
            onSubmit={handleCreateTopic}
            className="rounded-xl bg-white border border-[#CBD5E1] p-5 space-y-4 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-[#0F172A]">
                Create Curriculum Topic
              </h3>
              <span className="text-xs text-[#64748B]">
                Role: {user?.role}
              </span>
            </div>

            {formError && (
              <div className="rounded-lg bg-[#FEE2E2] text-[#991B1B] px-3.5 py-2 text-xs font-medium">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">
                  Grade Level
                </label>
                <select
                  value={newTopic.gradeLevel}
                  onChange={(e) =>
                    setNewTopic((p) => ({
                      ...p,
                      gradeLevel: Number(e.target.value),
                      prerequisiteIds: [],
                    }))
                  }
                  className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm bg-white"
                >
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((g) => (
                    <option key={g} value={g}>
                      {formatGradeLabel(g)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={newTopic.subject}
                  onChange={(e) =>
                    setNewTopic((p) => ({
                      ...p,
                      subject: e.target.value,
                      prerequisiteIds: [],
                    }))
                  }
                  className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm"
                  placeholder="e.g. Mathematics, Coding"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">
                  Unit Name
                </label>
                <input
                  type="text"
                  value={newTopic.unit}
                  onChange={(e) => setNewTopic((p) => ({ ...p, unit: e.target.value }))}
                  className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm"
                  placeholder="e.g. Fractions & Ratios"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">
                  Duration (mins)
                </label>
                <input
                  type="number"
                  min={10}
                  max={240}
                  value={newTopic.durationMinutes}
                  onChange={(e) =>
                    setNewTopic((p) => ({ ...p, durationMinutes: Number(e.target.value) }))
                  }
                  className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">
                  Topic Title
                </label>
                <input
                  type="text"
                  required
                  value={newTopic.title}
                  onChange={(e) => setNewTopic((p) => ({ ...p, title: e.target.value }))}
                  className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm"
                  placeholder="e.g. Equivalent Fractions on Number Lines"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">
                  Standards Alignment
                </label>
                <input
                  type="text"
                  value={newTopic.standards}
                  onChange={(e) => setNewTopic((p) => ({ ...p, standards: e.target.value }))}
                  className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm"
                  placeholder="e.g. CCSS.MATH.CONTENT.3.NF.A.3"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">
                  Overview / Description
                </label>
                <textarea
                  rows={2}
                  value={newTopic.description}
                  onChange={(e) => setNewTopic((p) => ({ ...p, description: e.target.value }))}
                  className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm"
                  placeholder="Brief summary of the topic..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">
                  Learning Objectives
                </label>
                <textarea
                  rows={2}
                  value={newTopic.objectives}
                  onChange={(e) => setNewTopic((p) => ({ ...p, objectives: e.target.value }))}
                  className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm"
                  placeholder="Key skills learners will demonstrate..."
                />
              </div>
            </div>

            {prerequisiteCandidates.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1.5">
                  Prerequisites ({formatGradeLabel(Number(newTopic.gradeLevel))} •{" "}
                  {newTopic.subject || "Subject"})
                </label>
                <div className="flex flex-wrap gap-2">
                  {prerequisiteCandidates.map((cand) => {
                    const checked = newTopic.prerequisiteIds.includes(cand.id);
                    return (
                      <button
                        key={cand.id}
                        type="button"
                        onClick={() => togglePrerequisiteSelection(cand.id)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                          checked
                            ? "bg-[#EFF6FF] border-[#1D4ED8] text-[#1D4ED8]"
                            : "bg-white border-[#CBD5E1] text-[#475569] hover:bg-[#F8FAFC]"
                        }`}
                      >
                        {checked ? "✓ " : "+ "}
                        {cand.title}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="rounded-lg border border-[#CBD5E1] px-4 py-2 text-xs font-medium text-[#475569] hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingTopic}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: DEEP_BLUE_THEME.colors.royal700 }}
              >
                {savingTopic ? "Saving..." : "Save Topic"}
              </button>
            </div>
          </form>
        )}

        {/* Filter Bar */}
        <div className="rounded-xl bg-white border border-[#E2E8F0] p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#475569] mb-1">
              1. Grade Level
            </label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm bg-white"
            >
              {GRADE_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {g === "all" ? "All Grades (K–8)" : formatGradeLabel(Number(g))}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#475569] mb-1">
              2. Subject / Track
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm bg-white"
            >
              {subjects.map((subj) => (
                <option key={subj} value={subj}>
                  {subj === "all" ? "All Subjects" : subj}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#475569] mb-1">
              3. Unit
            </label>
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm bg-white"
            >
              {availableUnits.map((unit) => (
                <option key={unit} value={unit}>
                  {unit === "all" ? "All Units" : unit}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#475569] mb-1">
              Search Topics or Standards
            </label>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search topic, unit, or standard..."
              className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Loading / Error / Content States */}
        {loading ? (
          <div className="rounded-xl bg-white border border-[#E2E8F0] p-8 text-center text-sm text-[#64748B]">
            Loading curriculum topics...
          </div>
        ) : error ? (
          <div className="rounded-xl bg-[#FEE2E2] border border-[#FECACA] p-5 text-sm text-[#991B1B] flex items-center justify-between gap-4">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => void loadCurriculum()}
              className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-[#991B1B] border border-[#FCA5A5]"
            >
              Retry
            </button>
          </div>
        ) : filteredTopics.length === 0 ? (
          <div className="rounded-xl bg-white border border-[#E2E8F0] p-8 text-center">
            <div className="text-base font-semibold text-[#0F172A]">
              No curriculum topics match the current filter
            </div>
            <p className="mt-1 text-sm text-[#64748B]">
              Adjust the grade, subject, or unit filter, or add new curriculum topics to get started.
            </p>
          </div>
        ) : viewMode === "catalog" ? (
          <div className="space-y-6">
            {hierarchyTree.map((gradeGroup) => (
              <section
                key={`grade-${gradeGroup.gradeLevel}`}
                className="rounded-xl bg-white border border-[#E2E8F0] overflow-hidden"
              >
                <div className="px-5 py-3.5 bg-[#0F172A] text-white flex items-center justify-between gap-2">
                  <h3 className="text-base font-bold">
                    {formatGradeLabel(gradeGroup.gradeLevel)}
                  </h3>
                  <span className="text-xs text-blue-200">
                    {gradeGroup.subjects.length}{" "}
                    {gradeGroup.subjects.length === 1 ? "subject" : "subjects"}
                  </span>
                </div>

                <div className="p-4 sm:p-5 space-y-5">
                  {gradeGroup.subjects.map((subjectGroup) => (
                    <div
                      key={`${gradeGroup.gradeLevel}-${subjectGroup.subject}`}
                      className="space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-1.5">
                        <h4 className="text-sm font-bold uppercase tracking-wider text-[#1D4ED8]">
                          {subjectGroup.subject}
                        </h4>
                        <span className="text-xs text-[#64748B]">
                          {subjectGroup.units.length}{" "}
                          {subjectGroup.units.length === 1 ? "unit" : "units"}
                        </span>
                      </div>

                      <div className="space-y-3">
                        {subjectGroup.units.map((unitGroup) => (
                          <div
                            key={`${gradeGroup.gradeLevel}-${subjectGroup.subject}-${unitGroup.unit}`}
                            className="rounded-lg border border-[#E2E8F0] overflow-hidden"
                          >
                            <div className="px-4 py-2.5 bg-[#EFF6FF] border-b border-[#DBEAFE] flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-[#0F172A]">
                                Unit: {unitGroup.unit}
                              </span>
                              <span className="text-xs font-medium text-[#475569]">
                                {unitGroup.items.length}{" "}
                                {unitGroup.items.length === 1 ? "topic" : "topics"}
                              </span>
                            </div>

                            <div className="divide-y divide-[#E2E8F0]">
                              {unitGroup.items.map((topic) => {
                                const isExpanded = expandedTopicId === topic.id;
                                const prereqTitles = (topic.prerequisiteIds ?? [])
                                  .map((pid) => topicById.get(pid)?.title)
                                  .filter((t): t is string => Boolean(t));

                                return (
                                  <div key={topic.id} className="p-4 space-y-2.5">
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                      <div className="space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setExpandedTopicId((prev) =>
                                                prev === topic.id ? null : topic.id,
                                              )
                                            }
                                            className="text-left text-sm font-semibold text-[#0F172A] hover:text-[#1D4ED8]"
                                          >
                                            {topic.title}
                                          </button>
                                          {topic.difficulty && (
                                            <span className="rounded-full bg-[#F1F5F9] text-[#475569] px-2.5 py-0.5 text-xs font-medium">
                                              {topic.difficulty}
                                            </span>
                                          )}
                                        </div>

                                        {topic.objectives && (
                                          <p className="text-sm text-[#475569]">{topic.objectives}</p>
                                        )}

                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#64748B]">
                                          {topic.standards && (
                                            <span>
                                              Standards:{" "}
                                              <strong className="font-medium text-[#334155]">
                                                {topic.standards}
                                              </strong>
                                            </span>
                                          )}
                                          {prereqTitles.length > 0 && (
                                            <span>
                                              Prereqs:{" "}
                                              <strong className="font-medium text-[#334155]">
                                                {prereqTitles.join(", ")}
                                              </strong>
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-3 shrink-0 text-xs">
                                        <span className="font-medium text-[#475569]">
                                          Est. {topic.durationMinutes ?? 45} mins
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setExpandedTopicId((prev) =>
                                              prev === topic.id ? null : topic.id,
                                            )
                                          }
                                          className="font-semibold text-[#1D4ED8] hover:underline"
                                        >
                                          {isExpanded ? "Less" : "Details"}
                                        </button>
                                      </div>
                                    </div>

                                    {isExpanded && (
                                      <div className="rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] p-3.5 text-xs space-y-2">
                                        {topic.description && (
                                          <p className="text-[#334155] leading-relaxed">
                                            {topic.description}
                                          </p>
                                        )}
                                        <div className="flex flex-wrap items-center gap-2 pt-1">
                                          <Link
                                            to="/plans"
                                            className="rounded-md bg-white border border-[#CBD5E1] px-2.5 py-1 font-semibold text-[#0F172A] hover:bg-[#EFF6FF]"
                                          >
                                            Weekly Plans
                                          </Link>
                                          {canManageCurriculum && (
                                            <Link
                                              to="/ai"
                                              className="rounded-md bg-[#EFF6FF] border border-[#BFDBFE] px-2.5 py-1 font-semibold text-[#1D4ED8] hover:bg-[#DBEAFE]"
                                            >
                                              Generate AI Draft
                                            </Link>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          /* Prerequisite Roadmap View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTopics.map((topic) => {
              const status = getRoadmapStatus(topic);
              const badgeStyle =
                status === "completed"
                  ? "bg-[#DCFCE7] text-[#166534]"
                  : status === "active"
                    ? "bg-[#E0F2FE] text-[#075985]"
                    : "bg-[#F1F5F9] text-[#64748B]";

              const prereqTitles = (topic.prerequisiteIds ?? [])
                .map((pid) => topicById.get(pid)?.title)
                .filter((t): t is string => Boolean(t));

              return (
                <div
                  key={topic.id}
                  className="rounded-xl bg-white border border-[#E2E8F0] p-5 flex flex-col justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#1D4ED8]">
                        {formatGradeLabel(topic.gradeLevel)} • {topic.subject}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeStyle}`}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </span>
                    </div>
                    <h3 className="mt-2 text-base font-semibold text-[#0F172A]">
                      {topic.title}
                    </h3>
                    <p className="mt-1 text-xs text-[#64748B]">Unit: {topic.unit}</p>
                    {prereqTitles.length > 0 && (
                      <p className="mt-2 text-xs text-[#475569]">
                        Requires: <span className="font-medium">{prereqTitles.join(", ")}</span>
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-xs text-[#475569]">
                    <span>
                      {prereqTitles.length === 0
                        ? "No prerequisites"
                        : `${prereqTitles.length} prerequisite${prereqTitles.length > 1 ? "s" : ""}`}
                    </span>
                    <span>{topic.durationMinutes ?? 45} min</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}