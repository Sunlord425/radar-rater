export interface Scale {
  id: string;
  name: string;
  order_index: number;
}

export interface Collection {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  scales: Scale[];
  item_count: number;
}

export interface Rating {
  scale_id: string;
  value: number;
}

export interface Item {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  ratings: Rating[];
}

export interface SimilarityResult {
  item_id: string;
  item_name: string;
  similarity: number;
}
