'use client';

import { useEffect, useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, push, update, remove } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyCw6790vLiq7CEbzKFjaMN_pg1V84VdHd4",
  authDomain: "shopping-list-app-d1661.firebaseapp.com",
  databaseURL: "https://shopping-list-app-d1661-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "shopping-list-app-d1661",
  storageBucket: "shopping-list-app-d1661.firebasestorage.app",
  messagingSenderId: "272746002002",
  appId: "1:272746002002:web:dd7a1e3fa65628f59d118b",
};

let db = null;

const CATEGORIES = {
  produce: {
    label: 'Produce',
    emoji: '🥦',
    keywords: ['apple', 'banana', 'orange', 'lettuce', 'spinach', 'broccoli', 'carrot', 'onion', 'garlic', 'potato', 'tomato', 'cucumber', 'pepper', 'mushroom', 'avocado', 'berry', 'grape', 'mango', 'lemon', 'lime', 'celery', 'zucchini', 'corn', 'pea', 'cabbage', 'kale', 'salad', 'radish', 'beet'],
  },
  meat: {
    label: 'Meat',
    emoji: '🥩',
    keywords: ['chicken', 'beef', 'pork', 'lamb', 'turkey', 'salmon', 'tuna', 'shrimp', 'fish', 'sausage', 'bacon', 'ham', 'steak', 'mince', 'fillet', 'breast', 'chop'],
  },
  dairy: {
    label: 'Dairy',
    emoji: '🥛',
    keywords: ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'egg', 'yoghurt', 'sour cream', 'cream cheese'],
  },
  bakery: {
    label: 'Bakery',
    emoji: '🍞',
    keywords: ['bread', 'bagel', 'bun', 'roll', 'muffin', 'croissant', 'tortilla', 'wrap', 'loaf'],
  },
  frozen: {
    label: 'Frozen',
    emoji: '🧊',
    keywords: ['frozen', 'ice cream', 'ice', 'popsicle'],
  },
  pantry: {
    label: 'Pantry',
    emoji: '🥫',
    keywords: ['rice', 'pasta', 'flour', 'sugar', 'salt', 'pepper', 'oil', 'sauce', 'soup', 'can', 'cereal', 'oat', 'honey', 'jam', 'vinegar', 'stock', 'noodle', 'lentil', 'bean', 'chickpea', 'spice'],
  },
  beverages: {
    label: 'Beverages',
    emoji: '🥤',
    keywords: ['water', 'juice', 'coffee', 'tea', 'soda', 'beer', 'wine', 'soft drink', 'cola', 'sparkling', 'cider'],
  },
  snacks: {
    label: 'Snacks',
    emoji: '🍫',
    keywords: ['chip', 'cracker', 'popcorn', 'pretzel', 'chocolate', 'candy', 'biscuit', 'nut', 'almond', 'cashew', 'granola', 'bar'],
  },
  household: {
    label: 'Household',
    emoji: '🧹',
    keywords: ['soap', 'detergent', 'bleach', 'cleaner', 'wipe', 'sponge', 'bag', 'wrap', 'foil', 'tissue', 'toilet', 'paper towel', 'bin', 'trash'],
  },
  health: {
    label: 'Health',
    emoji: '💊',
    keywords: ['shampoo', 'conditioner', 'toothpaste', 'toothbrush', 'lotion', 'sunscreen', 'medicine', 'vitamin', 'bandage', 'razor', 'deodorant'],
  },
  other: {
    label: 'Other',
    emoji: '🛒',
    keywords: [],
  },
};

