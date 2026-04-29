import { invoke } from "@tauri-apps/api/core";
import type { Collection, Item, Rating } from "./types";

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
};
