export type MaterialDocument = {
  slug: string;
  title: string;
  description: string;
  filename: string;
};
type MaterialVideoFile = {
  duration: string;
  drive: { fileId: string; resourceKey?: string };
};

export type MaterialVideoVersion = "id" | "en" | "mobile";

export type MaterialVideo = MaterialVideoFile & {
  id: string;
  series: "fitur" | "sop";
  title: string;
  description: string;
  versions?: Partial<Record<Exclude<MaterialVideoVersion, "id">,
    MaterialVideoFile & { title?: string; description?: string }>>;
};
export type MaterialCatalog = {
  documents: MaterialDocument[];
  videos: MaterialVideo[];
};
export type MaterialLink = {
  url: string;
  filename: string;
  expiresInSeconds: number;
};
