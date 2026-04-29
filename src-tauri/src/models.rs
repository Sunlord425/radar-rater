use serde::{Deserialize, Serialize};

#[derive(Serialize, Clone)]
pub struct Scale {
    pub id: String,
    pub name: String,
    pub order_index: i32,
}

#[derive(Serialize)]
pub struct Collection {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub created_at: String,
    pub scales: Vec<Scale>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Rating {
    pub scale_id: String,
    pub value: f64,
}

#[derive(Serialize)]
pub struct Item {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub created_at: String,
    pub ratings: Vec<Rating>,
}
