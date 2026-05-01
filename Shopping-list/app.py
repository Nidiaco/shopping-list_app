import sqlite3
import os
import uuid
from datetime import datetime
from flask import Flask, jsonify, request, send_from_directory
from meals_data import MEALS

app = Flask(__name__, static_folder="static")
DB_PATH = os.path.join(os.path.dirname(__file__), "shopping.db")

# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS shopping_list (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS item (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 1,
            category TEXT NOT NULL DEFAULT 'Other',
            checked INTEGER NOT NULL DEFAULT 0,
            shopping_list_id TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (shopping_list_id) REFERENCES shopping_list(id) ON DELETE CASCADE
        );
    """)
    conn.commit()
    conn.close()


def row_to_dict(row):
    return dict(row) if row else None


def now_iso():
    return datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")


# ---------------------------------------------------------------------------
# Serve frontend
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    return send_from_directory("static", "index.html")


# ---------------------------------------------------------------------------
# Shopping List endpoints
# ---------------------------------------------------------------------------

@app.route("/api/lists", methods=["GET"])
def get_lists():
    conn = get_db()
    lists = [dict(r) for r in conn.execute(
        "SELECT * FROM shopping_list ORDER BY updated_at DESC"
    ).fetchall()]
    for lst in lists:
        lst["items"] = [dict(r) for r in conn.execute(
            "SELECT * FROM item WHERE shopping_list_id = ? ORDER BY checked ASC, category ASC, created_at DESC",
            (lst["id"],)
        ).fetchall()]
        # Convert checked from int to bool for JSON
        for item in lst["items"]:
            item["checked"] = bool(item["checked"])
    conn.close()
    return jsonify(lists)


@app.route("/api/lists", methods=["POST"])
def create_list():
    body = request.get_json(force=True)
    list_id = str(uuid.uuid4())[:25].replace("-", "")
    name = body.get("name", "New List")
    now = now_iso()
    conn = get_db()
    conn.execute(
        "INSERT INTO shopping_list (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)",
        (list_id, name, now, now)
    )
    conn.commit()
    row = dict(conn.execute("SELECT * FROM shopping_list WHERE id = ?", (list_id,)).fetchone())
    row["items"] = []
    conn.close()
    return jsonify(row), 201


@app.route("/api/lists/<list_id>", methods=["PATCH"])
def update_list(list_id):
    body = request.get_json(force=True)
    now = now_iso()
    conn = get_db()
    conn.execute(
        "UPDATE shopping_list SET name = ?, updated_at = ? WHERE id = ?",
        (body.get("name", ""), now, list_id)
    )
    conn.commit()
    row = dict(conn.execute("SELECT * FROM shopping_list WHERE id = ?", (list_id,)).fetchone())
    row["items"] = [dict(r) for r in conn.execute(
        "SELECT * FROM item WHERE shopping_list_id = ?", (list_id,)
    ).fetchall()]
    for item in row["items"]:
        item["checked"] = bool(item["checked"])
    conn.close()
    return jsonify(row)


@app.route("/api/lists/<list_id>", methods=["DELETE"])
def delete_list(list_id):
    conn = get_db()
    conn.execute("DELETE FROM shopping_list WHERE id = ?", (list_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": True})


# ---------------------------------------------------------------------------
# Item endpoints
# ---------------------------------------------------------------------------

@app.route("/api/items", methods=["POST"])
def create_item():
    body = request.get_json(force=True)
    item_id = str(uuid.uuid4())[:25].replace("-", "")
    now = now_iso()
    conn = get_db()
    conn.execute(
        """INSERT INTO item (id, name, quantity, category, shopping_list_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (
            item_id,
            body["name"],
            body.get("quantity", 1),
            body.get("category", "Other"),
            body["shoppingListId"],
            now, now
        )
    )
    # Touch parent list
    conn.execute("UPDATE shopping_list SET updated_at = ? WHERE id = ?", (now, body["shoppingListId"]))
    conn.commit()
    row = dict(conn.execute("SELECT * FROM item WHERE id = ?", (item_id,)).fetchone())
    row["checked"] = bool(row["checked"])
    conn.close()
    return jsonify(row), 201


@app.route("/api/items/<item_id>", methods=["PATCH"])
def update_item(item_id):
    body = request.get_json(force=True)
    conn = get_db()
    now = now_iso()
    # Build dynamic SET clause
    allowed = {"name", "quantity", "category", "checked"}
    sets = []
    vals = []
    for key, val in body.items():
        col = key
        if col in allowed:
            if col == "checked":
                val = 1 if val else 0
            sets.append(f"{col} = ?")
            vals.append(val)
    sets.append("updated_at = ?")
    vals.append(now)
    vals.append(item_id)
    conn.execute(f"UPDATE item SET {', '.join(sets)} WHERE id = ?", vals)
    conn.commit()
    row = dict(conn.execute("SELECT * FROM item WHERE id = ?", (item_id,)).fetchone())
    row["checked"] = bool(row["checked"])
    # Touch parent list
    conn.execute("UPDATE shopping_list SET updated_at = ? WHERE id = ?", (now, row["shopping_list_id"]))
    conn.commit()
    conn.close()
    return jsonify(row)