const CATEGORY_COLORS = {
  produce: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  meat: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  dairy: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  bakery: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  frozen: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  pantry: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  beverages: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  snacks: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
  household: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  health: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
  other: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

const CATEGORY_ORDER = ['produce', 'meat', 'dairy', 'bakery', 'frozen', 'pantry', 'beverages', 'snacks', 'household', 'health', 'other'];

function detectCategory(text) {
  const lower = text.toLowerCase();
  for (const [key, cat] of Object.entries(CATEGORIES)) {
    if (key === 'other') continue;
    if (cat.keywords.some(kw => lower.includes(kw))) return key;
  }
  return 'other';
}

export default function Home() {
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    db = getDatabase(app);

    // Subscribe to items
    const itemsRef = ref(db, 'shopping-list/items');
    const unsubscribe = onValue(itemsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const itemList = Object.entries(data).map(([id, item]) => ({
          id,
          ...item,
        }));
        setItems(itemList.reverse());
      } else {
        setItems([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);


  const addItem = async (e) => {
    e.preventDefault();
    if (!newItem.trim()) return;

    const itemsRef = ref(db, 'shopping-list/items');
    await push(itemsRef, {
      name: newItem,
      category: detectCategory(newItem),
      checked: false,
      createdAt: new Date().toISOString(),
    });
    setNewItem('');
  };

  const toggleItem = async (id, checked) => {
    const itemRef = ref(db, `shopping-list/items/${id}`);
    await update(itemRef, { checked: !checked });
  };

  const deleteItem = async (id) => {
    const itemRef = ref(db, `shopping-list/items/${id}`);
    await remove(itemRef);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">🛒 Shopping List</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">255 Mt Pleasant Shopping list</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Add Item Form */}
        <form onSubmit={addItem} className="mb-8">
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="Add an item..."
              className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition active:scale-95"
            >
              Add
            </button>
          </div>
          {newItem.trim() && (
            <div className={`px-3 py-1 rounded-full text-sm font-medium w-fit ${CATEGORY_COLORS[detectCategory(newItem)]} animate-pulse`}>
              {CATEGORIES[detectCategory(newItem)].emoji} {CATEGORIES[detectCategory(newItem)].label}
            </div>
          )}
        </form>

        {/* Items List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Loading...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-gray-500 dark:text-gray-400 text-lg">No items yet. Add one to get started! 👆</p>
          </div>
        ) : (() => {
          const uncheckedItems = items.filter(i => !i.checked);
          const checkedItems = items.filter(i => i.checked);

          const groupedItems = {};
          CATEGORY_ORDER.forEach(cat => {
            groupedItems[cat] = uncheckedItems.filter(i => (i.category || 'other') === cat);
          });

          return (
            <div className="space-y-6">
              {CATEGORY_ORDER.map(category => {
                if (groupedItems[category].length === 0) return null;
                const cat = CATEGORIES[category];
                return (
                  <div key={category}>
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200 dark:border-slate-700">
                      <span className="text-xl">{cat.emoji}</span>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{cat.label}</h2>
                      <span className="ml-auto text-xs font-medium px-2 py-1 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300">
                        {groupedItems[category].length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {groupedItems[category].map(item => (
                        <div
                          key={item.id}
                          className="flex items-center gap-4 p-4 rounded-lg border border-l-4 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 transition-all duration-300 hover:shadow-sm"
                          style={{
                            borderLeftColor: CATEGORIES[item.category || 'other'].keywords ? '#10b981' : '#6b7280',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={item.checked}
                            onChange={() => toggleItem(item.id, item.checked)}
                            className="w-6 h-6 rounded cursor-pointer accent-green-600"
                          />
                          <span className="flex-1 text-lg font-medium text-gray-900 dark:text-white">
                            {item.name}
                          </span>
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${CATEGORY_COLORS[item.category || 'other']}`}>
                            {CATEGORIES[item.category || 'other'].emoji}
                          </span>
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition text-lg"
                          >
                            🗑️
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {checkedItems.length > 0 && (
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 mb-3 pb-2">
                    <span className="text-xl">✅</span>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">In Cart</h2>
                    <span className="ml-auto text-xs font-medium px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                      {checkedItems.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {checkedItems.map(item => (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 p-4 rounded-lg border border-l-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/50 border-l-green-500 transition-all duration-300"
                      >
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={() => toggleItem(item.id, item.checked)}
                          className="w-6 h-6 rounded cursor-pointer accent-green-600"
                        />
                        <span className="flex-1 text-lg font-medium line-through text-gray-400 dark:text-gray-500">
                          {item.name}
                        </span>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${CATEGORY_COLORS[item.category || 'other']}`}>
                          {CATEGORIES[item.category || 'other'].emoji}
                        </span>
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition text-lg"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </main>
    </div>
  );
}
