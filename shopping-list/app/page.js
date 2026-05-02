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
  produce: 'bg-green-100 text-green-800',
  meat: 'bg-red-100 text-red-800',
  dairy: 'bg-blue-100 text-blue-800',
  bakery: 'bg-amber-100 text-amber-800',
  frozen: 'bg-cyan-100 text-cyan-800',
  pantry: 'bg-orange-100 text-orange-800',
  beverages: 'bg-purple-100 text-purple-800',
  snacks: 'bg-pink-100 text-pink-800',
  household: 'bg-teal-100 text-teal-800',
  health: 'bg-rose-100 text-rose-800',
  other: 'bg-gray-100 text-gray-700',
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
  const [activeTab, setActiveTab] = useState('shopping');
  const [recipes, setRecipes] = useState([]);
  const [recipesLoading, setRecipesLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [recipeDetails, setRecipeDetails] = useState(null);
  const [confirmRecipe, setConfirmRecipe] = useState(null);
  const [activeRecipeFilter, setActiveRecipeFilter] = useState('standard');

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

  const isKetoFriendly = (meal) => {
    const lowCarbKeywords = [
      'flour', 'bread', 'wheat', 'pasta', 'noodle', 'rice', 'potato', 'potatoes',
      'sugar', 'cake', 'cookie', 'pie', 'pancake', 'waffle', 'biscuit', 'dumpling',
      'bun', 'muffin', 'donut', 'croissant', 'bagel', 'toast', 'cereal'
    ];
    const mealName = meal.strMeal.toLowerCase();
    return !lowCarbKeywords.some(keyword => mealName.includes(keyword));
  };

  const fetchRecipesByFilter = async (filter) => {
    setRecipesLoading(true);
    let url = '';

    switch (filter) {
      case 'standard':
        url = 'https://www.themealdb.com/api/json/v1/1/filter.php?c=Breakfast';
        break;
      case 'keto':
        url = 'https://www.themealdb.com/api/json/v1/1/filter.php?c=Beef';
        break;
      case 'vegetarian':
        url = 'https://www.themealdb.com/api/json/v1/1/filter.php?c=Vegetarian';
        break;
      case 'international':
        url = 'https://www.themealdb.com/api/json/v1/1/filter.php?c=Seafood';
        break;
      default:
        url = 'https://www.themealdb.com/api/json/v1/1/filter.php?c=Breakfast';
    }

    try {
      const res = await fetch(url);
      const data = await res.json();
      let meals = data.meals || [];

      if (filter === 'keto') {
        meals = meals.filter(isKetoFriendly);
      }

      setRecipes(meals);
    } catch (err) {
      console.error('Error fetching recipes:', err);
    }
    setRecipesLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'recipes') {
      const lastRefreshKey = `recipes_last_refresh_${activeRecipeFilter}_v2`;
      const lastRefresh = localStorage.getItem(lastRefreshKey);
      const now = Date.now();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

      if (!lastRefresh || (now - parseInt(lastRefresh)) > sevenDaysMs) {
        fetchRecipesByFilter(activeRecipeFilter);
        localStorage.setItem(lastRefreshKey, now.toString());
      } else if (recipes.length === 0) {
        fetchRecipesByFilter(activeRecipeFilter);
      }
    }
  }, [activeTab, activeRecipeFilter]);


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

  const viewRecipe = async (mealId) => {
    try {
      const res = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${mealId}`);
      const data = await res.json();
      setRecipeDetails(data.meals?.[0] || null);
      setSelectedRecipe(mealId);
    } catch (err) {
      console.error('Error fetching recipe details:', err);
    }
  };

  const addIngredientsToCart = async (mealId, mealName) => {
    try {
      const res = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${mealId}`);
      const data = await res.json();
      const meal = data.meals?.[0];

      if (!meal) {
        console.error('Recipe not found');
        return;
      }

      const ingredients = [];
      for (let i = 1; i <= 20; i++) {
        const ingredient = meal[`strIngredient${i}`];
        const measure = meal[`strMeasure${i}`];
        if (ingredient && ingredient.trim()) {
          const fullName = measure && measure.trim()
            ? `${ingredient} ${measure}`.trim()
            : ingredient.trim();
          ingredients.push(fullName);
        }
      }

      for (const ingredient of ingredients) {
        await push(ref(db, 'shopping-list/items'), {
          name: ingredient,
          category: detectCategory(ingredient),
          checked: false,
          createdAt: new Date().toISOString(),
        });
      }

      setConfirmRecipe(null);
    } catch (err) {
      console.error('Error adding ingredients:', err);
    }
  };

  return (
    <div className="min-h-screen bg-white transition-colors pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {activeTab === 'shopping' ? '🛒 Shopping List' : '🍳 Recipes'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {activeTab === 'shopping' ? '255 Mt Pleasant Shopping list' : 'Browse recipes by diet'}
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      {activeTab === 'recipes' ? (
        <main className="max-w-2xl mx-auto px-4 py-8">
          <div className="flex gap-2 mb-6 flex-wrap">
            {[
              { id: 'standard', label: 'Standard Meals' },
              { id: 'keto', label: 'Keto' },
              { id: 'vegetarian', label: 'Vegetarian' },
              { id: 'international', label: 'International' },
            ].map(filter => (
              <button
                key={filter.id}
                onClick={() => setActiveRecipeFilter(filter.id)}
                className={`px-4 py-2 rounded-full font-medium transition ${
                  activeRecipeFilter === filter.id
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {recipesLoading ? (
            <div className="text-center py-16">
              <p className="text-gray-500">Loading recipes...</p>
            </div>
          ) : recipes.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">🍳</div>
              <p className="text-gray-500 text-lg">No recipes found</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                {recipes.slice(0, 12).map(recipe => (
                  <div key={recipe.idMeal} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition flex flex-col">
                    <img src={recipe.strMealThumb} alt={recipe.strMeal} className="w-full h-32 object-cover" />
                    <div className="p-3 flex flex-col flex-1">
                      <h3 className="font-semibold text-sm text-gray-900 line-clamp-2">{recipe.strMeal}</h3>
                      <div className="flex gap-2 mt-auto">
                        <button
                          onClick={() => viewRecipe(recipe.idMeal)}
                          className="flex-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition"
                        >
                          View
                        </button>
                        <button
                          onClick={() => {
                            setSelectedRecipe(recipe.idMeal);
                            setConfirmRecipe(recipe);
                          }}
                          className="flex-1 px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded transition"
                        >
                          Add Ingredients
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {selectedRecipe && recipeDetails && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
                  <div className="w-full bg-white rounded-t-2xl max-h-[90vh] overflow-y-auto">
                    <div className="sticky top-0 bg-white border-b border-gray-200 p-4">
                      <button
                        onClick={() => {
                          setSelectedRecipe(null);
                          setRecipeDetails(null);
                        }}
                        className="mb-3 flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
                      >
                        ← Back to Recipes
                      </button>
                      <h2 className="text-xl font-bold text-gray-900">{recipeDetails.strMeal}</h2>
                    </div>

                    <div className="p-4 space-y-4">
                      <img src={recipeDetails.strMealThumb} alt={recipeDetails.strMeal} className="w-full h-48 object-cover rounded-lg" />

                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">Ingredients</h3>
                        <ul className="space-y-1 text-sm text-gray-700">
                          {(() => {
                            const items = [];
                            for (let i = 1; i <= 20; i++) {
                              const ingredient = recipeDetails[`strIngredient${i}`];
                              const measure = recipeDetails[`strMeasure${i}`];
                              if (ingredient && ingredient.trim()) {
                                items.push(
                                  <li key={i} className="flex items-start gap-2">
                                    <span className="text-green-600 mt-1">✓</span>
                                    <span>{measure && measure.trim() ? `${ingredient} ${measure}` : ingredient}</span>
                                  </li>
                                );
                              }
                            }
                            return items;
                          })()}
                        </ul>
                      </div>

                      {recipeDetails.strInstructions && (
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-2">Instructions</h3>
                          <p className="text-sm text-gray-700 leading-relaxed">{recipeDetails.strInstructions}</p>
                        </div>
                      )}

                      <div className="pb-4"></div>
                    </div>
                  </div>
                </div>
              )}

              {confirmRecipe && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                  <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-lg">
                    <h2 className="text-lg font-bold text-gray-900 mb-2">Add Ingredients?</h2>
                    <p className="text-gray-700 mb-6">Add all ingredients from <strong>{confirmRecipe.strMeal}</strong> to your shopping cart?</p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setConfirmRecipe(null)}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-900 font-medium rounded-lg hover:bg-gray-50 transition"
                      >
                        No
                      </button>
                      <button
                        onClick={() => addIngredientsToCart(confirmRecipe.idMeal, confirmRecipe.strMeal)}
                        className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition"
                      >
                        Yes
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      ) : (
      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Add Item Form */}
        <form onSubmit={addItem} className="mb-8">
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="Add an item..."
              className="flex-1 px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
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
            <p className="text-gray-500">Loading...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-gray-500 text-lg">No items yet. Add one to get started! 👆</p>
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
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
                      <span className="text-xl">{cat.emoji}</span>
                      <h2 className="text-lg font-semibold text-gray-900">{cat.label}</h2>
                      <span className="ml-auto text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                        {groupedItems[category].length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {groupedItems[category].map(item => (
                        <div
                          key={item.id}
                          className="flex items-center gap-4 p-4 rounded-lg border border-l-4 bg-white border-gray-200 transition-all duration-300 hover:shadow-sm"
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
                          <span className="flex-1 text-lg font-medium text-gray-900">
                            {item.name}
                          </span>
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${CATEGORY_COLORS[item.category || 'other']}`}>
                            {CATEGORIES[item.category || 'other'].emoji}
                          </span>
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="p-2 text-gray-400 hover:text-red-600 transition text-lg"
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
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
                    <span className="text-xl">✅</span>
                    <h2 className="text-lg font-semibold text-gray-900">In Cart</h2>
                    <span className="ml-auto text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-800">
                      {checkedItems.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {checkedItems.map(item => (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 p-4 rounded-lg border border-l-4 bg-green-50 border-green-200 border-l-green-500 transition-all duration-300"
                      >
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={() => toggleItem(item.id, item.checked)}
                          className="w-6 h-6 rounded cursor-pointer accent-green-600"
                        />
                        <span className="flex-1 text-lg font-medium line-through text-gray-400">
                          {item.name}
                        </span>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${CATEGORY_COLORS[item.category || 'other']}`}>
                          {CATEGORIES[item.category || 'other'].emoji}
                        </span>
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="p-2 text-gray-400 hover:text-red-600 transition text-lg"
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
      )}

      {/* Bottom Tab Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="max-w-2xl mx-auto flex">
          <button
            onClick={() => setActiveTab('shopping')}
            className={`flex-1 flex flex-col items-center gap-1 py-3 transition ${
              activeTab === 'shopping' ? 'text-green-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="text-2xl">🛒</span>
            <span className="text-xs font-medium">Shopping</span>
          </button>
          <button
            onClick={() => setActiveTab('recipes')}
            className={`flex-1 flex flex-col items-center gap-1 py-3 transition ${
              activeTab === 'recipes' ? 'text-green-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="text-2xl">🍳</span>
            <span className="text-xs font-medium">Recipes</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
