import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, GitBranch, CheckCircle, Lock, Play } from 'lucide-react';
import type { TopicProgress } from '@/types/quiz';
import { resolvePrerequisites } from '@/data/topicPrerequisites';

interface TopicPrereqGraphProps {
  topics: string[];
  subject: string;
  getProgress: (topic: string) => TopicProgress;
  onSelectTopic: (topic: string) => void;
}

type NodeStatus = 'mastered' | 'in-progress' | 'available' | 'locked';

interface GraphNode {
  name: string;
  displayName: string;
  prerequisites: string[];
  dependents: string[];
  status: NodeStatus;
  /** Depth in the graph (0 = root nodes with no prerequisites) */
  depth: number;
}

const formatName = (name: string) =>
  name.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

function getNodeStatus(
  topicName: string,
  progress: TopicProgress,
  prereqsMastered: boolean,
): NodeStatus {
  // Check if any level is mastered
  const hasMastery = Object.values(progress).some((lp) => lp?.mastered);
  if (hasMastery) return 'mastered';

  // Check if any level has been attempted
  const hasAttempts = Object.values(progress).some((lp) => lp && lp.total > 0);
  if (hasAttempts) return 'in-progress';

  // If all prerequisites are mastered, the topic is available
  if (prereqsMastered) return 'available';

  return 'locked';
}

const statusConfig: Record<
  NodeStatus,
  { bg: string; border: string; text: string; icon: React.ReactNode }
> = {
  mastered: {
    bg: 'bg-emerald-500/20',
    border: 'border-emerald-500',
    text: 'text-emerald-700 dark:text-emerald-300',
    icon: <CheckCircle className="w-4 h-4 text-emerald-500" />,
  },
  'in-progress': {
    bg: 'bg-blue-500/20',
    border: 'border-blue-500',
    text: 'text-blue-700 dark:text-blue-300',
    icon: <Play className="w-4 h-4 text-blue-500" />,
  },
  available: {
    bg: 'bg-primary/10',
    border: 'border-primary/50',
    text: 'text-foreground',
    icon: <Play className="w-4 h-4 text-primary" />,
  },
  locked: {
    bg: 'bg-muted/50',
    border: 'border-muted-foreground/20',
    text: 'text-muted-foreground',
    icon: <Lock className="w-4 h-4 text-muted-foreground" />,
  },
};

