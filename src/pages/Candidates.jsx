import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, ArrowLeft, User, Mail, Calendar } from "lucide-react";
import { toast } from "sonner";



// Stages and colors (use your existing mapping)
const STAGES = [
  { key: "applied", label: "Applied" },
  { key: "screen", label: "Screening" },
  { key: "tech", label: "Technical" },
  { key: "offer", label: "Offer" },
  { key: "hired", label: "Hired" },
  { key: "rejected", label: "Rejected" },
];

const stageColors = {
  applied: 'bg-blue-100 text-blue-800',
  screen: 'bg-yellow-100 text-yellow-800',
  tech: 'bg-purple-100 text-purple-800',
  offer: 'bg-green-100 text-green-800',
  hired: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800'
};



function CandidateCard({ candidate }) {
  if (!candidate) return null;
  return (
    <Card className="mb-3 w-full">
      <CardContent className="p-2 flex flex-col justify-center items-center">
        <div className="flex items-start justify-between gap-3 w-full">
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{candidate.name}</div>
            <div className="text-sm text-gray-500 truncate">{candidate.email}</div>
            <div className="text-xs text-gray-400">
              Applied {new Date(candidate.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 mt-3">
          <Link to={`/candidates/${candidate.id}`}>
            <Button variant="outline" size="sm">
              View Timeline
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function SortableCandidate({ id, candidate }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    touchAction: "none",
    width: "100%",
    display: "block",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <CandidateCard candidate={candidate} />
    </div>
  );
}

function Column({ columnKey, label, items, idToCandidate }) {
  const { isOver, setNodeRef } = useDroppable({ id: columnKey });

  return (
    <div
      ref={setNodeRef}
      className={`bg-white rounded-lg shadow-sm p-4 transition-all ${isOver ? "ring-2 ring-blue-300" : ""}`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">{label}</h3>
        <div className="text-xs text-gray-500">{items.length}</div>
      </div>

      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div className="min-h-[150px] max-h-[70vh] overflow-auto">
          {items.map((id) => (
            <SortableCandidate key={id} id={id} candidate={idToCandidate[id]} />
          ))}

          {items.length === 0 && <div className="text-sm text-gray-400 py-6 text-center">Drop here</div>}
        </div>
      </SortableContext>
    </div>
  );
}

export default function CandidatesKanban() {
  const {id} = useParams()
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState(null);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [page, setPage] = useState(1);

  // Use your existing query (adapted to Kanban usage)
  const { data: candidatesData, isLoading } = useQuery({
    queryKey: ["candidates", search, stageFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        search,
        stage: stageFilter === "all" ? "" : stageFilter,
        page: page.toString(),
        pageSize: "1000",
      });
      const response = await fetch(`/api/candidates?${params}`);
      return response.json();
    },
  });

  const { data: timeline } = useQuery({
    queryKey: ['candidate-timeline', id],
    queryFn: async () => {
      if (!id) return null;
      const response = await fetch(`/api/candidates/${id}/timeline`);
      return response.json();
    },
    enabled: !!id
  });

  // Use your updateCandidateMutation for PATCH (keeps same behavior)
  const updateCandidateMutation = useMutation({
    mutationFn: async ({ candidateId, stage }) => {
      const response = await fetch(`/api/candidates/${candidateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      if (!response.ok) throw new Error("Failed to update candidate");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: ["candidate-timeline"] });
      toast.success("Candidate stage updated successfully");
    },
    onError: () => {
      toast.error("Failed to update candidate stage");
    },
  });


  let candidates = [];
  const raw = candidatesData;
  if (!raw) candidates = [];
  else if (Array.isArray(raw)) candidates = raw;
  else if (Array.isArray(raw.data)) candidates = raw.data;
  else if (Array.isArray(raw.candidates)) candidates = raw.candidates;
  else {
    // unknown shape
    candidates = [];
    console.warn("Unexpected /api/candidates response shape:", raw);
  }

  if (process.env.NODE_ENV !== "production" && candidates.length === 0) {
    candidates = [
      { id: "demo-1", name: "Tomer Levi", email: "tomer@example.com", stage: "applied", createdAt: Date.now() - 86400000 },
      { id: "demo-2", name: "Maya Cohen", email: "maya@example.com", stage: "screen", createdAt: Date.now() - 172800000 },
      { id: "demo-3", name: "Arun Patel", email: "arun@example.com", stage: "tech", createdAt: Date.now() - 259200000 },
    ];
  }

  const { columns, idToCandidate } = useMemo(() => {
    const cols = {};
    const idMap = {};
    STAGES.forEach((s) => (cols[s.key] = []));
    for (const c of candidates) {
      idMap[c.id] = c;
      const stage = c.stage ?? "applied";
      if (!cols[stage]) cols[stage] = [];
      cols[stage].push(c.id);
    }
    return { columns: cols, idToCandidate: idMap };
  }, [candidates]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeIdStr = active.id;
    const overIdStr = over.id;

    // determine destination column
    let destColKey = null;
    if (columns[overIdStr]) {
      // dropped on column area
      destColKey = overIdStr;
    } else {
      // dropped on an item -> find column containing it
      for (const colKey of Object.keys(columns)) {
        if (columns[colKey].includes(overIdStr)) {
          destColKey = colKey;
          break;
        }
      }
    }

    // source column
    let srcColKey = null;
    for (const colKey of Object.keys(columns)) {
      if (columns[colKey].includes(activeIdStr)) {
        srcColKey = colKey;
        break;
      }
    }

    if (!srcColKey || !destColKey) return;
    if (srcColKey === destColKey) return; // no change

    // optimistic update: update candidate stage in the cached candidates object
    const prevAll = queryClient.getQueryData(["candidates", search, stageFilter, page]) ?? queryClient.getQueryData(["candidates"]);
    queryClient.setQueryData(["candidates", search, stageFilter, page], (old) => {
      const copy = old ? JSON.parse(JSON.stringify(old)) : { data: [] };
      if (copy.data) {
        copy.data = copy.data.map((c) => (c.id === activeIdStr ? { ...c, stage: destColKey } : c));
      }
      return copy;
    });
    // also set root candidates key if present
    if (queryClient.getQueryData(["candidates"])) {
      queryClient.setQueryData(["candidates"], (old) => {
        const copy = old ? JSON.parse(JSON.stringify(old)) : { data: [] };
        if (copy.data) {
          copy.data = copy.data.map((c) => (c.id === activeIdStr ? { ...c, stage: destColKey } : c));
        }
        return copy;
      });
    }

    // call backend
    updateCandidateMutation.mutate(
      { candidateId: activeIdStr, stage: destColKey },
      {
        onError: () => {
          toast.error("Failed to move candidate. Reverting.");
          // rollback by invalidating cached queries
          queryClient.invalidateQueries({ queryKey: ["candidates"] });
          queryClient.invalidateQueries({ queryKey: ["candidates", search, stageFilter, page] });
        },
        onSuccess: () => {
          toast.success("Candidate moved");
        },
      }
    );
  };

  if (id && timeline) {
    // Show individual candidate timeline
    const candidate = candidatesData?.data?.find((c) => c.id === id);
    
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-8">
            <Link to="/candidates">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Candidates
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">
              {candidate?.name || 'Candidate Timeline'}
            </h1>
          </div>

          {candidate && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  {candidate.name}
                </CardTitle>
                <CardDescription className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    {candidate.email}
                  </span>
                  <Badge className={stageColors[candidate.stage]}>
                    {candidate.stage}
                  </Badge>
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
              <CardDescription>Track the candidate's progress through hiring stages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {timeline?.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-4 pb-4 border-b last:border-b-0">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={stageColors[entry.stage]}>
                          {entry.stage}
                        </Badge>
                        <span className="text-sm text-gray-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(entry.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      {entry.notes && (
                        <p className="text-sm text-gray-600">{entry.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <h2 className="text-2xl font-bold">Candidates</h2>
        </div>

        <div className="w-80">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search (server-side filter)"
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
        <div className="grid grid-cols-6 gap-4">
          {STAGES.map((s) => (
            <Column key={s.key} columnKey={s.key} label={s.label} items={columns[s.key] || []} idToCandidate={idToCandidate} />
          ))}
        </div>

        <DragOverlay>
          {activeId ? <div className="w-64">{/* overlay card */} <CandidateCard candidate={idToCandidate[activeId]} /></div> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

