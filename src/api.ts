import { invoke } from "@tauri-apps/api/core";
import type { Collection, Item, Rating, Scale, SimilarityResult } from "./types";

export const api = {
  listCollections: () => invoke<Collection[]>("list_collections"),

  createCollection: (name: string, description: string | null, scaleNames: string[]) =>
    invoke<Collection>("create_collection", { name, description, scaleNames }),

  deleteCollection: (id: string) => invoke<void>("delete_collection", { id }),

  listItems: (collectionId: string) =>
    invoke<Item[]>("list_items", { collectionId }),

  createItem: (
    collectionId: string,
    name: string,
    description: string | null,
    ratings: Rating[]
  ) => invoke<Item>("create_item", { collectionId, name, description, ratings }),

  deleteItem: (id: string) => invoke<void>("delete_item", { id }),

  updateItem: (id: string, name: string, description: string | null, ratings: Rating[]) =>
    invoke<Item>("update_item", { id, name, description, ratings }),

  updateCollection: (id: string, name: string, description: string | null) =>
    invoke<void>("update_collection", { id, name, description }),

  rankBySimilarity: (collectionId: string, anchorItemId: string) =>
    invoke<SimilarityResult[]>("rank_by_similarity", { collectionId, anchorItemId }),

  renameScale: (scaleId: string, name: string) =>
    invoke<void>("rename_scale", { scaleId, name }),

  deleteScale: (scaleId: string) =>
    invoke<void>("delete_scale", { scaleId }),

  reorderScales: (scaleIds: string[]) =>
    invoke<void>("reorder_scales", { scaleIds }),

  addScale: (collectionId: string, name: string) =>
    invoke<Scale>("add_scale", { collectionId, name }),
};