export const TopicPrereqGraph = ({
  topics,
  subject,
  getProgress,
  onSelectTopic,
}: TopicPrereqGraphProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Build the full graph
  const graph = useMemo(() => {
    const nodes = new Map<string, GraphNode>();

    // First pass: resolve prerequisites for each topic
    for (const t of topics) {
      const prereqs = resolvePrerequisites(t, topics, subject);
      nodes.set(t, {
        name: t,
        displayName: formatName(t),
        prerequisites: prereqs,
        dependents: [],
        status: 'available',
        depth: 0,
      });
    }

    // Second pass: fill in dependents
    for (const [name, node] of nodes) {
      for (const prereq of node.prerequisites) {
        const prereqNode = nodes.get(prereq);
        if (prereqNode) {
          prereqNode.dependents.push(name);
        }
      }
    }

    // Third pass: compute depth via BFS
    const visited = new Set<string>();
    const queue: string[] = [];

    // Roots = nodes with no prerequisites
    for (const [name, node] of nodes) {
      if (node.prerequisites.length === 0) {
        node.depth = 0;
        visited.add(name);
        queue.push(name);
      }
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentNode = nodes.get(current)!;
      for (const dep of currentNode.dependents) {
        const depNode = nodes.get(dep);
        if (depNode) {
          depNode.depth = Math.max(depNode.depth, currentNode.depth + 1);
          if (!visited.has(dep)) {
            visited.add(dep);
            queue.push(dep);
          }
        }
      }
    }

    // Fourth pass: compute status
    for (const [name, node] of nodes) {
      const progress = getProgress(name);
      const prereqsMastered = node.prerequisites.every((p) => {
        const pp = getProgress(p);
        return Object.values(pp).some((lp) => lp?.mastered);
      });
      node.status = getNodeStatus(name, progress, prereqsMastered);
    }

    return nodes;
  }, [topics, subject, getProgress]);

  // Only show graph if there are prerequisite relationships
  const hasEdges = useMemo(
    () => Array.from(graph.values()).some((n) => n.prerequisites.length > 0),
    [graph],
  );

  // Group nodes by depth for layered display
  // NOTE: all hooks must be called before any early return
  const layers = useMemo(() => {
    const layerMap = new Map<number, GraphNode[]>();
    for (const node of graph.values()) {
      const existing = layerMap.get(node.depth) || [];
      existing.push(node);
      layerMap.set(node.depth, existing);
    }
    const sorted = Array.from(layerMap.entries()).sort((a, b) => a[0] - b[0]);
    const statusOrder: Record<NodeStatus, number> = {
      mastered: 0,
      'in-progress': 1,
      available: 2,
      locked: 3,
    };
    for (const [, nodes] of sorted) {
      nodes.sort(
        (a, b) => statusOrder[a.status] - statusOrder[b.status],
      );
    }
    return sorted;
  }, [graph]);

  const stats = useMemo(() => {
    const all = Array.from(graph.values());
    return {
      mastered: all.filter((n) => n.status === 'mastered').length,
      inProgress: all.filter((n) => n.status === 'in-progress').length,
      available: all.filter((n) => n.status === 'available').length,
      locked: all.filter((n) => n.status === 'locked').length,
      total: all.length,
    };
  }, [graph]);

  if (!hasEdges || topics.length < 3) return null;

  return (
    <div className="bg-card rounded-xl shadow-card overflow-hidden mb-4">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
            <GitBranch className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-foreground text-sm">
              Learning Path
            </h3>
            <p className="text-xs text-muted-foreground">
              {stats.mastered}/{stats.total} topics mastered
              {stats.locked > 0 && ` · ${stats.locked} locked`}
            </p>
          </div>
        </div>
        <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        </motion.div>
      </button>

      {/* Graph */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 space-y-3">
              {/* Legend */}
              <div className="flex flex-wrap gap-3 text-xs">
                {(['mastered', 'in-progress', 'available', 'locked'] as const).map(
                  (status) => (
                    <div key={status} className="flex items-center gap-1">
                      {statusConfig[status].icon}
                      <span className="text-muted-foreground capitalize">
                        {status.replace('-', ' ')}
                      </span>
                    </div>
                  ),
                )}
              </div>

              {/* Layered graph */}
              {layers.map(([depth, nodes]) => (
                <div key={depth}>
                  {depth > 0 && (
                    <div className="flex items-center gap-2 mb-2 ml-2">
                      <ChevronRight className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                        Requires above
                      </span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {nodes.map((node) => {
                      const config = statusConfig[node.status];
                      const isClickable =
                        node.status !== 'locked';

                      return (
                        <motion.button
                          key={node.name}
                          onClick={() =>
                            isClickable && onSelectTopic(node.name)
                          }
                          disabled={!isClickable}
                          className={`
                            flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium
                            transition-all ${config.bg} ${config.border} ${config.text}
                            ${isClickable ? 'hover:scale-105 cursor-pointer' : 'cursor-not-allowed opacity-70'}
                          `}
                          whileHover={isClickable ? { scale: 1.05 } : undefined}
                          whileTap={isClickable ? { scale: 0.97 } : undefined}
                          title={
                            node.status === 'locked'
                              ? `Requires: ${node.prerequisites.map(formatName).join(', ')}`
                              : node.displayName
                          }
                        >
                          {config.icon}
                          <span className="truncate max-w-[120px]">
                            {node.displayName}
                          </span>
                          {node.prerequisites.length > 0 && (
                            <span className="text-[10px] opacity-60">
                              ({node.prerequisites.length})
                            </span>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
