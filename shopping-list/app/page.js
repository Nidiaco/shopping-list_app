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

const ITEM_EMOJIS = {
  // Produce - Fruits
  apple: '🍎', banana: '🍌', orange: '🍊', lemon: '🍋', lime: '🍋', grape: '🍇',
  strawberry: '🍓', blueberry: '🫐', berry: '🫐', raspberry: '🫐', blackberry: '🫐',
  watermelon: '🍉', melon: '🍈', peach: '🍑', pear: '🍐', cherry: '🍒', mango: '🥭',
  pineapple: '🍍', coconut: '🥥', kiwi: '🥝', avocado: '🥑', fig: '🫒', olive: '🫒',
  plum: '🫐', apricot: '🍑', nectarine: '🍑', grapefruit: '🍊', tangerine: '🍊',
  mandarin: '🍊', clementine: '🍊', pomegranate: '🫐', passionfruit: '🫐',
  dragonfruit: '🫐', lychee: '🫐', papaya: '🥭', guava: '🥭', fruit: '🍎',

  // Produce - Vegetables
  carrot: '🥕', broccoli: '🥦', corn: '🌽', pepper: '🫑', capsicum: '🫑',
  chili: '🌶️', chilli: '🌶️', jalapeno: '🌶️', hot_pepper: '🌶️',
  tomato: '🍅', potato: '🥔', kumara: '🍠', sweet_potato: '🍠',
  onion: '🧅', garlic: '🧄', cucumber: '🥒', courgette: '🥒', zucchini: '🥒',
  gherkin: '🥒', pickle: '🥒', eggplant: '🍆', aubergine: '🍆',
  lettuce: '🥬', spinach: '🥬', kale: '🥬', cabbage: '🥬', bok_choy: '🥬',
  salad: '🥗', mushroom: '🍄', celery: '🥬', asparagus: '🥦', artichoke: '🥬',
  pea: '🫛', bean: '🫘', green_bean: '🫘', lentil: '🫘', chickpea: '🫘',
  beetroot: '🫒', beet: '🫒', radish: '🫒', turnip: '🫒', parsnip: '🥕',
  pumpkin: '🎃', squash: '🎃', butternut: '🎃', leek: '🧅', spring_onion: '🧅',
  shallot: '🧅', ginger: '🫚', herbs: '🌿', basil: '🌿', parsley: '🌿',
  coriander: '🌿', cilantro: '🌿', mint: '🌿', rosemary: '🌿', thyme: '🌿',
  dill: '🌿', oregano: '🌿', sage: '🌿', chive: '🌿', vegetable: '🥬',
  sprout: '🌱', fennel: '🌿', rocket: '🥬', arugula: '🥬', watercress: '🥬',

  // Meat & Protein
  chicken: '🍗', beef: '🥩', steak: '🥩', lamb: '🍖', pork: '🥓',
  bacon: '🥓', ham: '🍖', sausage: '🌭', turkey: '🦃', duck: '🦆',
  mince: '🥩', ground: '🥩', fillet: '🥩', chop: '🍖', rib: '🍖',
  wing: '🍗', breast: '🍗', thigh: '🍗', drumstick: '🍗', roast: '🍖',
  salami: '🥩', prosciutto: '🥩', pepperoni: '🥩', chorizo: '🌭',
  hot_dog: '🌭', meat: '🥩', venison: '🥩', veal: '🥩', brisket: '🥩',
  jerky: '🥩', pastrami: '🥩',

  // Seafood
  salmon: '🐟', tuna: '🐟', fish: '🐟', shrimp: '🦐', prawn: '🦐',
  crab: '🦀', lobster: '🦞', mussel: '🦪', oyster: '🦪', clam: '🦪',
  squid: '🦑', calamari: '🦑', octopus: '🐙', sardine: '🐟', anchovy: '🐟',
  cod: '🐟', snapper: '🐟', hoki: '🐟', tarakihi: '🐟', seafood: '🦐',

  // Dairy & Eggs
  milk: '🥛', cheese: '🧀', butter: '🧈', egg: '🥚', eggs: '🥚',
  yogurt: '🫙', yoghurt: '🫙', cream: '🥛', ice_cream: '🍦',
  sour_cream: '🥛', cream_cheese: '🧀', cheddar: '🧀', mozzarella: '🧀',
  parmesan: '🧀', brie: '🧀', feta: '🧀', ricotta: '🧀', gouda: '🧀',
  camembert: '🧀', halloumi: '🧀', mascarpone: '🧀', cottage_cheese: '🧀',

  // Bakery
  bread: '🍞', toast: '🍞', bagel: '🥯', croissant: '🥐', baguette: '🥖',
  roll: '🥖', bun: '🍔', muffin: '🧁', cupcake: '🧁', cake: '🎂',
  pie: '🥧', donut: '🍩', doughnut: '🍩', pancake: '🥞', waffle: '🧇',
  pretzel: '🥨', cookie: '🍪', biscuit: '🍪', tortilla: '🫓', wrap: '🫓',
  naan: '🫓', pita: '🫓', flatbread: '🫓', loaf: '🍞', crumpet: '🧇',
  scone: '🍪', pastry: '🥐', danish: '🥐',

  // Pantry
  rice: '🍚', pasta: '🍝', noodle: '🍜', spaghetti: '🍝', macaroni: '🍝',
  flour: '🌾', sugar: '🍬', salt: '🧂', oil: '🫒', olive_oil: '🫒',
  vinegar: '🫒', sauce: '🫙', ketchup: '🫙', mustard: '🫙', mayonnaise: '🫙',
  soy_sauce: '🫙', honey: '🍯', jam: '🫙', peanut_butter: '🥜',
  nutella: '🫙', syrup: '🍯', soup: '🍲', stock: '🍲', broth: '🍲',
  cereal: '🥣', oat: '🥣', oats: '🥣', granola: '🥣', muesli: '🥣',
  canned: '🥫', tin: '🥫', can: '🥫', tomato_paste: '🥫',
  coconut_milk: '🥥', coconut_cream: '🥥', curry_paste: '🫙',
  spice: '🫙', cumin: '🫙', paprika: '🫙', turmeric: '🫙', cinnamon: '🫙',
  pepper_ground: '🫙', chili_powder: '🫙', curry_powder: '🫙',
  baking_powder: '🫙', baking_soda: '🫙', yeast: '🫙', vanilla: '🫙',
  cocoa: '🫙', cornstarch: '🫙', breadcrumb: '🍞',

  // Beverages
  water: '💧', juice: '🧃', coffee: '☕', tea: '🍵', beer: '🍺',
  wine: '🍷', champagne: '🥂', cocktail: '🍸', whiskey: '🥃', whisky: '🥃',
  vodka: '🍸', rum: '🍹', gin: '🍸', soda: '🥤', cola: '🥤',
  lemonade: '🍋', smoothie: '🥤', milkshake: '🥛', energy_drink: '🥤',
  sparkling: '💧', mineral_water: '💧', kombucha: '🍵', cider: '🍺',
  cordial: '🧃', soft_drink: '🥤', drink: '🥤',

  // Snacks
  chip: '🍟', chips: '🍟', fries: '🍟', popcorn: '🍿', pretzel_snack: '🥨',
  chocolate: '🍫', candy: '🍬', lollipop: '🍭', gummy: '🍬',
  nut: '🥜', peanut: '🥜', almond: '🥜', cashew: '🥜', walnut: '🥜',
  pistachio: '🥜', macadamia: '🥜', hazelnut: '🥜', pecan: '🥜',
  cracker: '🍘', rice_cake: '🍘', trail_mix: '🥜', dried_fruit: '🍇',
  bar: '🍫', protein_bar: '🍫', muesli_bar: '🍫', granola_bar: '🍫',

  // Frozen
  frozen: '🧊', ice: '🧊', popsicle: '🍦', gelato: '🍦',
  frozen_pizza: '🍕', pizza: '🍕', frozen_veg: '🥦',

  // Household
  soap: '🧼', detergent: '🧴', shampoo: '🧴', conditioner: '🧴',
  toothpaste: '🪥', toothbrush: '🪥', tissue: '🧻', toilet_paper: '🧻',
  paper_towel: '🧻', sponge: '🧽', cleaner: '🧹', bleach: '🧴',
  dishwasher: '🫧', laundry: '🧺', bin_bag: '🗑️', trash_bag: '🗑️',
  foil: '🫕', cling_wrap: '🫕', baking_paper: '🫕', candle: '🕯️',
  battery: '🔋', light_bulb: '💡', bag: '🛍️',

  // Health & Personal
  medicine: '💊', vitamin: '💊', bandage: '🩹', sunscreen: '🧴',
  lotion: '🧴', deodorant: '🧴', razor: '🪒', cotton: '🧻',
  mask: '😷', sanitizer: '🧴', thermometer: '🌡️',

  // Baby
  diaper: '🧒', nappy: '🧒', formula: '🍼', baby_food: '🍼', baby: '👶',
  wipes: '🧻',

  // Pet
  dog_food: '🐕', cat_food: '🐈', pet_food: '🐾', pet: '🐾',
  dog: '🐕', cat: '🐈', treats: '🐾',

  // Prepared/Deli
  sandwich: '🥪', burger: '🍔', taco: '🌮', burrito: '🌯', kebab: '🥙',
  sushi: '🍣', dumpling: '🥟', spring_roll: '🥟', dim_sum: '🥟',
  hummus: '🫘', dip: '🫕', pesto: '🌿', tofu: '🧈', tempeh: '🧈',
};

