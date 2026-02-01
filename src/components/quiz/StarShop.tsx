import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Star, X, Check, Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SHOP_ITEMS, ShopItem, RARITY_COLORS, RARITY_LABELS, getItemsByCategory } from '@/data/starShopItems';

const PURCHASED_ITEMS_KEY = 'star-shop-purchased';

interface StarShopProps {
  stars: number;
  onPurchase: (cost: number) => void;
}

export const StarShop = ({ stars, onPurchase }: StarShopProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [purchasedItems, setPurchasedItems] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<ShopItem['category'] | 'all'>('all');
  const [justPurchased, setJustPurchased] = useState<string | null>(null);

  // Load purchased items from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(PURCHASED_ITEMS_KEY);
    if (stored) {
      setPurchasedItems(new Set(JSON.parse(stored)));
    }
  }, []);

  // Save purchased items to localStorage
  const savePurchasedItems = (items: Set<string>) => {
    localStorage.setItem(PURCHASED_ITEMS_KEY, JSON.stringify([...items]));
  };

  const handlePurchase = (item: ShopItem) => {
    if (stars < item.price || purchasedItems.has(item.id)) return;

    // Deduct stars
    onPurchase(item.price);

    // Add to purchased items
    const newPurchased = new Set(purchasedItems);
    newPurchased.add(item.id);
    setPurchasedItems(newPurchased);
    savePurchasedItems(newPurchased);

    // Show purchase animation
    setJustPurchased(item.id);
    setTimeout(() => setJustPurchased(null), 2000);
  };

  const categories: { id: ShopItem['category'] | 'all'; label: string; emoji: string }[] = [
    { id: 'all', label: 'All', emoji: '🛍️' },
    { id: 'avatar', label: 'Avatars', emoji: '🎭' },
    { id: 'badge', label: 'Badges', emoji: '🏅' },
    { id: 'pet', label: 'Pets', emoji: '🐾' },
    { id: 'theme', label: 'Themes', emoji: '🎨' },
    { id: 'title', label: 'Titles', emoji: '📜' },
    { id: 'special', label: 'Special', emoji: '✨' },
  ];

  const filteredItems = selectedCategory === 'all'
    ? SHOP_ITEMS
    : getItemsByCategory(selectedCategory);

  const purchasedCount = purchasedItems.size;
  const totalItems = SHOP_ITEMS.length;

  return (
    <>
      {/* Floating Shop Button */}
      <motion.button
        className="fixed bottom-40 right-4 z-30 bg-gradient-to-r from-amber-400 to-orange-500 text-white p-3 rounded-full shadow-lg"
        onClick={() => setIsOpen(true)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <ShoppingBag className="w-6 h-6" />
        {purchasedCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
            {purchasedCount}
          </span>
        )}
      </motion.button>

      {/* Shop Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              className="bg-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden"
              initial={{ scale: 0.9, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 50 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-amber-400 to-orange-500 p-6 text-white relative">
                <button
                  onClick={() => setIsOpen(false)}
                  className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3 mb-2">
                  <ShoppingBag className="w-8 h-8" />
                  <div>
                    <h2 className="text-2xl font-bold">Star Shop</h2>
                    <p className="text-white/80 text-sm">Spend your stars on rewards!</p>
                  </div>
                </div>

                {/* Star Balance */}
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
                    <Star className="w-5 h-5 fill-yellow-300 text-yellow-300" />
                    <span className="font-bold text-lg">{stars.toLocaleString()}</span>
                    <span className="text-white/80">stars</span>
                  </div>
                  <div className="text-sm text-white/80">
                    {purchasedCount}/{totalItems} items owned
                  </div>
                </div>
              </div>

              {/* Category Tabs */}
              <div className="flex gap-2 p-4 overflow-x-auto border-b">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                      selectedCategory === cat.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {cat.emoji} {cat.label}
                  </button>
                ))}
              </div>

              {/* Items Grid */}
              <div className="p-4 overflow-y-auto max-h-[50vh]">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {filteredItems.map((item) => {
                    const isPurchased = purchasedItems.has(item.id);
                    const canAfford = stars >= item.price;
                    const isJustPurchased = justPurchased === item.id;

                    return (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                      >
                        <Card
                          className={`p-3 relative overflow-hidden transition-all ${
                            isPurchased
                              ? 'border-success/50 bg-success/5'
                              : canAfford
                              ? 'border-primary/30 hover:border-primary cursor-pointer'
                              : 'opacity-60'
                          }`}
                          onClick={() => !isPurchased && canAfford && handlePurchase(item)}
                        >
                          {/* Rarity Banner */}
                          <div
                            className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${RARITY_COLORS[item.rarity]}`}
                          />

                          {/* Purchased Badge */}
                          {isPurchased && (
                            <div className="absolute top-2 right-2 bg-success text-white p-1 rounded-full">
                              <Check className="w-3 h-3" />
                            </div>
                          )}

                          {/* Can't Afford */}
                          {!isPurchased && !canAfford && (
                            <div className="absolute top-2 right-2 bg-muted text-muted-foreground p-1 rounded-full">
                              <Lock className="w-3 h-3" />
                            </div>
                          )}

                          {/* Just Purchased Animation */}
                          {isJustPurchased && (
                            <motion.div
                              className="absolute inset-0 bg-success/20 flex items-center justify-center"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                            >
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                              >
                                <Sparkles className="w-8 h-8 text-success" />
                              </motion.div>
                            </motion.div>
                          )}

                          {/* Item Content */}
                          <div className="text-center">
                            <div className="text-3xl mb-2">{item.emoji}</div>
                            <h3 className="font-semibold text-sm mb-1">{item.name}</h3>
                            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                              {item.description}
                            </p>
                            <div className="flex items-center justify-center gap-1">
                              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                              <span className={`text-sm font-bold ${isPurchased ? 'text-success' : canAfford ? 'text-amber-600' : 'text-muted-foreground'}`}>
                                {isPurchased ? 'Owned' : item.price.toLocaleString()}
                              </span>
                            </div>
                            <div className={`text-xs mt-1 bg-gradient-to-r ${RARITY_COLORS[item.rarity]} bg-clip-text text-transparent font-medium`}>
                              {RARITY_LABELS[item.rarity]}
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t bg-muted/30">
                <p className="text-xs text-muted-foreground text-center">
                  Keep practicing to earn more stars! Complete levels and chapters to unlock legendary items.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
