db = db.getSiblingDB("navaritha");

db.createUser({
  user: "app",
  pwd: "app",
  roles: [
    { role: "readWrite", db: "navaritha" }
  ]
});

db.metadata.insertOne({
  type: "list_of_categories",
  body: [
    {
      category_name: "Heavy Machinery",
      sub_categories: ["Tractor", "Harvester", "JCB", "Others"]
    },
    {
      category_name: "Extension",
      sub_categories: ["Rotavator", "Cultivator", "Seed Drill", "Others"]
    },
    {
      category_name: "Manual Tools",
      sub_categories: ["Sprayers", "Wheelbarrow", "Chainsaw", "Sprinklers"]
    },
    {
      category_name: "Transport",
      sub_categories: ["Trailer", "Trolley", "Others", "XYZ"]
    }
  ]
});