const CATEGORIES = {
  produce: {
    label: 'Produce',
    emoji: '🥦',
    keywords: ['apple', 'banana', 'orange', 'lettuce', 'spinach', 'broccoli', 'carrot', 'onion', 'garlic', 'potato', 'tomato', 'cucumber', 'pepper', 'capsicum', 'mushroom', 'avocado', 'berry', 'grape', 'mango', 'lemon', 'lime', 'celery', 'zucchini', 'courgette', 'corn', 'pea', 'cabbage', 'kale', 'salad', 'radish', 'beet', 'beetroot', 'pumpkin', 'squash', 'kumara', 'sweet potato', 'asparagus', 'eggplant', 'aubergine', 'leek', 'ginger', 'herb', 'basil', 'parsley', 'coriander', 'cilantro', 'mint', 'rosemary', 'thyme', 'dill', 'oregano', 'chive', 'rocket', 'arugula', 'watercress', 'bok choy', 'fennel', 'artichoke', 'turnip', 'parsnip', 'shallot', 'spring onion', 'sprout', 'strawberry', 'blueberry', 'raspberry', 'watermelon', 'melon', 'peach', 'pear', 'cherry', 'pineapple', 'coconut', 'kiwi', 'plum', 'apricot', 'nectarine', 'grapefruit', 'tangerine', 'mandarin', 'fig', 'olive', 'pomegranate', 'passionfruit', 'dragonfruit', 'lychee', 'papaya', 'guava', 'fruit', 'vegetable'],
  },
  meat: {
    label: 'Meat',
    emoji: '🥩',
    keywords: ['chicken', 'beef', 'pork', 'lamb', 'turkey', 'salmon', 'tuna', 'shrimp', 'prawn', 'fish', 'sausage', 'bacon', 'ham', 'steak', 'mince', 'fillet', 'breast', 'chop', 'duck', 'venison', 'veal', 'drumstick', 'wing', 'thigh', 'rib', 'roast', 'salami', 'prosciutto', 'pepperoni', 'chorizo', 'hot dog', 'brisket', 'jerky', 'crab', 'lobster', 'mussel', 'oyster', 'clam', 'squid', 'calamari', 'octopus', 'sardine', 'anchovy', 'cod', 'snapper', 'hoki', 'seafood', 'meat'],
  },
  dairy: {
    label: 'Dairy',
    emoji: '🥛',
    keywords: ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'egg', 'yoghurt', 'sour cream', 'cream cheese', 'cheddar', 'mozzarella', 'parmesan', 'brie', 'feta', 'ricotta', 'gouda', 'camembert', 'halloumi', 'mascarpone', 'cottage cheese'],
  },
  bakery: {
    label: 'Bakery',
    emoji: '🍞',
    keywords: ['bread', 'bagel', 'bun', 'roll', 'muffin', 'croissant', 'tortilla', 'wrap', 'loaf', 'baguette', 'naan', 'pita', 'flatbread', 'crumpet', 'scone', 'pastry', 'danish', 'cake', 'pie', 'donut', 'doughnut', 'pancake', 'waffle', 'pretzel', 'cookie', 'biscuit', 'cupcake'],
  },
  frozen: {
    label: 'Frozen',
    emoji: '🧊',
    keywords: ['frozen', 'ice cream', 'ice', 'popsicle'],
  },
  pantry: {
    label: 'Pantry',
    emoji: '🥫',
    keywords: ['rice', 'pasta', 'flour', 'sugar', 'salt', 'oil', 'sauce', 'soup', 'can', 'cereal', 'oat', 'oats', 'honey', 'jam', 'vinegar', 'stock', 'noodle', 'lentil', 'bean', 'chickpea', 'spice', 'spaghetti', 'macaroni', 'ketchup', 'mustard', 'mayonnaise', 'soy sauce', 'peanut butter', 'nutella', 'syrup', 'broth', 'granola', 'muesli', 'canned', 'tin', 'tomato paste', 'coconut milk', 'coconut cream', 'curry paste', 'cumin', 'paprika', 'turmeric', 'cinnamon', 'curry powder', 'baking powder', 'baking soda', 'yeast', 'vanilla', 'cocoa', 'cornstarch', 'breadcrumb', 'tofu', 'tempeh'],
  },
  beverages: {
    label: 'Beverages',
    emoji: '🥤',
    keywords: ['water', 'juice', 'coffee', 'tea', 'soda', 'beer', 'wine', 'soft drink', 'cola', 'sparkling', 'cider', 'champagne', 'whiskey', 'whisky', 'vodka', 'rum', 'gin', 'lemonade', 'smoothie', 'milkshake', 'energy drink', 'kombucha', 'cordial', 'drink'],
  },
  snacks: {
    label: 'Snacks',
    emoji: '🍫',
    keywords: ['chip', 'chips', 'cracker', 'popcorn', 'chocolate', 'candy', 'nut', 'almond', 'cashew', 'walnut', 'pistachio', 'macadamia', 'hazelnut', 'pecan', 'peanut', 'trail mix', 'dried fruit', 'gummy', 'lollipop', 'rice cake', 'protein bar', 'muesli bar', 'granola bar'],
  },
  household: {
    label: 'Household',
    emoji: '🧹',
    keywords: ['soap', 'detergent', 'bleach', 'cleaner', 'wipe', 'sponge', 'bag', 'foil', 'tissue', 'toilet', 'paper towel', 'bin', 'trash', 'dishwasher', 'laundry', 'cling wrap', 'baking paper', 'candle', 'battery', 'light bulb', 'bin bag'],
  },
  health: {
    label: 'Health',
    emoji: '💊',
    keywords: ['shampoo', 'conditioner', 'toothpaste', 'toothbrush', 'lotion', 'sunscreen', 'medicine', 'vitamin', 'bandage', 'razor', 'deodorant', 'cotton', 'mask', 'sanitizer', 'thermometer'],
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

function detectItemEmoji(text) {
  const lower = text.toLowerCase();
  // Try multi-word matches first (e.g. 'sweet potato', 'spring onion')
  const words = lower.split(/\s+/);
  for (let len = Math.min(words.length, 3); len >= 1; len--) {
    for (let i = 0; i <= words.length - len; i++) {
      const phrase = words.slice(i, i + len).join('_');
      if (ITEM_EMOJIS[phrase]) return ITEM_EMOJIS[phrase];
    }
  }
  // Try substring match against each key
  for (const [key, emoji] of Object.entries(ITEM_EMOJIS)) {
    const keyNorm = key.replace(/_/g, ' ');
    if (lower.includes(keyNorm)) return emoji;
  }
  // Fallback to category emoji
  const cat = detectCategory(text);
  return CATEGORIES[cat].emoji;
}

export default function Home() {
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [shoppingListSearch, setShoppingListSearch] = useState('');

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

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

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
    showToast(`✓ Added "${newItem.trim()}" to your list`);
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
    <div className="min-h-screen bg-gray-50 transition-colors">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 left-4 right-4 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg animate-pulse z-40">
          {toast}
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-5 flex items-center gap-3">
          <span className="text-3xl">🛒</span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Shopping List</h1>
            <p className="text-xs text-gray-400 mt-0.5">255 Mt Pleasant</p>
          </div>
          {items.length > 0 && (
            <span className="ml-auto text-xs font-bold px-3 py-1 rounded-full bg-green-100 text-green-700">
              {items.filter(i => !i.checked).length} to get
            </span>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Add Item Form */}
        <form onSubmit={addItem} className="mb-8">
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="Add an item..."
              className="flex-1 px-4 py-3 rounded-lg border-2 border-gray-200 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition active:scale-95 shadow-md hover:shadow-lg"
            >
              Add
            </button>
          </div>
          {newItem.trim() && (
            <div className={`px-3 py-1 rounded-full text-sm font-medium w-fit ${CATEGORY_COLORS[detectCategory(newItem)]} shadow-sm`}>
              {detectItemEmoji(newItem)} {CATEGORIES[detectCategory(newItem)].label}
            </div>
          )}
        </form>

        {/* Pak'n'Save Moorhouse */}
        <a
          href="https://www.paknsave.co.nz/shop"
          target="_blank"
          rel="noopener noreferrer"
          className="mb-6 flex items-center justify-center gap-2 w-full px-4 py-3 bg-yellow-400 hover:bg-yellow-500 text-black font-bold rounded-lg transition active:scale-95 shadow-sm"
        >
          📅 Pick a Timeslot PAK'nSAVE Moorhouse
        </a>

        {/* Search & Controls */}
        {items.length > 0 && (
          <div className="mb-6 flex gap-2">
            <input
              type="text"
              value={shoppingListSearch}
              onChange={(e) => setShoppingListSearch(e.target.value)}
              placeholder="Search items..."
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
            {items.some(i => i.checked) && (
              <button
                onClick={async () => {
                  const checkedIds = items.filter(i => i.checked).map(i => i.id);
                  for (const id of checkedIds) {
                    await remove(ref(db, `shopping-list/items/${id}`));
                  }
                  showToast('✓ Cleared completed items');
                }}
                className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-medium rounded-lg transition"
              >
                Clear Done
              </button>
            )}
          </div>
        )}

        {/* Items List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded-lg animate-pulse"></div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-gray-700 text-lg font-medium mb-2">Your shopping list is empty</p>
            <p className="text-gray-500 mb-4">Add items above to get started</p>
          </div>
        ) : (() => {
          const searchLower = shoppingListSearch.toLowerCase();
          const filteredItems = items.filter(i => i.name.toLowerCase().includes(searchLower));
          const uncheckedItems = filteredItems.filter(i => !i.checked);
          const checkedItems = filteredItems.filter(i => i.checked);

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
                    <div className="flex items-center gap-2 mb-3 pb-3 border-b-2 border-gray-200">
                      <span className="text-2xl">{cat.emoji}</span>
                      <h2 className="text-lg font-bold text-gray-900">{cat.label}</h2>
                      <span className="ml-auto text-xs font-bold px-3 py-1 rounded-full bg-gray-100 text-gray-700 shadow-sm">
                        {groupedItems[category].length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {groupedItems[category].map(item => (
                        <div
                          key={item.id}
                          className="flex items-center gap-4 p-4 rounded-xl border border-l-4 bg-white border-gray-200 shadow-sm transition-all duration-300 hover:shadow-md hover:border-gray-300 group"
                          style={{
                            borderLeftColor: CATEGORIES[item.category || 'other'].keywords ? '#10b981' : '#6b7280',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={item.checked}
                            onChange={() => toggleItem(item.id, item.checked)}
                            className="w-6 h-6 rounded cursor-pointer accent-green-600 transition"
                          />
                          <span className="flex-1 text-lg font-medium text-gray-900 group-hover:text-gray-700">
                            {item.name}
                          </span>
                          <span className={`text-xs font-bold px-3 py-1 rounded-full ${CATEGORY_COLORS[item.category || 'other']} shadow-sm`}>
                            {detectItemEmoji(item.name)}
                          </span>
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition duration-200 text-lg"
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
                  <div className="flex items-center gap-2 mb-3 pb-3 border-b-2 border-green-200">
                    <span className="text-2xl">✅</span>
                    <h2 className="text-lg font-bold text-gray-900">In Cart</h2>
                    <span className="ml-auto text-xs font-bold px-3 py-1 rounded-full bg-green-100 text-green-800 shadow-sm">
                      {checkedItems.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {checkedItems.map(item => (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 p-4 rounded-xl border border-l-4 bg-green-50 border-green-200 border-l-green-500 shadow-sm transition-all duration-300 hover:shadow-md group"
                      >
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={() => toggleItem(item.id, item.checked)}
                          className="w-6 h-6 rounded cursor-pointer accent-green-600 transition"
                        />
                        <span className="flex-1 text-lg font-medium line-through text-gray-400 group-hover:text-gray-500">
                          {item.name}
                        </span>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${CATEGORY_COLORS[item.category || 'other']} shadow-sm opacity-75`}>
                          {detectItemEmoji(item.name)}
                        </span>
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition duration-200 text-lg"
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
