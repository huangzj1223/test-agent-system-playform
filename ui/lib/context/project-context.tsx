"use client";

import * as React from "react";
import { getProjects } from "@/lib/api/projects";
import type { ProjectInfo } from "@/lib/api/types";

interface ProjectContextValue {
  projects: ProjectInfo[];
  refreshProjects: () => Promise<void>;
}

const ProjectContext = React.createContext<ProjectContextValue>({
  projects: [],
  refreshProjects: async () => {},
});

export function useProjectContext() {
  return React.useContext(ProjectContext);
}

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = React.useState<ProjectInfo[]>([]);
  const loadedRef = React.useRef(false);

  const refreshProjects = React.useCallback(async () => {
    try {
      const response = await getProjects({ page_size: 100 });
      if (response.success && response.data) {
        setProjects(response.data);
      }
    } catch (error) {
      console.error("Failed to load projects:", error);
    }
  }, []);

  React.useEffect(() => {
    if (!loadedRef.current) {
      loadedRef.current = true;
      refreshProjects();
    }
  }, [refreshProjects]);

  return (
    <ProjectContext.Provider value={{ projects, refreshProjects }}>
      {children}
    </ProjectContext.Provider>
  );
}
