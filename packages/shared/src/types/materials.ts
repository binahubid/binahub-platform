export type MaterialDocument = {
  slug: string;
  title: string;
  description: string;
  filename: string;
};
export type MaterialVideo = {
  id: string;
  series: "fitur" | "sop";
  title: string;
  description: string;
  duration: string;
  drive: { fileId: string; resourceKey?: string };
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
