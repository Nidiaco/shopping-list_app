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

export default function Home() {
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    db = getDatabase(app);

    // Load dark mode preference
    const isDark = localStorage.getItem('darkMode') === 'true';
    setDarkMode(isDark);
    if (isDark) document.documentElement.classList.add('dark');

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

  const toggleDarkMode = () => {
    const newDark = !darkMode;
    setDarkMode(newDark);
    localStorage.setItem('darkMode', newDark);
    if (newDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const addItem = async (e) => {
    e.preventDefault();
    if (!newItem.trim()) return;

    const itemsRef = ref(db, 'shopping-list/items');
    await push(itemsRef, {
      name: newItem,
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
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Shared household list</p>
          </div>
          <button
            onClick={toggleDarkMode}
            className="p-3 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition text-xl"
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Add Item Form */}
        <form onSubmit={addItem} className="mb-8">
          <div className="flex gap-2">
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
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-4 p-4 rounded-lg border transition ${
                  item.checked
                    ? 'bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700'
                    : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-green-300 dark:hover:border-green-700'
                }`}
              >
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => toggleItem(item.id, item.checked)}
                  className="w-6 h-6 rounded cursor-pointer accent-green-600"
                />
                <span
                  className={`flex-1 text-lg font-medium ${
                    item.checked
                      ? 'line-through text-gray-400 dark:text-gray-500'
                      : 'text-gray-900 dark:text-white'
                  }`}
                >
                  {item.name}
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
        )}
      </main>
    </div>
  );
}