@app.route("/api/items/<item_id>", methods=["DELETE"])
def delete_item(item_id):
    conn = get_db()
    row = conn.execute("SELECT shopping_list_id FROM item WHERE id = ?", (item_id,)).fetchone()
    conn.execute("DELETE FROM item WHERE id = ?", (item_id,))
    if row:
        conn.execute("UPDATE shopping_list SET updated_at = ? WHERE id = ?", (now_iso(), row["shopping_list_id"]))
    conn.commit()
    conn.close()
    return jsonify({"success": True})


# MEALS is imported from meals_data.py at the top of this file


@app.route("/api/meals", methods=["GET"])
def get_meals():
    return jsonify(MEALS)


@app.route("/api/meals/add-to-list", methods=["POST"])
def add_meals_to_list():
    body = request.get_json(force=True)
    list_id = body.get("shoppingListId")
    meal_ids = body.get("mealIds", [])

    if not list_id or not meal_ids:
        return jsonify({"error": "Missing shoppingListId or mealIds"}), 400

    # Collect and merge ingredients from all selected meals
    merged = {}
    for meal in MEALS:
        if meal["id"] in meal_ids:
            for ing in meal["ingredients"]:
                key = ing["name"].lower()
                if key in merged:
                    merged[key]["quantity"] += ing["quantity"]
                else:
                    merged[key] = {
                        "name": ing["name"],
                        "quantity": ing["quantity"],
                        "category": ing["category"],
                    }

    conn = get_db()
    now = now_iso()
    added = []
    for ing in merged.values():
        item_id = str(uuid.uuid4())[:25].replace("-", "")
        conn.execute(
            """INSERT INTO item (id, name, quantity, category, shopping_list_id, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (item_id, ing["name"], ing["quantity"], ing["category"], list_id, now, now)
        )
        added.append(ing["name"])
    conn.execute("UPDATE shopping_list SET updated_at = ? WHERE id = ?", (now, list_id))
    conn.commit()
    conn.close()
    return jsonify({"added": added, "count": len(added)})


@app.route("/api/meals/suggest", methods=["POST"])
def suggest_meals():
    body = request.get_json(force=True)
    user_ingredients = [i.strip().lower() for i in body.get("ingredients", []) if i.strip()]

    if not user_ingredients:
        return jsonify([])

    results = []
    for meal in MEALS:
        matched = []
        missing = []
        for ing in meal["ingredients"]:
            name_lower = ing["name"].lower()
            # Check if any user ingredient is a substring match
            found = any(ui in name_lower or name_lower in ui for ui in user_ingredients)
            if found:
                matched.append(ing["name"])
            else:
                missing.append(ing["name"])
        if matched:  # At least 1 ingredient matches
            results.append({
                **meal,
                "matched": matched,
                "missing": missing,
                "matchCount": len(matched),
                "totalCount": len(meal["ingredients"]),
                "matchPct": round(len(matched) / len(meal["ingredients"]) * 100),
            })

    results.sort(key=lambda r: (-r["matchPct"], -r["matchCount"]))
    return jsonify(results)


# ---------------------------------------------------------------------------
# Seed helper
# ---------------------------------------------------------------------------

def seed_db():
    conn = get_db()
    count = conn.execute("SELECT COUNT(*) FROM shopping_list").fetchone()[0]
    if count == 0:
        list_id = str(uuid.uuid4())[:25].replace("-", "")
        now = now_iso()
        conn.execute(
            "INSERT INTO shopping_list (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)",
            (list_id, "Weekly Groceries", now, now)
        )
        items = [
            ("Milk", 2, "Dairy"),
            ("Bread", 1, "Bakery"),
            ("Bananas", 6, "Produce"),
            ("Chicken Breast", 1, "Meat"),
            ("Rice", 1, "Pantry"),
            ("Dish Soap", 1, "Cleaning"),
        ]
        for name, qty, cat in items:
            iid = str(uuid.uuid4())[:25].replace("-", "")
            conn.execute(
                "INSERT INTO item (id, name, quantity, category, shopping_list_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (iid, name, qty, cat, list_id, now, now)
            )
        conn.commit()
        print(f"Seeded: Weekly Groceries ({list_id})")
    conn.close()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    init_db()
    seed_db()
    print("Starting server at http://localhost:3000")
    app.run(host="0.0.0.0", port=3000, debug=True)
